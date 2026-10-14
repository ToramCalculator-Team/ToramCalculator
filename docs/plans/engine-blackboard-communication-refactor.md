# 引擎黑板通信架构重构计划

**状态**: 待执行  
**预计工作量**: 3-5 天  
**核心决策**: 快照模式；每端口一个 SAB，区内独立发布；SAB 结构由写入者架构决定；跨线程只传语义动作值与世界状态，不传设备事件；模拟时间留在引擎；跨帧调度归 World

## 问题诊断

1. **引擎持有外部回调**：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`，违反"引擎是黑盒模拟器"的定位。
2. **运行时绑定管理复杂**：`ControlBindingManager` 维护 controllerId → memberId，需要 `bind/unbind` RPC，控制器必须等引擎就绪才能绑定。
3. **通信机制不一致**：连续状态走 SAB，离散事件走推送回调，遥测走定时推送；三条路径的所有权、容量与消费语义各自为零。
4. **输入黑板布局依赖成员列表**：需要运行时计算布局，控制器无法在场景加载前创建，切换控制对象需要改槽位。
5. **拦截点分散**：来源授权在 `GameEngine.processIntent`（查 `controlMode`）和 `Member.submitControlInput`（查 `behaviorMode`）各判一次，后者静默丢弃。
6. **断链**：`GameEngine.ts:887` 调用 `member.submitExternalControlInput`，但 `Member` 上只有 `submitControlInput(event, source)`；`"manual"` 分支无任何调用方。

## 核心原则

### 1. 每端口一个 SAB，区内独立发布

两个端口各用一个 SAB：输入端口一个、输出端口一个。缓冲区数量由**写入权与容量策略**决定，不由数据语义数量决定；同一端口内状态与事件是同一个缓冲里的两个区。

| 端口 · 区 | 写入者 | 读取者 | 解析规则 |
|-----------|--------|--------|---------|
| 输入 · 状态区 | 各控制器写自己的槽位 | 引擎 | 固定槽位偏移 + 槽位发布号 |
| 输入 · 命令区 | 同上，同一槽位内 | 引擎 | 追加顺序，同槽位共用槽位发布号 |
| 输出 · 状态区 | 引擎 | 渲染器 / UI | 固定头部 + 动态数组，最新提交 |
| 输出 · 事件区 | 引擎 | UI / 控制器 | 追加顺序，未读不覆写，与状态区同属一次 Tick 提交 |

分区不变量是**发布独立**，不是缓冲独立，以下四条都与缓冲数量无关：

- 容量与失败策略独立：状态区覆盖，事件区未读不覆写
- 消费者读取游标独立（事件区有读游标，状态区只读提交号）
- 每个端口只做一次布局版本与容量校验、只交接一次缓冲区
- 写入端的发布边界由写入者的粒度决定，不由区的数量决定

**发布号的粒度由写入者的数量决定，不由区的数量决定**：

- **输入端口**是多写入者写不相交槽位，槽位之间天然互斥，不需要锁。需要保证的只有一点：同一槽位内的状态与命令共享一个发布号，且每个槽位只递增一次发布号，不跨长时间计算持有奇数版本。这样引擎一次读就能拿到该槽位一致的（状态, 命令）视图，不会出现新方向配旧命令的错位组合。
- **输出端口**写入者只有引擎一个，且写入发生在 **Tick 末一次提交**里：状态区与事件区合起来是一个发布单元，共用一个提交号。事件区不需要独立发布号，因为 Tick 内不存在对外可见的发布时点——Tick 内任一时刻的缓冲区状态都不是任何合法世界状态，读者看到同一 Tick 内一半状态配一半事实，比看到上一个完整 Tick 更糟。事件因此按**本 Tick 的发生顺序**写入，顺序键是（模拟时刻，同 Tick 序号），模拟时刻在 Tick 内是常量，定序完全由本 Tick 内的发生次序完成。

一次提交同时覆盖两个区，因此读取方只有一种重试：整端口重试。

**模拟时刻是采样刻度，不是事件时刻**。Tick 内任意两个时刻的差值是设备性能的函数，不是领域事实，因此事件不携带 Tick 内的时间戳，也不存在「Tick 1 与 Tick 2 之间某时刻发生的事件」。事件的顺序信息由三部分构成：模拟时刻（哪一 Tick）、同 Tick 序号（该 Tick 内第几件）、成员身份（涉及谁）。

两条配套规则必须写进编解码契约：

- 读取方按端口提交号重试，一次重试重读该提交的全部区，不存在只重读一个区的情形。
- seqlock 重试时必须**丢弃上一次的读取结果，从区头重新解析**。
- 事件区的写指针与读游标与提交号正交：提交号保证读者看到一致的（状态，事实批次）视图，写指针与读游标保证事实不被覆写。前者是可见性，后者是容量，两者不可互相替代。

控制器的事件输出不受本条约束：控制器在自己的线程上产出的事件带真实的发生顺序与（离散化后）意图时刻，它们进入输入端口时同样只保留**槽位内的顺序**，不把主线程的墙钟带进模拟。

### 1.1 分区判据是漏读后果，不是可推导性

位置、HP 当值、buff 当值这些连续状态可以被覆盖：消费端任意时刻读取都是完整真相，"没读到"不是一个有意义的丢失。

`hit`、`death`、`skill_input_rejected` 描述的是**状态之间的转移过程**，与终态不是同一份信息：

- 两帧 HP 对比只能得到差值，无法还原是两次 20 还是一次 40
- `alive` 从 true 变 false 可以从状态看到，但"谁在什么时刻用什么技能击杀"只存在于转移描述里

所以分区判据是**漏读是否产生可见错误**，而不是"能否从状态推导"。按采样差分重建事件会把事件时刻算错：第 0 帧发生起步，第 1 帧才看得到位移；第 0 帧发生受击，第 1 帧才看得到血量变化。因此**可推导性不能作为判据**——事件记录的正是差分不可还原的时刻与因果身份。`hit` 与 `death` 都走事件区。

| 载体 | 契约 | 消费者 | 容量决定 |
|------|------|--------|---------|
| 输出 · 状态区 | 最新值，可跳帧 | 渲染器 / UI | 固定 |
| 输出 · 事件区 | 未读不覆写，逐条可见 | 事件总线的对外订阅者 | 固定 |
| 成员状态历史（独立 SAB 分段） | 全量可回溯 | 时间轴分析 | 运行长度 |

三个载体之外还有一个**不进共享内存**的产品：输入记录（成员行为序列）。它在运行期累积，结束时随产出一次性移交引用，不占输出端口。

同一个事实可以同时出现在多处，服务不同要求：事件区给实时消费者保证，状态区让渲染器拿到最新值，成员状态历史供事后逐 Tick 回溯。判别某个输出该进哪个载体，只问：**漏掉是否产生可见错误**（是→事件区），**是否需要事后按 Tick 回溯**（是→状态历史），都不需要才是纯状态区。

**事实只承载「发生了什么」**（ADR 0059）：事实身份、涉及主体与模拟时刻。数值不进入事实，需要数值的消费者从状态载体读取；状态载体表达力不足时扩展状态投影，不把数值放回事实。

### 1.2 事件区契约：写端不覆写未读槽位

事件区的保证是**写入端行为约束**，不是"必须有人在读"：

> 事件写入的槽位在被标记已读之前不被覆写。

没有消费者时这条平凡成立（无人读则无人标记，写端就是不能覆写），因此与"引擎在没有消费端时也能正常运作"不矛盾。契约上只有两个指针：

- **写指针**：只有写端推进
- **读游标**：只有消费端推进，只写标记，不搬数据、不清内容

内容在被允许覆写前始终完整可读，擦除只是"允许将来的写入覆写这些槽位"的等价说法，由写端在检查游标时自行决定。写端不变量是：(writePos - readCursor) < capacity。

容量归属按 ADR 0050 的门槛化模式：通用引擎任务不创建事件区，也不承担共享内存门槛；消费者显式附加时才创建，附加后保证生效。附加状态下放不下时显形失败，不静默覆写。

**事件区是单消费者**。多个读取方（UI 与控制器）合并为一个读取端，由同一个主线程循环驱动。理由：可覆写位置等于最小读游标，而写端不持有消费者名单就算不出该最小值；多消费者会引入一个写端不知道参与者数量的竞态。合并读取端后规则只剩 `(writePos - readCursor) < capacity`。

### 2. 快照模式

每 tick 从输入端口生成不可变 `InputSnapshot`，向输出端口写入一份完整连续世界状态 `OutputSnapshot`。引擎不持有外部回调，也不假设输出一定有消费者。

参考：Bevy `Input<T>` 资源、Unity DOTS `InputData` singleton、GGPO 帧输入快照。

### 2.1 过线的是语义动作值，不是设备事件

控制器状态到成员动作之间隔着三层转换，每层所需的信息不同：

| 转换 | 需要的信息 | 归属 |
|------|-----------|------|
| 设备事件 → 语义动作（`KeyW` → 前进方向） | 设备、键位绑定表、UI 焦点、相机基准 | 输入层（主线程） |
| 语义动作 → 定帧命令（本轮 Tick 的输入快照） | Tick 边界、模拟时钟 | 引擎 |
| 定帧命令 → 是否执行（来源授权 + FSM guard） | `behaviorMode`、FSM 状态 | `Member` / FSM |

边界画在第一段与第二段之间。过线的数据必须是**设备无关、已定帧、可重放**的语义动作值：

- **设备无关**：键码解析、修饰键组合、手柄轴映射留在输入层，引擎不知道 `KeyW` 是什么；键位绑定表是输入层配置。
- **已定帧**：要么是槽位里的“当前最新值”（连续量），要么是命令区里“一次一条”的记录（离散量）。不存在“随时到达的中间状态”。
- **可重放**：过线的事实不得依赖当时的相机或设备状态。方向因此必须在输入层按相机基准解算**世界方向**后过线，而不是把按键组合或视点角交给引擎。

两段转换不能合并到任意一侧：第一段需要相机基向量，而相机是渲染层事实，引擎不得持有；第二段需要 Tick 时钟，而 Tick 边界只有引擎知道。

**视点角不过线**。本领域的目标锁定是显式事实（`切换目标` + `targetId`），成员朝向由移动方向推出（`Member.ts:567`），没有任何引擎侧消费者需要 `yaw` / `pitch`。

对照：UE5 Enhanced Input 把设备事件按 Input Mapping Context 的 Modifier / Trigger 转成 Input Action 值后才交给游戏代码；Unity Input System 过线的是 InputAction 值加 started / performed / canceled 相位；Bevy 过线的是 `ButtonInput<KeyCode>` 这类设备无关的语义资源；Quake / Source 的 `usercmd_t` 带 `forwardmove/sidemove` + buttons + msec，客户端按客户端帧生成、服务器逐条执行；GGPO 类回滚网码传每帧固定宽度的输入位域。共同点是：边界上没有裸设备事件，过线单位要么是“一帧一条命令”，要么是“当前最新值”。

### 3. 模拟时间归引擎，World 只接收

`tickIndex` / `currentTimeMs` 留在引擎，理由：

- 时间推进是条件性的，而条件本身是引擎级计数（消息是否交付完毕），搬到 World 会在两处各存一半决策状态。
- World 现在本来就没有时间字段，只在参数里收 `SimulationTickContext`。
- `EngineCheckpoint` 已经同时装 `tickIndex` / `currentTimeMs` / `world` 并一起恢复，无需改结构。

World 需要的能力只有一项：**能基于本 tick 的 `currentTimeMs` 把相对延迟换算成绝对模拟刻度**，因为队列按该刻度分桶。它从 `World.tick(tick, ...)` 的第一个参数取，不需要自己推进或存储时间。

推进条件本身要收敛：**一次逻辑 Tick 是原子的**。移除 `maxEventsPerTick`，`tickIndex` / `currentTimeMs` 在每次 `world.tick` 之后无条件推进，到期未交付即报错（断言，非流程控制）。配套的 `hasPendingEvents` / `pendingTickTasksCount` 条件与那个恒为 0 的计数器一并删除。

队列契约同步收紧为：**只接受严格晚于当前模拟时刻的入队时刻**。本 Tick 内生效的因果链不经过队列，由规则层在 Tick 内部的固定阶段完成。

### 4. 目标架构

```
┌──────────────────── 主线程 ────────────────────┐
│  控制器 A（槽位 0）              渲染器 / UI     │
│   写 targetId + 意图              读最新连续状态 │
│   （设备事件已在本层转成语义动作）                │
└────────┬──────────────────────────────┬────────┘
         ↓ 写                          ↓ 读
   [输入 SAB]                      [输出 SAB]
   · 状态区（方向/步态/强度）        · 状态区（连续世界状态）
   · 命令区（离散动作）             · 事件区（离散事实）
         ↑                              ↑
         │ 生成快照                      │ 写入快照
