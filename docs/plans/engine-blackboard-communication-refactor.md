# 引擎黑板通信架构重构计划

**状态**: 待执行  
**预计工作量**: 3-5 天  
**核心决策**: 快照模式；SAB 结构由写入者架构决定；模拟时间留在引擎；跨帧调度归 World

## 问题诊断

1. **引擎持有外部回调**：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`，违反"引擎是黑盒模拟器"的定位。
2. **运行时绑定管理复杂**：`ControlBindingManager` 维护 controllerId → memberId，需要 `bind/unbind` RPC，控制器必须等引擎就绪才能绑定。
3. **通信机制不一致**：连续状态走 SAB，离散事件走推送回调，遥测走定时推送。
4. **输入黑板布局依赖成员列表**：需要运行时计算布局，控制器无法在场景加载前创建，切换控制对象需要改槽位。
5. **拦截点分散**：来源授权在 `GameEngine.processIntent`（查 `controlMode`）和 `Member.submitControlInput`（查 `behaviorMode`）各判一次，后者静默丢弃、判决不可观测。
6. **断链**：`GameEngine.ts:887` 调用 `member.submitExternalControlInput`，但 `Member` 上只有 `submitControlInput(event, source)`；`"manual"` 分支无任何调用方。

## 核心原则

### 1. 写入者决定 SAB 结构，读取者固定解析

两个 SAB 遵循同一模式：**架构静态、数据动态、双方独立按预定义规则解析，不做运行时协商。**

| SAB | 结构决定者 | 读取者 | 解析规则 |
|-----|-----------|--------|---------|
| 输入 | 控制器架构 | 引擎 | 固定槽位偏移 |
| 输出 | 引擎架构 | 渲染器 / UI | 固定头部 + 动态数组 |

### 2. 快照模式

每 tick 从输入 SAB 生成不可变 `InputSnapshot`，向输出 SAB 写入完整 `OutputSnapshot`。引擎不持有外部回调。

参考：Bevy `Input<T>` 资源、Unity DOTS `InputData` singleton、GGPO 帧输入快照。

### 3. 模拟时间归引擎，World 只接收

`tickIndex` / `currentTimeMs` 留在引擎，理由：

- 时间推进是**条件性**的（`GameEngine.ts:955-963`）：仅当 `hasPendingEvents === false` 且 `pendingTickTasks === 0` 时才前进。这两个条件都是引擎级计数，搬到 World 会在两处各存一半决策状态。
- World 现在本来就没有时间字段，只在参数里收 `SimulationTickContext`。
- `EngineCheckpoint` 已经同时装 `tickIndex` / `currentTimeMs` / `world` 并一起恢复，无需改结构。

World 需要的能力只有一项：**能基于本 tick 的 `currentTimeMs` 把相对延迟换算成绝对模拟刻度**，因为队列按该刻度分桶。它从 `World.tick(tick, ...)` 的第一个参数取，不需要自己推进或存储时间。

### 4. 目标架构

```
┌──────────────────── 主线程 ────────────────────┐
│  控制器 A（槽位 0）              渲染器 / UI     │
│   写 targetId + 意图              读完整世界状态 │
└────────┬──────────────────────────────┬────────┘
         ↓ 写                          ↓ 读
    [输入 SAB: 控制器槽位]      [输出 SAB: 世界状态]
         ↑                              ↑
         │ 生成快照                      │ 写入快照
