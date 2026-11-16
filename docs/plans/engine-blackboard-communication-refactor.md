# 引擎黑板通信架构重构计划

**状态**: 待执行  
**预计工作量**: 3-5 天

## 旧版本问题诊断

1. **引擎持有外部回调**：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`，违反"引擎是黑盒模拟器"的定位。
2. **运行时绑定管理复杂**：`ControlBindingManager` 维护 controllerId → memberId，需要 `bind/unbind` RPC，控制器必须等引擎就绪才能绑定。
3. **通信机制不一致**：连续状态走 SAB，离散事件走推送回调，遥测走定时推送；三条路径的所有权、容量与消费语义各自为零。
4. **输入黑板布局依赖成员列表**：需要运行时计算布局，控制器无法在场景加载前创建，切换控制对象需要改槽位。
5. **拦截点分散**：来源授权在 `GameEngine.processIntent`（查 `controlMode`）和 `Member.submitControlInput`（查 `behaviorMode`）各判一次，后者静默丢弃。
6. **断链**：`GameEngine.ts:887` 调用 `member.submitExternalControlInput`，但 `Member` 上只有 `submitControlInput(event, source)`；`"manual"` 分支无任何调用方。

## 核心原则

### 1. 采集器由消费端定义，一个采集器一个 SAB

缓冲区数量由**消费者需求**决定，不由数据语义或端口数量决定。

- **输入**：控制器写自己的槽位，网络按 tag 读成一次输入快照。所有控制器共用一块输入 SAB，因为它们写入互不相交的槽位。
- **输出**：每个消费者声明自己的选择、周期与容量，对应一个采集器和一个输出 SAB。渲染层读世界状态、属性面板读若干角色的属性、时间轴分析读逐 tag 状态历史，各自一个采集器。

消费端不声明就不创建采集器，也不分配缓冲区。引擎没有义务产出一份「全量世界状态」。

| 采集器 | 写入者 | 读取者 | 容量策略 |
|---|---|---|---|
| 输入 | 各控制器写自己的槽位 | 引擎 | 固定槽位 |
| 连续量采集器 | 引擎在 tag 完成边界采样 | 声明该投影的消费者 | 最新值，可跳过中间提交 |
| 事件采集器 | 引擎在事件发生时追加 | 声明该事件订阅的消费者 | 未读不覆写 |
| 状态历史采集器 | 引擎在 tag 完成时追加 | 时间轴分析 | 运行长度 |

发布号的粒度是**一个采集器一个发布号**。合并成全局发布号会让 10 秒采集与 60Hz 呈现共用节奏，必然有一个被迫降频。同一采集器内的全部字段属同一次发布，读取方按该采集器的发布号重试，一次重试重读该采集器的全部字段。

**逻辑时刻是唯一的顺序轴**。微步表达同一时刻内的先后。事件不携带墙钟时间偏移，其顺序由逻辑时刻、同刻序号与主体身份确定。

控制器在自己的线程上产出的事件带真实发生顺序；进入输入 SAB 时只保留**槽位内的顺序**，不把主线程墙钟带进模拟。

### 1.1 一个消费者要两种数据时，就建两个采集器

位置、HP 当值、buff 当值这些连续量可以被覆盖：消费端任意时刻读取都是完整真相，「没读到」不是一个有意义的丢失。

`hit`、`death`、`skill_input_rejected` 描述的是**状态之间的转移过程**，与终态不是同一份信息：

- 两次 HP 对比只能得到差值，无法还原是两次 20 还是一次 40
- `alive` 从 true 变 false 可以从状态看到，但「谁在什么时刻用什么技能击杀」只存在于转移描述里

所以选择连续量采集器还是事件采集器，只问：**漏掉是否产生可见错误**。会，订阅事件；不会，采连续量。按采样差分重建事件会把时刻算错：第 0 帧发生起步，第 1 帧才看得到位移；第 0 帧发生受击，第 1 帧才看得到血量变化。

一个消费者需要两类数据时，不把两类塞进同一个缓冲区，而是建两个采集器。它们各自有发布号与容量策略，互不影响；低频消费者不会因另一个消费者的高频提交而空转。

| 采集器 | 契约 | 典型消费者 | 容量决定 |
|------|------|--------|---------|
| 连续量 | 最新值，可跳过中间提交 | 渲染层、属性面板 | 固定 |
| 事件 | 未读不覆写，逐条可见 | UI | 固定 |
| 状态历史 | 逐 tag 追加，全量可回溯 | 时间轴分析 | 运行长度 |

三者之外还有一个**不进共享内存**的产品：输入记录（成员行为序列）。它在运行期累积，结束时随产出一次性移交引用。

同一件事可以同时出现在多处，服务不同要求。判别某个输出该放进哪种采集器，只问：**漏掉是否产生可见错误**，**是否需要事后按 tag 回溯**。

### 1.2 事件采集器契约：写端不覆写未读槽位

事件采集器的保证是**写入端行为约束**，不是「必须有人在读」：

> 事件写入的槽位在被标记已读之前不被覆写。

没有消费者时这条平凡成立（无人读则无人标记，写端就是不能覆写），因此与「引擎在没有消费端时也能正常运作」不矛盾。契约上只有两个指针：

- **写指针**：只有写端推进
- **读游标**：只有消费端推进，只写标记，不搬数据、不清内容

写端不变量是 `(writePos - readCursor) < capacity`。内容在被允许覆写前始终完整可读。

容量归属按门槛化模式：消费者未订阅事件时不创建事件采集器；订阅后放不下即显形失败，不静默覆写。

**一个事件采集器一个消费者**。同一消费者需要多个读取端时，由它自己合并后再读；写端只维护一个读游标，不持有消费者名单。

### 2. 采集器的读取边界是 tag 完成

输入侧：网络在 tag 上把输入 SAB 读成一次不可变 `InputSnapshot`。同一 tag 的多个微步共享同一份输入。

输出侧：采集器在 tag 完成边界读取。网络在同一逻辑时刻可能有多个微步，采集器只在全部微步结束后读，因此不会拿到「上游已处理、下游未处理」的中间状态。

采样节奏与网络推进解耦：采集周期按物理时间到期，采样发生在到期后的第一个 tag 完成边界。一次推进跨过多个周期时只采当前状态，不补造中间样本。逻辑时刻是样本的时间戳，实际采样时刻可能略晚于周期点。

参考：Bevy `Input<T>` 资源、Unity DOTS `InputData` singleton、GGPO 帧输入快照。

### 2.1 过线的是语义动作值，不是设备事件

控制器状态到成员动作之间隔着三层转换，每层所需的信息不同：

| 转换 | 需要的信息 | 归属 |
|------|-----------|------|
| 设备事件 → 语义动作（`KeyW` → 前进方向） | 设备、键位绑定表、UI 焦点、相机基准 | 输入层（主线程） |
| 语义动作 → 定帧命令（当前 tag 的输入快照） | tag 边界、逻辑时钟 | 引擎 |
| 定帧命令 → 是否执行（来源授权 + FSM guard） | `behaviorMode`、FSM 状态 | `Member` / FSM |

边界画在第一段与第二段之间。过线的数据必须是**设备无关、已定帧、可重放**的语义动作值：

- **设备无关**：键码解析、修饰键组合、手柄轴映射留在输入层，引擎不知道 `KeyW` 是什么；键位绑定表是输入层配置。
- **已定帧**：要么是槽位里的“当前最新值”（连续量），要么是命令队列里“一次一条”的记录（离散量）。不存在“随时到达的中间状态”。
- **可重放**：过线的值不得依赖当时的相机或设备状态。方向因此必须在输入层按相机基准解算**世界方向**后过线，而不是把按键组合或视点角交给引擎。

两段转换不能合并到任意一侧：第一段需要相机基向量，而相机属于渲染层，引擎不得持有；第二段需要逻辑时钟，而 tag 边界只有网络知道。

**视点角不过线**。本领域的目标锁定是显式命令（`切换目标` + `targetId`），成员朝向由移动方向推出（`Member.ts:567`），没有任何引擎侧消费者需要 `yaw` / `pitch`。

对照：UE5 Enhanced Input 把设备事件按 Input Mapping Context 的 Modifier / Trigger 转成 Input Action 值后才交给游戏代码；Unity Input System 过线的是 InputAction 值加 started / performed / canceled 相位；Bevy 过线的是 `ButtonInput<KeyCode>` 这类设备无关的语义资源；Quake / Source 的 `usercmd_t` 带 `forwardmove/sidemove` + buttons + msec，客户端按客户端帧生成、服务器逐条执行；GGPO 类回滚网码传每帧固定宽度的输入位域。共同点是：边界上没有裸设备事件，过线单位要么是“一帧一条命令”，要么是“当前最新值”。

### 3. 目标架构

因果关系全部由 Reactor 网络承担：端口接线在装配期确定，网络内节点之间的相互影响按依赖顺序推进，不存在环。因此不需要在 tick 内部人为分相，也不需要跨实体阶段缓冲。

```
┌──────────────────── 主线程 ────────────────────┐
│  控制器                          消费者（渲染 / UI / 分析）│
│  写槽位：targetId + 语义动作      各自读取声明的采集器      │
└────────┬─────────────────────────────────┬─────┘
         ↓ 写                              ↑ 读
   [输入 SAB]                    [采集器 SAB] × N
   · 槽位（方向/步态/强度）         · 渲染层：连续世界状态
   · 命令（离散动作）               · 属性面板：指定角色属性
                                    · 时间轴：逐 tag 状态历史
         ↑                              ↑
         │ 读取                          │ 采样 / 追加