┌────────┴──────────────────────────────┴────────┐
│ Worker                                          │
│  GameEngine.stepTick() {                        │
│    input = InputSnapshot.fromBuffer(inputSAB)   │
│    world.tick(context, input)      // 传快照     │
│    OutputSnapshot.fromEngine(this)              │
│      .writeToBuffer(outputSAB)                  │
│  }                                              │
│                                                 │
│  World.tick(context, inputSnapshot) {           |
|    for (cmd of inputSnapshot.commands)          │
│      dispatchMemberEvent(cmd)      // 命令转交   │
│    按 targetId 取成员意图，回退 AI 采样           │
│    member.tick(context, movementInput)          │
│  }                                              │
└─────────────────────────────────────────────────┘
```

快照直接交给世界：

```
InputSnapshot
      └── 整体    ──→ World.tick(context, snapshot) → member.tick()
```

与输出侧对称：引擎写一份完整世界状态，渲染器和 UI 各读所需。

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

- **步态与强度分开**。现状把走路 / 奔跑编码为 `0.5` / `1`（`src/platform/render/scene/input/controller.ts`），引擎再用 `intensity >= 0.75` 反推步态（`Member.ts:539`）。`src/game/locomotion.ts` 约定的分工是“输入层输出归一化 intensity，引擎层映射速度，渲染层映射步态”，但 0.5 / 1 是两值而不是连续量，于是同一个字段既承担连续幅度又承担离散档位，引擎只能靠阈值重猜上游已经确定的事实。分开后 `pace` 定速度档、`intensity` 只定幅度，引擎从 `locomotion.walkSpeed / runSpeed` 取值，不再做阈值判断。
- **命令不带墙钟时间**。`IntentMessage` 的 `timestamp: Date.now()` 是墙钟，进不了确定性模拟，也无法在重放时对齐；客户端只提供单调序号用于同刻定序，模拟时刻由引擎在读取时赋予。

### 输出 SAB：连续世界状态与离散事件两区

```typescript
// src/engine/core/OutputSnapshot.ts
export class OutputSnapshot {
  constructor(
    readonly members: readonly MemberState[],
    readonly areas: readonly AreaState[],
    readonly tickIndex: number,
    readonly simulationTimeMs: number,
  ) {}
}
```

头部固定（`tickIndex` / `simulationTimeMs` / 各数组长度与偏移），后接成员与区域两个动态数组加共享时间轴映射。引擎不知道谁在读；渲染器与 UI 各自读取所需部分。**不引入 `outputConsumers` 配置。**

状态区只承载连续状态：引擎每 Tick 末覆盖提交一份完整世界状态，读取方只取最新提交并允许跳过中间提交。需要逐次可见的离散事实进入同一缓冲的事件区，按追加顺序写入，未读槽位不被覆写。两区在 Tick 末同一次提交中一起发布，读取方按端口提交号重试。

事件区承载**已发送的事实**（ADR 0059）：事实身份、涉及主体与模拟时刻，不携带数值负载。顺序以 `(simulationTimeMs, 同 Tick 序号)` 为权威全序，`tickIndex` 不进入记录：帧序号表达采样密度，跨帧率会拉伸或压缩决策间隔，而模拟时刻是采样刻度。同 Tick 序号就是事件在本 Tick 内的发生次序，Tick 内不引入更细的时间划分。

**事件区由订阅决定是否写入**：引擎常设事件总线，各过程自发发布事实；没有对外订阅者时不创建事件区、不收集、不写出，也不产生任何对外数据。无论有无订阅，模拟结果逐 Tick 一致。

事件总线在 Tick 内累积，Tick 末一次派发。两个发布号当中的第二项——「事件区在 Tick 内多个时点追加」——不存在：Tick 内没有对外可见的发布时点，读者要么看到上一 Tick 的完整结果，要么看到本 Tick 的完整结果。

**拒绝也是事实**：被拒绝的尝试与被接纳的转移在事件区中同样逐条可见，不为「未发生」另立通道。

**合并逻辑不得存在**：同一 Tick 同一成员可以发生多次同类事实，按类型合并会直接丢失事实，违反逐条可见契约。

容量在场景装配时定死，运行中不重分配。写端不根据读取进度调整容量，也不持有消费者名单：事件区是单消费者，写端只读一个共享读游标，按 1.2 节。

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
| `FsmMessageQueue` 内容 | 是 | 否 | 否 | World |
| `FsmMessageQueue` 机制（分桶、插入、去重、容量） | 否 | 否 | 是 | 可注入的过程 |
| `EventBus` 订阅表 | 是 | 否 | 否 | World（按作用域分桶） |
| `EventBus` 机制（分桶、mask 过滤、派发） | 否 | 否 | 是 | 可注入的过程 |
| `jsProcessor` 编译缓存 | 否 | 是 | 是 | 引擎注入 |
| `pipelineCatalog` | 否 | 是 | 是 | 引擎注入 |
| `pipelineResolverService` 缓存 | 否 | 是 | 是 | 引擎注入 |
| `eventCatalog` 位索引 | 否 | 是 | 是 | 引擎注入 |
| `tagRegistry` | 否 | 是 | 是 | 引擎注入 |

`EngineInfrastructure` 的存在理由由第 2 条给出：引擎设施跨 `reset` / `cleanup` 存活（`types.ts:18`），而 `reset` 会清空世界且不重建编译缓存，所以设施必须由引擎构造并向下注入，`World` 只能从构造函数接收。`pipelineResolverService` 与 `eventCatalog` 现在已经是 `Member` 的构造参数（`Member.ts:106-107`），注入链路已经存在。

`EventQueueConfig` 是这种分离的现成例子：配置来自 `EngineConfig`，实例内容归 `World`。配置注入与内容归属并不冲突。

### 跨帧调度与成员路由归 World

`EventQueue` 的键是模拟时间、内容是成员 FSM 消息，且文件已在 `src/engine/core/World/EventQueue/`，而 `World.ts:19` 早已声明 `private eventQueue: EventQueue;`（未赋值）——这是被中断的边界迁移。

“归 World”指的是**队列内容**进 `World` 的 checkpoint，不是把队列机制也搬进世界内部。机制是无状态过程，可以作为引擎提供的服务被注入，就像 `Events<T>` 的交换系统属于调度、而槽位属于 World。

下放后：

- **成员路由消失**：`World.tick` 拿到的快照已带 `targetId`，`memberManager.getMember(slot.targetId)` 一步到位。tick 内事件（伤害段、区域）同理，成员知道自己是谁，直接入队。
- **`MessageRouter` 整个删除**。它承载三件事，分别处理：

| 原职责 | 处理 |
|--------|------|
| 绑定 / 解绑控制对象 | 删除，槽位 `targetId` 取代 `ControlBindingManager` |
| 找成员 + 入队 | 删除，World 读快照时一步完成 |
| 准入策略（`acceptExternalIntents` / 输入窗口 / `controlMode`） | 按上表分层搬迁，不可随类丢弃 |
| 输入录制（`appendInput` / `acceptInput` / `rejectInput`） | 删除，录制对象是成员自身产生的行为序列 |
| `MessageRouterStats` 与 `send_intent` RPC | 删除 |

生命周期 RPC（`load_scenario` / `start` / `pause` / `resume`）不是成员输入，保留。

- **闭包时间源必须删除**：`EventQueue` 现在持有 `() => this.currentTimeMs`（`EventQueue.ts:27, 65`）。搬进 World 后若保留，等于 World 通过函数指针读引擎私有可变状态——比参数传递更耦合且不可见。`getDue` / `removeProcessedDue` 已收参数，只剩 `createSnapshot()` 走闭包，改为 `createSnapshot(currentTimeMs: number)`。

- **两条入队入口**需要区分（都归 World，区别只在时间锚点来源）：
  - tick 内派发：基于 `World.tick` 收到的 `currentTimeMs`，执行时刻由段间隔与服务时长决定，因此总是指向未来时刻。
  - tick 外注入（外部 RPC）：由引擎带上自己的 `currentTimeMs` 转给 World。

### Tick 分两相，跨实体写入走阶段缓冲

`World.tick` 内部拆成两相：

1. **采样相**：遍历成员，每个成员只写自身状态（位置、属性、自身 FSM），并收集跨实体意图。
2. **结算相**：全部成员位置已定，统一解析范围、锁定目标、结算伤害、创建与移除区域。

判据是**写入目标**而不是"看起来是否延迟"：写自身的立即执行，写其他成员或共享集合（成员表、区域表、空间索引）的必须经阶段缓冲。这条边界由接口形状保证——成员可用的能力只暴露自身写入与只读查询，跨实体修改只有阶段缓冲一条通路。这样"哪些算延迟意图"不再需要逐例判断。

分相解决的是顺序依赖，而不只是把它推迟：今天的伤害结算已经延后到成员遍历之后，但范围解析仍读遍历中途的位置，而区域更新仍在遍历内部，部分成员的位置尚未更新。

成员内部同样分相，修正决策排在结算之后的问题：

```
member.tick:
  决策相    controlBehavior.step()          ← AI 输出，与控制器输入同相
  移动结算  resolveAndIntegrateMovement()
  效果相    effectBtManager.tickAll()