┌────────┴──────────────────────────────┴────────┐
│ Worker                                          │
│  GameEngine.stepTick() {                        │
│    input = InputSnapshot.fromBuffer(inputSAB)   │
│    for (cmd of input.commands)                  │
│      dispatchMemberEvent(cmd)      // 命令转交   │
│    world.tick(context, input)      // 传快照     │
│    OutputSnapshot.fromEngine(this)              │
│      .writeToBuffer(outputSAB)                  │
│  }                                              │
│                                                 │
│  World.tick(context, inputSnapshot) {           │
│    按 targetId 取成员意图，回退 AI 采样          │
│    member.tick(context, movementInput)          │
│  }                                              │
└─────────────────────────────────────────────────┘
```

同一份快照交给两个消费者，各取所需：

```
InputSnapshot
      ├── commands ──→ GameEngine.dispatchMemberEvent() → EventQueue
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
  movement: { direction: { x: number; z: number }; intensity: number };
  commandQueue: MemberControlCommand[];
}
```

布局不含成员信息，所以**不需要计算**：控制器可在场景加载前创建，切换控制对象只需重写 `targetId`。运行时新增控制器只要不超过 `maxControllers`。

### 输出 SAB：完整世界状态

```typescript
// src/engine/core/OutputSnapshot.ts
export class OutputSnapshot {
  constructor(
    readonly members: readonly MemberState[],
    readonly areas: readonly AreaState[],
    readonly events: readonly DomainEvent[],
    readonly telemetry: EngineTelemetry,
    readonly tickIndex: number,
    readonly simulationTimeMs: number,
  ) {}
}
```

头部固定（`tickIndex` / `simulationTimeMs` / 各数组长度与偏移），后接三个动态数组加定长遥测。引擎不知道谁在读；渲染器读 `members` / `areas`，UI 读 `events`，调试读 `telemetry`。**不引入 `outputConsumers` 配置。**

### 拦截点分三层，每层只问一个问题

| 层 | 位置 | 唯一职责 | 判定依据 |
|----|------|---------|---------|
| 运行级 | 引擎 | 这次运行是否接受外部输入 | `acceptExternalIntents`、输入窗口（`runOutput.isRecording()`） |
| 授权级 | Member | 该成员现在听哪个来源 | `behaviorMode` vs `source`，**唯一一处** |
| 合法性 | FSM | 该成员此刻能否执行该动作 | guard + `movement-input-enabled` 等标签 |

要点：

- 删除 `GameEngine.processIntent` 里的 `controlMode` 检查（`GameEngine.ts:650`）。控制模式的权威在成员自身：`setBehaviorMode` 会同步 `pause()` / `resume()` 它的 AI 行为树，引擎持有的是副本。
- `Member.submitControlInput` 的判定必须**产生可观测判决**，不能保持 `log.warn` + `return` 的静默丢弃——那会让 `RunOutput` 留下永不判决的 pending input，正是 `GameEngine.ts:825` 的 `hasPendingInput` 兜底在补救的情况。
- FSM 状态合法性留在 FSM，继续走 `skill_input_accepted` / `skill_input_rejected` 一类域事件。
- 全部输入判决走输出侧异步通路，因为黑板设计下没有同步返回值可用。

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
| 输入录制（`appendInput` / `acceptInput` / `rejectInput`） | 跟随准入判决搬迁 |
| `MessageRouterStats` 与 `send_intent` RPC | 删除 |

生命周期 RPC（`load_scenario` / `start` / `pause` / `resume`）不是成员输入，保留。

- **闭包时间源必须删除**：`EventQueue` 现在持有 `() => this.currentTimeMs`（`EventQueue.ts:27, 65`）。搬进 World 后若保留，等于 World 通过函数指针读引擎私有可变状态——比参数传递更耦合且不可见。`getDue` / `removeProcessedDue` 已收参数，只剩 `createSnapshot()` 走闭包，改为 `createSnapshot(currentTimeMs: number)`。

- **两条入队入口**需要区分（都归 World，区别只在时间锚点来源）：
  - tick 内派发：基于 `World.tick` 收到的 `currentTimeMs`。下放后 `instantDamageScheduler` 回调（`World.ts:53` 第三参数）不再需要。
  - tick 外注入（外部 RPC）：由引擎带上自己的 `currentTimeMs` 转给 World。

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

1. `InputLayout.ts` 定义 `INPUT_LAYOUT` 与 `ControllerInputSlot`。
2. `InputSnapshot.fromBuffer(buffer)` 遍历槽位，跳过未启用项；提供 `groupByTarget()` 供 World 使用。
3. `InputBufferWriter` 提供 `writeTargetId` / `writeMovement` / `writeCommand` / `enable`。
4. `GameEngine.setInputBuffer(buffer)` 只校验 `byteLength >= INPUT_LAYOUT.totalSize`，不做布局计算。
5. `GameEngine.stepTick()` 生成快照 → 转交 `commands` → `world.tick(context, inputSnapshot)`。
6. `MemberController` 改为 `(controllerId, inputBuffer)` 构造，`setTarget` 只重写 `targetId`。

### 阶段 3：输出快照

1. `OutputSnapshot.fromEngine(engine)` 收集成员、区域、本帧事件与遥测。
2. `writeToBuffer` / `fromBuffer` 实现固定头部 + 动态数组编解码。
3. `GameEngine.setOutputBuffer(buffer)` 不依赖任何消费者配置。
4. 渲染器 / UI 各自 `OutputSnapshot.fromBuffer` 后按需取用。

### 阶段 4：World 接手调度与输入应用

1. `World` 构造 `EventQueue`，删除 `timeGetter` 闭包。
2. `World.tick` 接收 `InputSnapshot`，按 `targetId` 应用控制器意图；无意图的成员回退 `sampleAiMovementInput`。
3. 成员控制输入统一走 `member.submitControlInput(event, "manual")`——修复当前断链，`"manual"` 分支由此获得唯一调用方。
4. `WorldCheckpoint` 吸收 `eventQueue`；`EngineCheckpoint` 移除该字段。
5. 删除 `instantDamageScheduler` 回调，伤害段直接入队。

### 阶段 5：删除旧机制

- 删除：`MessageRouter/`、`ControlBindingManager`、`ControllerRegistry`、`ControllerEventProjector`。
- 删除回调：`systemMessageSender`、`controllerMovementInputSource`、`realtimeStateCommitCallback`。
- 删除 RPC：`bind` / `unbind` / `attach_controller_input` / `send_intent` / `engine_telemetry` / `domain_event_batch`。
- `Simulation.worker.ts` 的 `controllerInputReaders` 映射与 `lastStableState` 保留逻辑随之下线。
- 按分层表搬迁准入策略，删除 `GameEngine.ts:650` 的 `controlMode` 检查。
- `Member.submitControlInput` 的来源判定改为产出可观测判决。

## 验收标准

- [ ] 输入 SAB 使用静态控制器槽位，控制器可在场景加载前创建、运行时可切换 `targetId`
- [ ] 输出 SAB 是完整世界状态，引擎不需要 `outputConsumers` 配置即可运行
- [ ] `GameEngine` 不解析 `targetId`、不访问成员运行时状态，只做命令转交
- [ ] `World.tick` 接收 `InputSnapshot`，承担控制器 / AI 输入选择
- [ ] 拦截点收敛为三层，来源授权只在 `Member` 判定一处
- [ ] 任何输入拒绝都产生可观测判决，无静默丢弃
- [ ] `EventQueue` 归 `World`，不再持有引擎时间闭包
- [ ] `MessageRouter`、`ControlBindingManager` 及其相关 RPC 删除
- [ ] 引擎不持有任何外部回调

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 主线程与 Worker 的槽位偏移不一致 | 布局常量共享同一模块；场景加载时校验 SAB 长度与 `version` |
| 命令队列容量不足 | 初始 1024；溢出记录诊断日志并纳入输出遥测 |
| 输入同步反馈消失影响控制器体验 | 输入判决走输出侧异步通路，`inputId` 全链路保留 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试 |

## 相关文档与 ADR

需要更新：

- `src/engine/core/GameEngine.md`（快照模式、时间归属）
- `src/engine/core/World/World.md`（接收快照、持有 EventQueue）
- `src/engine/document/README.md`

需要删除：

- `src/engine/document/通信协议表.md`（已被黑板通信模型取代）

需要新建 ADR（至少覆盖以下决策）：

- 输入 / 输出 SAB 的写入者决定结构原则
- 模拟时间留引擎、跨帧调度归 World
- 成员输入准入的三层拦截分层
- 删除 `MessageRouter` 与同步意图返回值

与既有 ADR 的关系：0045（双端协议）的推送部分被取代；0050 扩展到全部输出；0052 的世界状态成为输出快照的一部分；0055（共享实时时间轴）需要复核时间归属表述。
