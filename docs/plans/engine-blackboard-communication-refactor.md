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

两个端口各用一个 SAB：输入端口一个、输出端口一个。缓冲区数量由**写入权与容量策略**决定，不由数据语义数量决定；同一端口内状态与事件是同一个缓冲里的两个区，各有自己的发布号。

| 端口 · 区 | 写入者 | 读取者 | 解析规则 |
|-----------|--------|--------|---------|
| 输入 · 状态区 | 各控制器写自己的槽位 | 引擎 | 固定槽位偏移 + 发布号 |
| 输入 · 命令区 | 同上，同一槽位内 | 引擎 | 追加顺序，同槽位共用一个发布号 |
| 输出 · 状态区 | 引擎 | 渲染器 / UI | 固定头部 + 动态数组，最新提交 |
| 输出 · 事件区 | 引擎 | 行为录制 / 运行分析 | 追加顺序 + 显式保留深度，独立发布号 |

分区不变量是**发布独立**，不是缓冲独立，四条都与缓冲数量无关：

- 发布号独立（或写入互斥）
- 容量与失败策略独立：状态区覆盖，事件区保留深度不足即失败
- 消费者读取游标独立
- 每个端口只做一次布局版本与容量校验、只交接一次缓冲区

区分两种写入关系：

- **输入端口**是多写入者写不相交槽位，槽位之间天然互斥，不需要锁。需要保证的只有一点：同一槽位内的状态与命令共享一个发布号，且每个槽位只递增一次发布号，不跨长时间计算持有奇数版本。这样引擎一次读就能拿到该槽位一致的（状态, 命令）视图，不会出现新方向配旧命令的错位组合。
- **输出端口**写入者只有引擎一个，串行执行，状态区与事件区用两个发布号即可，互不需要互斥。两个发布号的理由是发布节奏不同——事件区在 Tick 内多个时点追加，状态区在 Tick 末一次提交；共用发布号会让只关心状态的读者被事件追加唤醒，让只关心事件的读者承担状态重读。

两条配套规则必须写进编解码契约：

- 读取方按分区的发布号各自重试，一个区的写入不使另一个区的读取重试。
- seqlock 重试时必须**丢弃上一次的读取结果，从区头重新解析**；否则命令区的追加会被重复消费。

连续状态允许被覆盖，进入状态区；离散事实必须逐次消费，进入事件区。保留深度越界必须显形失败，不静默覆盖或丢弃。

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

状态区只承载连续状态：引擎每 Tick 末覆盖提交一份完整世界状态，读取方只取最新提交并允许跳过中间提交。需要逐次消费的离散事实进入同一缓冲的事件区，按追加顺序发布，深度由保留窗口显式界定。两区各自一个发布号，读取方各自重试。

事件区的记录字段为成员、来源、事件名、负载与模拟时刻。顺序以 `(simulationTimeMs, 同刻序号)` 为权威全序，`tickIndex` 不进入记录：帧序号表达采样密度，跨帧率会拉伸或压缩决策间隔。

写入端不持有消费者名单，所以“谁在读”无法参与保留深度的计算，必须明确选一种：

- **单消费者**：事件区只有一个消费方（行为录制），游标由它自己持有，落后超过保留深度即显形失败。
- **多消费者自持游标**：每个消费者自己记游标，落后即失败，不由写入端代为跟踪。

无论哪种，保留深度由写入端固定，不根据读取进度调整。

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

### 跨帧调度与成员路由归 World

`EventQueue` 的键是模拟时间、内容是成员 FSM 消息，且文件已在 `src/engine/core/World/EventQueue/`，而 `World.ts:19` 早已声明 `private eventQueue: EventQueue;`（未赋值）——这是被中断的边界迁移。

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

录制的权威顺序键是 `(simulationTimeMs, 同刻序号)`，`tickIndex` 不进入记录。

帧序号表达采样密度：改成 30Hz 或 120Hz，同一批真实事件会被切进不同的帧编号，决策间隔被拉伸或压缩。模拟时间是物理量，跟帧率无关，因此跨帧率的两次运行可以按同一把尺子比对。

同刻序号是兜底：同一模拟时刻内可能有多个事实（控制器在两个 tick 之间发多条、同一时间片到期多条），它们的时间戳相同，只能靠次序定序。

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
2. `writeToBuffer` / `fromBuffer` 实现固定头部 + 动态数组 + 时间轴映射的编解码。状态区与事件区同一缓冲，各自一个发布号。
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

### 阶段 5：录制迁出引擎

1. 在 `Member` 内 `actor.send` 之前的唯一出口采集事实，并收口 `Member.ts` 两处 BT 的 `send` 能力。
2. 事实写入事件区，顺序键为模拟时刻加同刻序号。
3. `RunOutput` 的输入判决、移动采样与 tick 状态历史随录制职责一起退出引擎。

### 阶段 6：删除旧机制