```

现状是 `controlBehavior.step()` 排在移动结算之后（`Member.ts:376-381`），使 AI 决策实际在下一 Tick 才可能被结算，而控制器命令在当 Tick 结算。同一个 FSM 的两类来源因此有不同生效时机，录制内容如何组织都无法对齐。统一到决策相后，两类来源都表现为“本 Tick 生效”。

决策相有一个前提，已核实：控制行为树节点的能力面只有 `submitControlInput`（`ControlBehavior/Bindings.ts:12`），公共控制 action 节点全部只调 `submitControlInput`（`NodeMethods/ActionMethods.ts:29, 41, 52`），条件节点只读 `statusTags`。所以 AI 决策树**没有**直接写属性的通路，统一事件注入到决策相就足够保证复现。

属性写入（`attributeContainer.addModifier`）发生在效果行为树（`EffectBehavior/NodeMethods/ActionMethods.ts:496, 557`），它由技能驱动、本就在效果相，与决策相同相无关。

### 技能效果在施法前摇统一产生

技能生命周期为读条前摇、读条（咏唱或蓄力）、施法前摇、施法、施法后摇，与现有管线约定一致（`builtInBinaryOpPipelines.ts:15-16`）。

效果计算统一发生在施法前摇，因此全部伤害段与区域创建都晚于当前时刻，**`delayMs = 0` 的同步通路不需要存在**——这正是队列"只接受严格未来时刻"能够成立的前提，也使得 `instantDamageScheduler` 回调可以删除。

多段伤害的三种情形按技能作者注释（`EffectBehavior/NodeMethods/ActionMethods.ts:46-49`）区分：

| 情形 | 手段 | 段间数值 |
|------|------|---------|
| 结果完全不同的多次结算 | 多次调用伤害节点 | 各段独立结算 |
| 结果相同但浮动不同 | 多区域 | 各段独立结算 |
| 单次结算拆分显示 | `damageCount` + `damageInterval` | **一次锁定后均分，不逐段重算**（`DamageResolution.ts:244-249`） |

第三种是延迟事实的主要使用者：`hitCheck` / `damageCalc` 只跑一次，`finalDamage` 一次定死，均分后的各段按间隔排入队列。区域伤害的 payload 在创建时即锁定（`createDamagePayload` 从 `instance.spec.payload` 构造），属于同一种语义。

### 事实顺序以模拟时间为轴

录制的权威顺序键是 `(simulationTimeMs, 同 Tick 序号)`，`tickIndex` 不进入记录。

帧序号表达采样密度：改成 30Hz 或 120Hz，同一批真实事件会被切进不同的帧编号，决策间隔被拉伸或压缩。模拟时间是物理量，跟帧率无关，因此跨帧率的两次运行可以按同一把尺子比对。

同 Tick 序号承担定序：一个 Tick 内必然有多条事实（多条控制器命令、多个成员、同一 Tick 内的伤害与死亡），它们的模拟时刻完全相同，只能靠本 Tick 内的发生次序定序。

### 录制对象是 FSM 实际消费的外部事实

录制的不是控制器的输出，也不是成员行为树的决策，而是**成员状态机实际消费的事实序列**。控制输入在引擎内被量化到 tick 是必然的，录制的是量化后的结果；重放时用同一套量化逻辑，行为一致。

流程四步：

1. **采集**：在成员内 `actor.send` 之前的唯一出口追加一条记录，字段为成员、来源、事件名、负载与模拟时刻。控制器输入与 AI 行为树输出走同一条通路，不需要区分来源。
2. **转换**：按现有动作池映射为 mistreevous 的 `sequence` 下交替的 action 与 wait。技能提交映射为 `castSkill`，目标切换为 `selectTarget`，跳跃为 `jump`；技能提交后的等待映射为 `waitUntilActionSettled`；时间间隔映射为 `wait`。同 tick 内的相邻提交产出相邻 action，不插零等待。
3. **移动**：连续移动分段记录，同方向同强度合并为一个 action，落在 `movementBehaviors`。
4. **重载**：把产出的 mdsl 装回成员的控制行为树定义位，以自主模式重跑。不需要新增"按 tick 喂入事件流"的机制，也不需要新的回放通道。

关键约束是**采集点唯一**：现在进 FSM 有两条互相绕开的路径（队列派发的 `member.actor.send` 与 `Member.submitControlInput` 内部的 `actor.send`），另有 BT 能力直接持有 `send`。录制点必须落在 `Member` 内、`actor.send` 之前的唯一出口，否则序列必然缺段。

## 实施步骤

### 阶段 1：拆分 protocol.ts

```
src/engine/core/
├── InputSnapshot.ts          # 输入快照（顶层领域模型）
├── OutputSnapshot.ts         # 输出快照（顶层领域模型）
├── input/
│   ├── InputLayout.ts        # 静态槽位定义
│   └── inputBufferCodec.ts   # 写入器与解码
├── output/
│   └── outputBufferCodec.ts
└── thread/protocol/
    ├── lifecycle.ts
    ├── rpc.ts                # 移除 send_intent
    └── errors.ts