┌────────┴──────────────────────────────┴────────┐
│ Worker：GameEngine                              │
│  GameSystem.stepToNext() {                      │
│    推进一个 tag 内全部微步                       │
│    tag 完成 → 各采集器按自己的选择与周期写出      │
│  }                                              │
│                                                 │
│  网络：GameReactor ⋯ 端口 ⋯ GameReactor           │
│  GameReactor 内部：事件总线 → 状态机 / 行为运行时（当前推进 mistreevous BehaviourTree） │
└─────────────────────────────────────────────────┘
```

输入与输出的不对称由写入权决定：所有控制器写不相交的槽位，共用一块输入 SAB；每个消费者写出内容不同、节奏不同，各用一块采集器 SAB。

消费端不声明就不创建采集器。引擎不生成全量世界状态，也不假设输出一定有消费者。

## 关键设计

### 输入 SAB：静态控制器槽位

```typescript
// src/engine/core/input/InputLayout.ts
export const INPUT_LAYOUT = {
  version: 1,
  maxControllers: 8,
  slotSize: 256,
  headerSize: 64,
  totalSize: 8 * 256 + 64,
} as const;

export interface ControllerInputSlot {
  enabled: boolean;
  targetId: string;                        // 控制对象身份，运行时可改
  movement: {
    direction: { x: number; z: number };   // 世界方向，已由输入层按相机基准解算
    pace: "walk" | "run";                 // 步态语义标签
    intensity: number;                     // 0..1，摇杆类设备的幅度
  };
  commandQueue: MemberControlCommand[];
}
```

布局不含成员信息，所以**不需要计算**：控制器可在场景加载前创建，切换控制对象只需重写 `targetId`。运行时新增控制器只要不超过 `maxControllers`。

槽位契约的两条约束：

- **步态与强度分开**。现状把走路 / 奔跑编码为 `0.5` / `1`（`src/platform/render/scene/input/controller.ts`），引擎再用 `intensity >= 0.75` 反推步态（`Member.ts:539`）。`src/game/locomotion.ts` 约定的分工是“输入层输出归一化 intensity，引擎层映射速度，渲染层映射步态”，但 0.5 / 1 是两值而不是连续量，于是同一个字段既承担连续幅度又承担离散档位，引擎只能靠阈值重猜上游已经确定的信息。分开后 `pace` 定速度档、`intensity` 只定幅度，引擎从 `locomotion.walkSpeed / runSpeed` 取值，不再做阈值判断。
- **命令不带墙钟时间**。`IntentMessage` 的 `timestamp: Date.now()` 是墙钟，进不了确定性模拟，也无法在重放时对齐；客户端只提供单调序号用于同刻定序，模拟时刻由引擎在读取时赋予。

### 采集器 SAB：由消费者声明投影

每个采集器由消费者配置创建，持有四项配置：选择哪些字段、采样周期、容量、写满时怎么办。

```typescript
// src/engine/core/output/CollectorConfig.ts
interface CollectorConfig<TSelection> {
  readonly id: string;
  // 从运行时对象图与属性 schema 派生，消费者只声明选择
  readonly selection: TSelection;
  readonly periodMs: number;
  readonly capacity: number;
  readonly onFull: "overwrite" | "fail";
}
```

`selection` 指向已存在的数据来源，不引入第二套 schema：

| 采集器 | 选择表达 | 数据来源 |
|---|---|---|
| 渲染层世界状态 | 全部成员与区域的连续字段 | 网络发布的参数与成员状态 |
| 属性面板 | 角色 ID + 属性路径 | 该角色的 `AttributeContainer` |
| 时间轴分析 | 全部成员的逐 tag 属性快照 | 状态历史记录器 |

字段路径来自游戏目录与属性 schema；实体用稳定 ID 选择。消费者不传任意函数、对象引用或表达式。

缓冲布局在采集器创建时由选择派生并固定，运行中不重分配。选择变化时销毁旧采集器、创建新缓冲并交接新布局描述，不在同一块内存上改布局。

采样在 tag 完成边界读取选中字段并写入。一次推进跨过多个采样期限时只写当前状态，不补造历史样本。

### 事件采集器：按事件订阅筛选

事件采集器订阅目标 Reactor 的事件总线，按事件名与主体筛选，把匹配事件按发生顺序写入自己的缓冲。它不扫描状态来推导事件。

**不合并同类事件**：同一 tag 内同一成员可以发生多次同类事件，按类型合并会丢失事件，违反逐条可见契约。

容量在采集器创建时定死。写端不根据读取进度调整容量，也不持有消费者名单：一个事件采集器一个消费者，写端只读一个共享读游标，按 1.2 节。

### 拦截点分三层，每层只问一个问题

| 层 | 位置 | 唯一职责 | 判定依据 |
|----|------|---------|---------|
| 运行级 | 引擎 | 这次运行是否接受外部输入 | `acceptExternalIntents`、输入窗口（`runOutput.isRecording()`） |
| 授权级 | Member | 该成员现在听哪个来源 | `behaviorMode` vs `source`，**唯一一处** |
| 合法性 | FSM | 该成员此刻能否执行该动作 | guard + `movement-input-enabled` 等标签 |

要点：

- 删除 `GameEngine.processIntent` 里的 `controlMode` 检查（`GameEngine.ts:650`）。控制模式的权威在成员自身：`setBehaviorMode` 会同步 `pause()` / `resume()` 它的 AI 行为树，引擎持有的是副本。
- 拒绝不产生面向控制器的回执事件。判定在授权级失败时，该动作不出现在成员行为序列里，控制器的输出端口就是它自己的记录。
- FSM 状态合法性留在 FSM，继续走 `skill_input_accepted` / `skill_input_rejected` 一类域事件。
- 三层判定的结果只影响"这个动作是否执行"，不作为同步返回值送出，因为黑板设计下没有返回值可用。

### 设施归属判据

判据取自 Bevy 的分法：`World` 是存储、自身无逻辑；调度推进世界，不进快照；`Events<T>` 这类事件槽位是 World 内的资源，随回滚恢复。由此得到两条问题：

1. **是否进入 checkpoint、是否影响回滚后的后续模拟？** 是 → 归 `World`。
2. **是否跨场景存活、可由静态定义重建、与回滚无关？** 是 → 属于被注入的底层能力，由上层构造并向下传入。

| 设施 | 进 checkpoint | 跨场景存活 | 可由定义重建 | 归属 |
|------|:---:|:---:|:---:|------|
| `MessageQueue` 内容 | 是 | 否 | 否 | World |
| `MessageQueue` 机制（分桶、插入、去重、容量） | 否 | 否 | 是 | 可注入的过程 |
| 事件总线订阅表 | 是 | 否 | 否 | 所属 Reactor |
| 事件总线机制（匹配、派发） | 否 | 否 | 是 | 引擎注入 |
| `jsProcessor` 编译缓存 | 否 | 是 | 是 | 引擎注入 |
| `pipelineCatalog` | 否 | 是 | 是 | 引擎注入 |
| `pipelineResolverService` 缓存 | 否 | 是 | 是 | 引擎注入 |
| `eventCatalog` 位索引 | 否 | 是 | 是 | 引擎注入 |
| `tagRegistry` | 否 | 是 | 是 | 引擎注入 |

`EngineInfrastructure` 的存在理由由第 2 条给出：引擎设施跨 `reset` / `cleanup` 存活（`types.ts:18`），而 `reset` 会清空世界且不重建编译缓存，所以设施必须由引擎构造并向下注入，`World` 只能从构造函数接收。`pipelineResolverService` 与 `eventCatalog` 现在已经是 `Member` 的构造参数（`Member.ts:106-107`），注入链路已经存在。

`EventQueueConfig` 是这种分离的现成例子：配置来自 `EngineConfig`，实例内容归 `World`。配置注入与内容归属并不冲突。

### 事件顺序以逻辑时刻为轴

录制的权威顺序键是 `(逻辑时刻, 同刻序号)`，tick 序号不进入记录。

帧序号表达采样密度：改成 30Hz 或 120Hz，同一批真实事件会被切进不同的帧编号，决策间隔被拉伸或压缩。逻辑时刻与推进频率无关，因此不同频率的两次运行可以按同一把尺子比对。

同刻序号承担定序：一个逻辑时刻内必然有多条事件（多条控制器命令、多个成员、同一时刻内的伤害与死亡），它们的逻辑时刻完全相同，只能靠该时刻内的发生次序定序。

### 录制对象是 FSM 实际消费的外部事件

录制的不是控制器的输出，也不是成员行为树的决策，而是**成员状态机实际消费的事件序列**。控制输入被量化到 tag 是必然的，录制的是量化后的结果；重放时用同一套量化逻辑，行为一致。

流程四步：

1. **采集**：在成员内 `actor.send` 之前的唯一出口追加一条记录，字段为成员、来源、事件名、负载与逻辑时刻。控制器输入与 AI 行为树输出走同一条通路，不需要区分来源。
2. **转换**：按现有动作池映射为 mistreevous 的 `sequence` 下交替的 action 与 wait。技能提交映射为 `castSkill`，目标切换为 `selectTarget`，跳跃为 `jump`；技能提交后的等待映射为 `waitUntilActionSettled`；时间间隔映射为 `wait`。同一逻辑时刻内的相邻提交产出相邻 action，不插零等待。
3. **移动**：连续移动分段记录，同方向同强度合并为一个 action，落在 `movementBehaviors`。
4. **重载**：把产出的 mdsl 装回成员的控制行为树定义位，以自主模式重跑。不需要新增"按 tag 喂入事件流"的机制，也不需要新的回放通道。

关键约束是**采集点唯一**：现在进 FSM 有两条互相绕开的路径（队列派发的 `member.actor.send` 与 `Member.submitControlInput` 内部的 `actor.send`），另有 BT 能力直接持有 `send`。录制点必须落在 `Member` 内、`actor.send` 之前的唯一出口，否则序列必然缺段。

## 实施步骤

### 阶段 1：拆分 protocol.ts

```
src/engine/core/
├── InputSnapshot.ts          # 输入快照（顶层领域模型）
├── input/
│   ├── InputLayout.ts        # 静态槽位定义
│   └── inputBufferCodec.ts   # 写入器与解码
├── output/
│   ├── CollectorConfig.ts    # 消费者声明的选择、周期、容量
│   ├── OutputCollector.ts    # 连续量采样与写出
│   ├── EventOutputFilter.ts  # 事件订阅与写出
│   └── collectorCodec.ts     # 按选择生成布局与编解码
└── thread/protocol/
    ├── lifecycle.ts
    ├── rpc.ts                # 移除 send_intent
    └── errors.ts