- 删除：`MessageRouter/`、`ControlBindingManager`、`ControllerRegistry`、`ControllerEventProjector`。
- 删除回调：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`。
- 删除 RPC：`bind` / `unbind` / `attach_controller_input` / `send_intent`。
- `Simulation.worker.ts` 的 `controllerInputReaders` 映射与 `lastStableState` 保留逻辑随之下线。
- 按分层表搬迁准入策略，删除 `GameEngine.ts:650` 的 `controlMode` 检查。
- `Member.submitControlInput` 的来源判定保留，引擎侧不再重复裁决。
- `RunOutput` 的输入判决与移动采样记录随录制职责一起退出引擎。

## 验收标准

- [ ] 输入端口与输出端口各一个 SAB；端口内状态区与事件区各有独立发布号，读取方按区各自重试
- [ ] 输入槽位内的状态与命令共用一个发布号，一次读取得到一致的（状态, 命令）视图
- [ ] 写入端不持有消费者名单：保留深度固定，落后即显形失败
- [ ] 槽位契约不携带设备事件、视点角与墙钟时间；方向为世界方向，步态为语义标签
- [ ] 输入 SAB 使用静态控制器槽位，控制器可在场景加载前创建、运行时可切换 `targetId`
- [ ] 状态区承载连续状态，事件区按追加顺序承载离散事实，两区各自发布
- [ ] 引擎不需要 `outputConsumers` 配置即可运行；没有消费者读取时照常运行
- [ ] 一次逻辑 Tick 只推进一次模拟时间，到期未交付即抛错
- [ ] 队列只接受严格晚于当前模拟时刻的入队时刻
- [ ] `World.tick` 分采样相与结算相，跨实体写入经阶段缓冲
- [ ] `GameEngine` 不解析 `targetId`、不访问成员运行时状态，只做命令转交
- [ ] `World.tick` 接收 `InputSnapshot`，承担控制器 / AI 输入选择
- [ ] 拦截点收敛为三层，来源授权只在 `Member` 判定一处
- [ ] `EventQueue` 归 `World`，不再持有引擎时间闭包
- [ ] 录制点在 `Member` 内唯一，控制器输入与 AI 输出走同一通路
- [ ] 事实记录以 `(simulationTimeMs, 同刻序号)` 为顺序键，不含 `tickIndex`
- [ ] `MessageRouter`、`ControlBindingManager` 及其相关 RPC 删除
- [ ] 引擎不持有任何外部回调

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 主线程与 Worker 的槽位偏移不一致 | 布局常量共享同一模块；每个端口各只做一次长度与布局版本校验 |
| 命令队列容量不足 | 显式失败：整个运行终止并对外报告 |
| 暂停期间命令区无消费者 | 读端口与推进模拟解耦：`pause` 时仍读端口并排空命令，但不推进模拟 |
| 事件区保留深度不足 | 显式失败，不静默覆盖；深度按重放所需的最长消费间隔固定配置 |
| 单 SAB 内事件区扩容会连带重新交接状态区 | 容量在场景装配时定死，运行中不重分配；切换场景本来就要重新交接全部缓冲区 |
| 移除 `maxEventsPerTick` 后单 Tick 工作量无上界 | 到期事实必须本 Tick 交付完毕；实测超预算时优化结算相，而不是重新引入跨 Tick 拆步 |
| 输入同步反馈消失影响控制器体验 | 控制器不需要回执；拒绝体现为动作未出现在成员执行序列里 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试 |

## 后续待定

- **控制器与渲染器的消息处理模块**：引擎出边已全部落在状态区与事件区；控制面（生命周期命令与结果、一次性变长查询、运行故障）仍走消息，这部分尚未设计。
- **界面侧数据捕获**：当前是定时拉取，计划改为与渲染器一致的循环读取；在引擎迭代完成后处理。
- **三条死路径的清理**：`submitExternalControlInput`（`GameEngine.ts:887`）、`setDomainEventSender`（`:175` 注释）、`setDamageExecutionHandlers`（`:184` 注释）均在注入点缺失的情况下保留了上层结构。其中 `services.executeInstantDamage` / `services.createDamageArea` 一旦被调用即抛错，说明伤害区的一半通路现在是死的。设计前需先理清哪些路径真实在用。

## 相关文档与 ADR

已更新：

- `docs/decisions/0052`（修订不变量 3：布局来源改为写入端静态决定；补充“分区不变量是发布独立而非缓冲独立”）
- `src/engine/core/GameEngine.md`（Tick 原子化、输出分两区、事实顺序、黑板管理）
- `src/engine/core/World/World.md`（Tick 分两相、阶段缓冲、队列契约、技能效果时序）
- `src/engine/document/README.md`（去掉已删除文档的引用，指向模块旁的模块架构文档）
- `src/engine/AGENTS.md`（通信角色表、线程间通道、阶段缓冲判据）
- `docs/decisions/0052`（布局来源改为写入端静态决定，已修订不变量 3）

已删除：`src/engine/document/通信协议表.md`。

待架构迭代完成后再处理 ADR：输入 / 输出端口的缓冲划分与区内独立发布；槽位内的语义动作值契约（世界方向、步态、连续序号，不含设备事件、视点与墙钟）；模拟时间留引擎、跨帧调度归 World；成员输入准入的三层拦截分层；Tick 原子化与队列契约；输出两区与事实顺序键；录制职责退出引擎。

与既有 ADR 的关系：0045（双端协议）保留，只去掉与生命周期无关的推送叙述；0050（通道分类）不变，本次结论与它一致；0052 的成员 / 区域连续状态成为状态区的内容；0055（共享实时时间轴）与模拟时间归属不是同一问题，无需改动。0043（行动录制从最终输入记录派生）需要重审：录制对象已从输入记录变为 FSM 实际消费的事实序列。