```

Snapshot 是引擎核心领域模型，放顶层；布局与编解码是配套逻辑，放对应子目录；线程通信协议留在 `thread/protocol/`。

### 阶段 2：输入快照与静态槽位

1. `InputLayout.ts` 定义 `INPUT_LAYOUT` 与 `ControllerInputSlot`（状态区 + 命令区，同槽位共用一个发布号）。
2. `InputSnapshot.fromBuffer(buffer)` 遍历槽位，跳过未启用项；提供 `groupByTarget()` 供 World 使用。
3. `InputBufferWriter` 提供 `writeTargetId` / `writeMovement`（含 `pace`）/ `writeCommand` / `enable`，并提供 `withSlot(controllerId, fn)` 以一次发布提交整个槽位。
4. `GameEngine.setInputBuffer(buffer)` 只校验 `byteLength >= INPUT_LAYOUT.totalSize`，不做布局计算。
5. `GameEngine.stepTick()` 生成快照后整体交 `world.tick(context, inputSnapshot)`；命令的转交与定帧都在 World（引擎不解析 `targetId`）。
6. `MemberController` 改为 `(controllerId, inputBuffer)` 构造，`setTarget` 只重写 `targetId`。
7. 移除 `IntentMessage.timestamp` 与 `MemberController` 的 `Date.now()`；命令改用客户端单调序号。
8. 输入层把步态与幅度分开（`pace` + `intensity`）；`Member.resolveAndIntegrateMovement` 删掉 `intensity >= 0.75` 阈值，改按 `pace` 取 `locomotion.walkSpeed / runSpeed`。

### 阶段 3：输出快照

1. `OutputSnapshot.fromEngine(engine)` 收集成员连续状态、区域状态与共享时间轴映射。
2. `writeToBuffer` / `fromBuffer` 实现固定头部 + 动态数组 + 时间轴映射的编解码。状态区与事件区同一缓冲，Tick 末一次提交同时发布两区。
3. `GameEngine.setOutputBuffer(buffer)` 只校验容量与布局版本，不依赖任何消费者配置。
4. 渲染器与 UI 各自 `OutputSnapshot.fromBuffer` 后按需取用。
5. 引擎不再持有 `realtimeStateCommitCallback`：Tick 末与生命周期转换点改为显式提交。

### 阶段 4：World 接手调度与输入应用

1. `World` 构造 `EventQueue`，删除 `timeGetter` 闭包。
2. `World.tick` 接收 `InputSnapshot`，按 `targetId` 应用控制器意图；无意图的成员回退 `sampleAiMovementInput`。
3. 成员控制输入统一走 `member.submitControlInput(event, "manual")`——修复当前断链，`"manual"` 分支由此获得唯一调用方。
4. `WorldCheckpoint` 吸收 `eventQueue`；`EngineCheckpoint` 移除该字段。
5. `World.tick` 拆为采样相与结算相，引入 Tick 内阶段缓冲。
6. 删除 `instantDamageScheduler` 回调，伤害段入阶段缓冲。
7. 删除 `maxEventsPerTick` 与 `hasPendingEvents` / `pendingTickTasksCount` 条件，模拟时间无条件推进。

### 阶段 5：事实发布与运行记录对齐

先区分两个方向相反、同名前叫「事实」的产品（ADR 0059）：

| 产品 | 方向 | 采集点 | 载体 |
|------|------|--------|------|
| 输入记录（成员行为序列） | 外部 → 成员 | 受理控制输入处（`submitControlInput` 通过来源判定后） | 运行产出，结束时移交 |
| 已发送的事实 | 成员 → 外部 | 过程发布处（状态机、技能效果行为树、结算点） | 事件总线，订阅后写入事件区 |

1. 合并 `ProcBus` 与 `DomainEventBus` 为唯一引擎级 `EventBus`（ADR 0059），订阅带作用域并相应分桶；成员移除时清理其作用域订阅。两套事件词汇表收敛为 `EventCatalog` 一套。
2. 事实的发布点在**有权产生该事实的过程本身**，不在意图入口。删除“成员在 `actor.send` 之前的唯一出口”这一说法：`actor.send` 是入向意图入口，不是出向事实出口。删除 `dispatchDamageReceivedFact` 一类成对派发 helper。
3. 事件区写入由订阅决定：无对外订阅者时不创建事件区、不收集、不写出；有订阅者时按追加顺序写入。删除按类型合并逻辑。
4. 事实记录只含事实身份、涉及主体与模拟时刻，不携带数值负载。`MemberDomainEvent` 的既有数值字段（`hp`、`position`、`damage` 等）要么删除，要么改为从状态载体读取；状态载体表达力不足时扩展状态投影。`state_changed` 与 `cast_progress` 删除（纯投影 / 连续量）。
5. 删除 `ControllerEventProjector` 与 `ControllerDomainEvent.controllerId`：事实归属是成员，控制器身份由读取方自行解析。
6. `DomainEventBusCheckpoint` 删除：Tick 原子化后批次不跨 Tick 存活，无需 checkpoint。
7. `skill_input_rejected` 移除 `inputId` 字段（同步判决机制删除后失去消费者），保留 `reason`。
8. 输入记录的载体与成员状态历史分开：成员状态历史是逐 Tick 状态投影（ADR 0044），输入记录是稀疏的受理事件序列（ADR 0043）；两者不混入同一通道。命名上成员状态历史统一为 `MemberStateHistory` 前缀，不再叫「Tick 状态历史」。
9. 运行记录以模拟时刻与同 Tick 序号为权威顺序轴（ADR 0060），帧序号只用于定位与诊断；逐 Tick 状态历史保留整数采样序号用于分段覆盖校验与按需寻址，时间锚点写入目录元数据。
10. `RunOutput` 的输入判决与移动采样随录制职责一起退出引擎；成员状态历史仍由引擎独占管理（ADR 0044 第 5、7 条），不移出。

### 阶段 6：删除旧机制

- 删除：`MessageRouter/`、`ControlBindingManager`、`ControllerRegistry`、`ControllerEventProjector`、`DomainEventBus`。
- 合并：`ProcBus` 并入 `EventBus`，成员私有总线不再单独存在。
- 改名：`EventQueue` → `FsmMessageQueue`（它是定向投递未来动作的队列，不是事件总线）；`QueueEvent` → `PendingFsmMessage`；`QueueEventType` 的 `member_fsm_event` → `fsm_message`。
- 删除回调：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`。
- 删除 RPC：`bind` / `unbind` / `attach_controller_input` / `send_intent`。
- `Simulation.worker.ts` 的 `controllerInputReaders` 映射与 `lastStableState` 保留逻辑随之下线。
- 按分层表搬迁准入策略，删除 `GameEngine.ts:650` 的 `controlMode` 检查。
- `Member.submitControlInput` 的来源判定保留，引擎侧不再重复裁决。
- `RunOutput` 的输入判决与移动采样记录随录制职责一起退出引擎。