```

`InputSnapshot` 是引擎核心领域模型，放顶层；采集器布局与编解码放 `output/`；线程通信协议留在 `thread/protocol/`。

### 阶段 2：输入快照与静态槽位

1. `InputLayout.ts` 定义 `INPUT_LAYOUT` 与 `ControllerInputSlot`（连续量与命令队列，同槽位共用一个发布号）。
2. `InputSnapshot.fromBuffer(buffer)` 遍历槽位，跳过未启用项；提供 `groupByTarget()` 供 World 使用。
3. `InputBufferWriter` 提供 `writeTargetId` / `writeMovement`（含 `pace`）/ `writeCommand` / `enable`，并提供 `withSlot(controllerId, fn)` 以一次发布提交整个槽位。
4. `GameEngine.setInputBuffer(buffer)` 只校验 `byteLength >= INPUT_LAYOUT.totalSize`，不做布局计算。
5. 每个 tag 从输入 SAB 生成一次快照，网络按 `targetId` 把命令交给对应 Reactor；引擎不解析 `targetId`。
6. `MemberController` 改为 `(controllerId, inputBuffer)` 构造，`setTarget` 只重写 `targetId`。
7. 移除 `IntentMessage.timestamp` 与 `MemberController` 的 `Date.now()`；命令改用客户端单调序号。
8. 输入层把步态与幅度分开（`pace` + `intensity`）；`Member.resolveAndIntegrateMovement` 删掉 `intensity >= 0.75` 阈值，改按 `pace` 取 `locomotion.walkSpeed / runSpeed`。

### 阶段 3：采集器装配与写出

1. `CollectorConfig` 只包含选择、周期、容量与写满策略；选择引用已有的运行时目录与属性 schema，不新写一套 schema。
2. 创建采集器时按选择生成布局描述与缓冲，交接给消费者；布局在采集器生命周期内固定。
3. 连续量采集器在 tag 完成边界采样选中字段，按自己的发布号写出。
4. 事件采集器订阅目标 Reactor 的事件总线，按事件名与主体筛选后追加写出。
5. 每个采集器独立提交，读取方只重试自己那个采集器。
6. 引擎不再持有 `realtimeStateCommitCallback`：tag 完成与生命周期转换点改为显式提交。
7. 消费者不声明时，不创建采集器、不分配缓冲。

### 阶段 4：World 接手调度与输入应用

1. `World` 构造 `EventQueue`，删除 `timeGetter` 闭包。
2. `World.tick` 接收 `InputSnapshot`，按 `targetId` 应用控制器意图；无意图的成员回退 `sampleAiMovementInput`。
3. 成员控制输入统一走 `member.submitControlInput(event, "manual")`——修复当前断链，`"manual"` 分支由此获得唯一调用方。
4. `WorldCheckpoint` 吸收 `eventQueue`；`EngineCheckpoint` 移除该字段。
5. 删除 `maxEventsPerTick` 与 `hasPendingEvents` / `pendingTickTasksCount` 条件，tag 排列无条件推进。
6. 跨实体影响全部经网络端口表达，不引入 tick 内阶段缓冲。

### 阶段 5：事件发布与运行记录对齐

本阶段原方案（全局事件总线 + 对外事件区）已废弃。当前边界：内部事件由所属 Reactor 的事件总线同步分发；外部事件采集器订阅并筛选；连续量由采集器按周期采样。输入记录仍是独立的数据产品。旧方案保留如下，供迁移追踪：

| 产品 | 方向 | 采集点 | 载体 |
|------|------|--------|------|
| 输入记录（成员行为序列） | 外部 → 成员 | 受理控制输入处（`submitControlInput` 通过来源判定后） | 运行产出，结束时移交 |
| 已发送的事件 | 成员 → 外部 | 过程发布处（状态机、技能效果行为树、结算点） | 事件总线，订阅后写入事件采集器 |

1. 旧方案：合并 `ProcBus` 与 `DomainEventBus` 为唯一引擎级 `EventBus`。现行设计为每个 Reactor 持有内部事件总线，外部观察通过显式订阅接入。
2. 事件的发布点在**有权产生该事件的过程本身**，不在意图入口。`actor.send` 是入向意图入口，不是出向事件出口。删除 `dispatchDamageReceivedFact` 一类成对派发 helper。
3. 事件区写入由订阅决定：无对外订阅者时不创建事件区、不收集、不写出；有订阅者时按追加顺序写入。删除按类型合并逻辑。
4. 按事件语义与消费者需求确定事件记录字段；逐项评估 `MemberDomainEvent` 的既有字段（如 `hp`、`position`、`damage`）是否保留、由状态载体提供或删除。`state_changed` 与 `cast_progress` 删除（纯投影 / 连续量）。
5. 删除 `ControllerEventProjector` 与 `ControllerDomainEvent.controllerId`：事件归属是成员，控制器身份由读取方自行解析。
6. `DomainEventBusCheckpoint` 删除：事件不跨 tag 存活，无需 checkpoint。
7. `skill_input_rejected` 移除 `inputId` 字段（同步判决机制删除后失去消费者），保留 `reason`。
8. 输入记录的载体与成员状态历史分开：成员状态历史是逐 tag 状态投影（ADR 0044），输入记录是稀疏的受理事件序列（ADR 0043）；两者不混入同一通道。命名上成员状态历史统一为 `MemberStateHistory` 前缀。
9. 运行记录以逻辑时刻与同刻序号为权威顺序轴（ADR 0060），帧序号只用于定位与诊断；状态历史保留整数采样序号用于分段覆盖校验与按需寻址，时间锚点写入目录元数据。
10. `RunOutput` 的输入判决与移动采样随录制职责一起退出引擎；成员状态历史仍由引擎独占管理（ADR 0044 第 5、7 条），不移出。

### 阶段 6：删除旧机制

- 删除：`MessageRouter/`、`ControlBindingManager`、`ControllerRegistry`、`ControllerEventProjector`、`DomainEventBus`。
- 旧方案：`ProcBus` 并入全局 EventBus。现行设计保留 Reactor-local EventBus，不建立全局事件总线。
- 改名：`EventQueue` → `MessageQueue`（它是定向投递未来动作的队列，不是事件总线）；`QueueEvent` → `PendingFsmMessage`；`QueueEventType` 的 `member_fsm_event` → `fsm_message`。
- 删除回调：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`。
- 删除 RPC：`bind` / `unbind` / `attach_controller_input` / `send_intent`。
- `Simulation.worker.ts` 的 `controllerInputReaders` 映射与 `lastStableState` 保留逻辑随之下线。
- 按分层表搬迁准入策略，删除 `GameEngine.ts:650` 的 `controlMode` 检查。
- `Member.submitControlInput` 的来源判定保留，引擎侧不再重复裁决。
- `RunOutput` 的输入判决与移动采样记录随录制职责一起退出引擎。

