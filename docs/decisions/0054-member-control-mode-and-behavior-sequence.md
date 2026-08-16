# 0054 - 成员控制模式与行为序列

- **状态**: Accepted
- **日期**: 2026-08-16
- **决策层**: 跨层（引擎 / 输入 / 运行记录 / 场景解析）
- **相关代码**: `src/engine/core/World/Member/`、`src/engine/core/GameEngine.ts`、`src/engine/core/runOutput.ts`、`src/features/simulator/preview/`
- **相关 ADR**: Depends on 0050；Refines 0032；Refines 0043；Refines 0053

## 决策问题

成员同时可能被外部控制器和 AI 行为树驱动。两者当前都直接向 FSM 提交控制输入，形成多源竞争；成员 AI 行为树还作为 `member-flow` 注册在 BtManager 的 parallel 槽中，与 buff/passive BT 共用生命周期。需要决定成员控制输入的唯一入口、模式切换语义、行为序列的定位，以及 AI 行为树的归属。

## 决策驱动

- 控制器输入具有时效性，不能先进入队列等待 FSM 空闲后再消费。
- 同一成员同一时刻只应有一个有效控制输入源。
- 行为序列是运行记录，不应反向驱动 FSM。
- BtManager 的 parallel 槽语义应是 buff/passive，不应承载成员 AI。
- 连续移动是逐 Tick 控制状态，必须和离散控制输入分开记录。

## 候选方案

### A. 行为序列作为 FSM 输入队列

控制器先把指令写入序列，FSM 按 tick 轮转消费。

- 优点：输入来源单一。
- 缺点：控制器输入失去时效性；忙时输入会被错误延迟；序列同时承担记录和调度职责。

### B. 控制器与 AI 继续各自直接驱动 FSM

- 优点：改动小。
- 缺点：多源竞争继续存在；AI 行为树继续寄生在 parallel BT 槽；输入记录路径不统一。

### C. 成员控制模式 + 唯一输入入口 + 序列只记录

成员处于 `controlled` 或 `ai` 模式，任一时刻只有一个输入源；控制器和 AI 行为树通过同一入口提交控制输入，FSM 即时裁决，裁决结果进入行为序列记录；AI 行为树由 Member 持有。

- 优点：输入时效性保留；输入路径唯一；BtManager 职责收敛；序列语义单一。
- 缺点：需要新增模式门控和 AI 行为树运行时；现有 `member-flow` 路径需要迁移。

## 决议

选择 C：**成员具有 `controlled / ai` 两种互斥控制模式；控制器与 AI 行为树通过 Member 的统一控制输入入口提交输入，FSM 即时裁决，`RunOutputRecorder.inputs` 继续作为行为序列权威记录；AI 行为树由 Member 持有，不进入 BtManager。**

确立以下不变量：

1. 任一 Member 任一 Tick 只有一个有效输入源：`controlled` 模式只接受控制器，`ai` 模式只接受 AI 行为树。
2. 控制器输入不进入行为序列队列等待消费；它直接到达 FSM，FSM 裁决后写入行为序列。
3. 行为序列复用 `RunOutputRecorder.inputs`，不新增第二份并行记录；序列不反向驱动 FSM。
4. AI 行为树存储在 Member 上，通过 `AiBehaviorRuntime` 执行；其内容与控制器输出等价，不使用 `state` action。
5. `BtManager.activeEffectEntry` 只承载技能效果 BT；`BtManager.parallelEntries` 只承载 buff/passive BT；`member-flow` 槽位删除。
6. 视觉状态只来自 FSM 状态和 active effect BT 的状态声明。
7. `ai -> controlled` 时 AI 行为树暂停并保留当前节点状态；`controlled -> ai` 时恢复。
8. `ai` 模式下外部控制器意图被拒绝，拒绝原因记录为 `control_source_not_active`。
9. 连续移动录制为独立移动段，每逻辑 Tick 一个样本；移动段只在移动停止、输入源切换或控制模式切换时封闭，技能、跳跃不封闭移动段。
10. 移动段进入 `EngineRunOutput.movementBehaviors`；实时移动继续使用 latest-state SAB，录制与回放不新增 SAB 通道。

## 代价

- 需要为每个成员维护控制模式，并处理切换、暂停和恢复。
- 移动段按逻辑 Tick 采样，长运行记录体积增长。
- `untilMemberFlowEnds` 等停止策略和现有测试需要迁移。
- AI 行为树从 BtManager 拆出后，其 agent 支持、checkpoint 和停止策略需要独立维护。

## 重新评估条件

- 需要同时接受控制器和 AI 输入，而不只是模式切换。
- 移动段体积在代表性运行中超过预算，需要压缩或改变采样频率。
- 行为序列需要在运行结束后继续被成员生命周期使用。
- AI 行为树需要 checkpoint 完整节点状态，而不仅是暂停/恢复。
- 外部控制器需要跨进程、跨设备或远程消费。

## 参考

- [ADR 0050：实时状态的传输语义分类](./0050-realtime-state-transport-semantics.md)
- [ADR 0032：按成员类型解析成员流程与 Mob 固有 AI](./0032-resolve-member-flow-and-intrinsic-mob-ai-by-type.md)
- [ADR 0043：行动录制从最终输入记录派生](./0043-derive-recorded-actions-from-final-inputs.md)
- [ADR 0053：成员逻辑状态输出与渲染映射边界](./0053-logical-state-output-and-render-mapping.md)
- [Member 控制模式与行为序列迁移计划](../plans/member-control-mode-behavior-sequence-migration.md)