## 验收标准

- [ ] 输入端口与输出端口各一个 SAB；输出端口状态区与事件区在 Tick 末同一次提交中发布，读取方按端口提交号整体重试
- [ ] 输入槽位内的状态与命令共用一个发布号，一次读取得到一致的（状态, 命令）视图
- [ ] 事件不携带 Tick 内时刻：顺序由（模拟时刻，同 Tick 序号，成员身份）决定，模拟时刻在 Tick 内为常量
- [ ] 分区判据是漏读后果：可覆盖的连续状态进状态区，漏读即错的离散事实进事件区
- [ ] 事件区保证为“未读不覆写”，消费端只推进读游标，不搬数据不清内容
- [ ] 事件区消费者是事件总线的对外订阅者；行为录制不属于输出端口
- [ ] **没有订阅者时不产生任何对外数据**：不创建事件区、不写入、不收集；有无订阅时模拟结果逐 Tick 一致
- [ ] 事件区容量门槛化：未附加消费者时不创建，附加后放不下即显形失败
- [ ] 事件区消费者只有一个（多个读取方合并为一个读取端）
- [ ] 成员 tick 分决策相与效果相，控制行为树在移动结算之前推进
- [ ] 引擎设施（`jsProcessor` / 目录 / 解析器缓存）跨 `reset` 存活，由引擎构造并向下注入
- [ ] 唯一引擎级 `EventBus`：成员作用域与外部作用域共用一套词汇表；`ProcBus` 与 `DomainEventBus` 不再存在
- [ ] 事实发布点唯一且在各过程本身；`actor.send` 不被当作事实出口，无成对派发 helper
- [ ] 已发送的事实不携带数值负载；数值从状态载体读取
- [ ] 拒绝与被接纳同样是逐条可见的事实；无按类型合并逻辑
- [ ] 输入记录与成员状态历史是两个产品，不共用通道
- [ ] 输入记录（成员行为序列）随运行产出一次性移交引用，不占输出端口
- [ ] `state_changed` 与 `cast_progress` 删除
- [ ] 运行记录以模拟时刻与同 Tick 序号为顺序键，不含 `tickIndex`；逐 Tick 状态历史保留整数采样序号用于寻址，时间锚点写入目录元数据
- [ ] `ControllerEventProjector` 与 `ControllerDomainEvent.controllerId` 删除
- [ ] 槽位契约不携带设备事件、视点角与墙钟时间；方向为世界方向，步态为语义标签
- [ ] 输入 SAB 使用静态控制器槽位，控制器可在场景加载前创建、运行时可切换 `targetId`
- [ ] 状态区承载连续状态，事件区按追加顺序承载离散事实，两区同一次提交发布
- [ ] 引擎不需要 `outputConsumers` 配置即可运行；没有消费者读取时照常运行
- [ ] 一次逻辑 Tick 只推进一次模拟时间，到期未交付即抛错
- [ ] 队列只接受严格晚于当前模拟时刻的入队时刻
- [ ] `World.tick` 分采样相与结算相，跨实体写入经阶段缓冲
- [ ] `GameEngine` 不解析 `targetId`、不访问成员运行时状态，只做命令转交
- [ ] `World.tick` 接收 `InputSnapshot`，承担控制器 / AI 输入选择
- [ ] 拦截点收敛为三层，来源授权只在 `Member` 判定一处
- [ ] `EventQueue` 归 `World`，不再持有引擎时间闭包
- [ ] 录制采集点在 `Member` 内唯一，控制器输入与 AI 输出走同一通路
- [ ] 事实记录以 `(simulationTimeMs, 同 Tick 序号)` 为顺序键，不含 `tickIndex`，且写入状态历史而非事件区
- [ ] `MessageRouter`、`ControlBindingManager` 及其相关 RPC 删除
- [ ] 引擎不持有任何外部回调

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 主线程与 Worker 的槽位偏移不一致 | 布局常量共享同一模块；每个端口各只做一次长度与布局版本校验 |
| 命令队列容量不足 | 显式失败：整个运行终止并对外报告 |
| 暂停期间命令区无消费者 | 读端口与推进模拟解耦：`pause` 时仍读端口并排空命令，但不推进模拟 |
| 事件区未读槽位无消费者推进 | 门槛化：未订阅时不创建事件区；订阅后写满即显形失败 |
| 无订阅时“引擎不产生数据”反而被实现成“引擎少跑一段” | 对拍验证：同一场景记录与不记录两次运行，成员状态逐 Tick 一致 |
| 多消费者时无法计算可覆写位置 | 事件区限定单消费者；若引入第二个消费者，必须连带定义最小游标的维护方式 |
| 单 SAB 内事件区扩容会连带重新交接状态区 | 容量在场景装配时定死，运行中不重分配；切换场景本来就要重新交接全部缓冲区 |
| 一次提交同时发布两区，事实追加会唤醒只关心状态的读者 | 接受：唤醒频率是每 Tick 一次，与状态提交同频，不产生额外唤醒；与此对照，两区独立发布才会让读者在 Tick 中途醒来并看到半更新状态 |
| 移除 `maxEventsPerTick` 后单 Tick 工作量无上界 | 到期事实必须本 Tick 交付完毕；实测超预算时优化结算相，而不是重新引入跨 Tick 拆步 |
| 输入同步反馈消失影响控制器体验 | 控制器不需要回执；拒绝体现为动作未出现在成员执行序列里 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试 |