## 验收标准

- [ ] 控制器共用一个输入 SAB；每个消费者声明一个采集器，各占一个输出 SAB，各有独立发布号
- [ ] 输入槽位内的状态与命令共用一个发布号，一次读取得到一致的（状态, 命令）视图
- [ ] 每个采集器一个发布号；同一采集器的全部字段属同一次发布，读取方按该发布号整体重试
- [ ] 采集器数量由消费者声明决定；未声明时不创建采集器、不分配缓冲
- [ ] 事件不携带墙钟时间偏移：顺序由（逻辑时刻，同刻序号，主体身份）决定
- [ ] 选择判据是漏读后果：可覆盖的连续量进采集器采样，漏读即错的事件进事件采集器
- [ ] 事件采集器保证未读不覆写，消费端只推进读游标，不搬数据不清内容
- [ ] 消费端不声明输出时引擎不产出对外数据；改变采集器配置不改变模拟结果
- [ ] 事件采集器容量不足时显形失败，不静默丢弃
- [ ] 一个事件采集器一个消费者，写端只维护一个读游标
- [ ] 引擎设施（`jsProcessor` / 目录 / 解析器缓存）跨 `reset` 存活，由引擎构造并向下注入
- [ ] GameReactor 内部 EventBus 只负责本地组件订阅；全局事件总线不再使用；跨 Reactor 传播通过明确的游戏逻辑完成
- [ ] 事件发布点唯一且在各过程本身；`actor.send` 不被当作事件出口，无成对派发 helper
- [ ] 拒绝与被接纳同样是逐条可见的事件；无按类型合并逻辑
- [ ] 输入记录与成员状态历史是两个产品，不共用通道
- [ ] 输入记录（成员行为序列）随运行产出一次性移交引用，不占输出端口
- [ ] `state_changed` 与 `cast_progress` 删除
- [ ] 运行记录以逻辑时刻与同刻序号为顺序键；状态历史保留整数采样序号用于寻址，时间锚点写入目录元数据
- [ ] `ControllerEventProjector` 与 `ControllerDomainEvent.controllerId` 删除
- [ ] 槽位契约不携带设备事件、视点角与墙钟时间；方向为世界方向，步态为语义标签
- [ ] 输入 SAB 使用静态控制器槽位，控制器可在场景加载前创建、运行时可切换 `targetId`
- [ ] 连续量采集器在 tag 完成边界采样，跳过期限时只采当前状态，不补造历史样本
- [ ] 引擎不生成全量世界状态；没有消费者读取时照常运行
- [ ] 一个 tag 内的全部微步完成后才推进到下一个 tag，到期未交付即抛错
- [ ] 队列只接受严格晚于当前模拟时刻的入队时刻
- [ ] `GameEngine` 不解析 `targetId`、不访问成员运行时状态，只做命令转交
- [ ] `World.tick` 接收 `InputSnapshot`，承担控制器 / AI 输入选择
- [ ] 拦截点收敛为三层，来源授权只在 `Member` 判定一处
- [ ] `EventQueue` 归 `World`，不再持有引擎时间闭包
- [ ] 录制采集点在 `Member` 内唯一，控制器输入与 AI 输出走同一通路
- [ ] 事件记录以 `(逻辑时刻, 同刻序号)` 为顺序键，不写入连续量采集器
- [ ] `MessageRouter`、`ControlBindingManager` 及其相关 RPC 删除
- [ ] 引擎不持有任何外部回调

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 主线程与 Worker 的槽位偏移不一致 | 布局常量共享同一模块；每个端口各只做一次长度与布局版本校验 |
| 命令队列容量不足 | 显式失败：整个运行终止并对外报告 |
| 暂停期间命令区无消费者 | 读端口与推进模拟解耦：`pause` 时仍读端口并排空命令，但不推进模拟 |
| 事件采集器写满或没有消费者推进游标 | 未订阅时不创建采集器；订阅后写满即显形失败 |
| 无订阅时“引擎不产生数据”反而被实现成“引擎少跑一段” | 对拍验证：同一场景记录与不记录两次运行，状态逐 tag 一致 |
| 多消费者时无法计算可覆写位置 | 一个事件采集器对应一个消费者；一个消费者要独立读取语义时，创建独立采集器 |
| 选择变化导致输出布局变化 | 选择或容量变化时销毁并重建对应采集器缓冲，不影响其他消费者的采集器 |
| 高频事件采集器唤醒低频消费者 | 各自独立发布号，消费者只读自己的采集器；低频消费者不会因另一采集器的高频提交而空转 |
| 移除 `maxEventsPerTick` 后单 tick 工作量无上界 | 到期事件必须在本 tag 交付完毕；实测超预算时优化产生事件的环节，而不是跨 tag 拆步 |
| 输入同步反馈消失影响控制器体验 | 控制器不需要回执；拒绝体现为动作未出现在成员执行序列里 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试 |