## 后续待定

- **成员行为序列的记录单元**：计划中“重建为 mdsl”包含两处语义发明（提交后插 `waitUntilActionSettled`、连续移动合并为一个 action），这两条在原运行里没有对应事实，会让录得的行为与跑过的行为不是同一个东西。待定方向：记录单元改为“外部动作（名字 + 参数）+ 生效时刻 + 判决结果”，折叠为 mdsl 只做机械转换（相邻动作按时间间隔插 `wait`），语义选择留给用户显式编辑。这同时涉及 ADR 0043 的重估（录制对象从“输入记录的派生视图”变为“输入记录本身”：节点词汇与行为树 action pool 对齐，`使用技能` ≍ `castSkill`）。
- **界面侧数据捕获**：当前是定时拉取，计划改为与渲染器一致的循环读取；在引擎迭代完成后处理。
- **三条死路径的清理**：`submitExternalControlInput`（`GameEngine.ts:887`）、`setDomainEventSender`（`:175` 注释）、`setDamageExecutionHandlers`（`:184` 注释）均在注入点缺失的情况下保留了上层结构。其中 `services.executeInstantDamage` / `services.createDamageArea` 一旦被调用即抛错，说明伤害区的一半通路现在是死的。设计前需先理清哪些路径真实在用。

## 相关文档与 ADR

已更新：

- `docs/decisions/0052`（修订不变量 3：布局来源改为写入端静态决定；补充“分区不变量是发布独立而非缓冲独立”）
- `src/engine/core/GameEngine.md`（Tick 原子化、输出分两区、事实顺序、黑板管理）
- `src/engine/core/World/World.md`（Tick 分两相、阶段缓冲、队列契约、技能效果时序）
- `src/engine/document/README.md`（去掉已删除文档的引用，指向模块旁的模块架构文档）
- `src/engine/AGENTS.md`（通信角色表改为队列 / 总线两类；线程间通道补充“无订阅不产生数据”；阶段缓冲判据）
- `docs/decisions/README.md`（当前决策视图与历史目录同步 0011 / 0059 / 0060）
- `docs/decisions/0052`（布局来源改为写入端静态决定，已修订不变量 3）

已删除：`src/engine/document/通信协议表.md`。

待架构迭代完成后再处理 ADR：输入 / 输出端口的缓冲划分与区内独立发布；槽位内的语义动作值契约（世界方向、步态、连续序号，不含设备事件、视点与墙钟）；模拟时间留引擎、跨帧调度归 World；成员输入准入的三层拦截分层；Tick 原子化与队列契约；输出两区分判据（漏读后果）与事件区的未读不覆写契约；成员行为序列的记录单元与 ADR 0043 重估。

与既有 ADR 的关系：

- **0059（新增）**：对外事实由订阅驱动并从唯一引擎事件总线发布。Supersedes 0011；Refines 0010、0050。
- **0060（新增）**：运行记录以模拟时间为权威顺序轴。Refines 0034、0044。
- **0011**（成员事实成对派发）：已被 0059 取代。
- 0045（双端协议）保留，只去掉与生命周期无关的推送叙述；0050（通道分类）不变，本次结论与它一致（事件区沿用其门槛化模式，并上移到“未订阅不产生”）；0052 的成员 / 区域连续状态成为状态区的内容；0055（共享实时时间轴）与模拟时间归属不是同一问题，无需改动。
- 0044（成员状态历史采用 SAB 分段）：结论保留，两处修正——它第 8 条的 `FrameSnapshot[]` 已不存在（现名 `TickStateSnapshot`）；它把状态历史当作唯一分析载体，现在它是一个观察点，与输入记录、事件区并列。命名由「Tick 状态历史」改为成员状态历史。
- 0043（行动录制从最终输入记录派生）：重估条件已触发（AI 行为树输出不经控制器输入记录）。待定项已记录方向。