## 后续待定

- **成员行为序列的记录单元**：计划中“重建为 mdsl”包含两处语义发明（提交后插 `waitUntilActionSettled`、连续移动合并为一个 action），这两条在原运行里没有对应事件，会让录得的行为与跑过的行为不是同一个东西。待定方向：记录单元改为“外部动作（名字 + 参数）+ 生效时刻 + 判决结果”，折叠为 mdsl 只做机械转换（相邻动作按时间间隔插 `wait`），语义选择留给用户显式编辑。这同时涉及 ADR 0043 的重估（录制对象从“输入记录的派生视图”变为“输入记录本身”：节点词汇与行为树 action pool 对齐，`使用技能` ≍ `castSkill`）。
- **界面侧数据捕获**：当前是定时拉取，计划改为与渲染器一致的循环读取；在引擎迭代完成后处理。
- **三条死路径的清理**：`submitExternalControlInput`（`GameEngine.ts:887`）、`setDomainEventSender`（`:175` 注释）、`setDamageExecutionHandlers`（`:184` 注释）均在注入点缺失的情况下保留了上层结构。其中 `services.executeInstantDamage` / `services.createDamageArea` 一旦被调用即抛错，说明伤害区的一半通路现在是死的。设计前需先理清哪些路径真实在用。

## 相关文档与 ADR

已更新：

- `docs/decisions/0052`（修订不变量 3：布局来源改为写入端静态决定；补充“分区不变量是发布独立而非缓冲独立”）
- `src/engine/core/GameEngine.md`（tag 完成边界、采集器装配、事件顺序）
- `src/engine/core/World/World.md`（队列契约、事件与端口的分工）
- `src/engine/document/README.md`（去掉已删除文档的引用，指向模块旁的模块架构文档）
- `src/engine/AGENTS.md`（通信角色约束；线程间通道“一个采集器一个缓冲”）
- `docs/decisions/README.md`（当前决策视图与历史目录同步 0011 / 0060）
- `docs/decisions/0052`（布局来源改为写入端静态决定，已修订不变量 3）

已删除：`src/engine/document/通信协议表.md`。

待架构迭代完成后再处理 ADR：采集器由消费者声明、一个采集器一个发布号；槽位内的语义动作值契约（世界方向、步态、连续序号，不含设备事件、视点与墙钟）；成员输入准入的三层拦截分层；逻辑时间归 Reactor 网络、队列契约；连续量与事件的采集器选择判据；事件采集器的未读不覆写契约；成员行为序列的记录单元与 ADR 0043 重估。

与既有 ADR 的关系：

- **0060**：运行记录以逻辑时刻为权威顺序轴。Refines 0034、0044。
- **0011**（成员事件成对派发）：不再适用，事件由产生它的过程直接发布。
- 0045（双端协议）保留，只去掉与生命周期无关的推送叙述；0050（通道分类）不变，本次结论与它一致（未订阅时不创建事件采集器）；0052 中的成员 / 区域连续状态作为渲染层采集器的选择内容；0055（共享实时时间轴）与本计划的采集器划分不是同一问题，无需改动。
- 0044（成员状态历史采用 SAB 分段）：结论保留，两处修正——它第 8 条的 `FrameSnapshot[]` 已不存在（现名 `TickStateSnapshot`）；它把状态历史当作唯一分析载体，现在它是一个观察点，与输入记录、连续量采集器和事件采集器并列。命名统一为成员状态历史。
- 0043（行动录制从最终输入记录派生）：重估条件已触发（AI 行为树输出不经控制器输入记录）。待定项已记录方向。
