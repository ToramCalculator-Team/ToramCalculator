# Member 控制模式与行为序列迁移计划

- **状态**: 执行中
- **日期**: 2026-08-16
- **相关决策**: ADR 0032、0043、0046、0050、0053；待新增 ADR 0054
- **前置提交**: 073afe8b

## 目标

把成员控制收敛为两种互斥模式：

```text
controlled：外部控制器是唯一输入源
ai：Member 持有的 AI 行为树是唯一输入源
```

控制器与 AI 行为树提交同一种控制输入，FSM 即时裁决，裁决结果追加到行为序列记录。序列只记录，不反向作为 FSM 的输入队列。

同时收敛 BtManager：

```text
activeEffectEntry = 技能效果 BT
parallelEntries   = buff / passive BT
AI 行为树         = Member 字段，不属于 BtManager
```

## 已确认决策基线

1. Player 默认 `controlled`；配置了成员流程时初始模式为 `ai`。
2. Mob 默认 `ai`。
3. `ai -> controlled` 时 AI 行为树暂停；`controlled -> ai` 时恢复。
4. `ai` 模式下外部控制器意图直接拒绝。
5. 连续移动录制为独立移动段，每逻辑 Tick 一个样本；移动段在移动停止、输入源切换或模式切换时封闭。释放技能、跳跃不封闭移动段。
6. AI 行为树内容与控制器输出等价，只提交控制输入，不使用 `state` action。
7. 行为序列复用 `RunOutputRecorder.inputs` 作为权威记录，不新增第二份并行记录。

## 目标架构

```text
controlled 模式:
  控制器
    -> Member 控制输入入口
    -> FSM 裁决
    -> RunOutputRecorder.inputs

ai 模式:
  Member.aiBehaviorTree
    -> Member 控制输入入口
    -> FSM 裁决
    -> RunOutputRecorder.inputs
```

移动输入：

```text
controlled 实时:
  键盘/手柄 -> 移动 SAB -> 每 Tick 采样 -> 推进成员
  采样同时追加到当前 MovementBehaviorRecord.samples

ai / 回放:
  Member.aiMovementBehavior
    -> 按逻辑时间取当前样本
    -> MemberMovementInput
    -> 推进成员
```

BtManager：

```text
activeEffectEntry:
  技能效果 BT
  唯一允许使用 action [animation, ...] 声明语义动作阶段的 BT

parallelEntries:
  passive:* BT
  buff / 长周期效果 BT
  不再包含 member-flow
```

## 阶段 0：建立 ADR 0054

本迁移改变成员输入权威、BtManager 生命周期和运行产出契约，必须先新增 ADR。

- 决策问题：成员控制输入源如何收敛为单源，行为序列是什么，AI 行为树归属在哪里。
- 预期关系：
  - `Depends on 0050`：连续移动继续走 latest-state SAB。
  - `Refines 0032`：resolvedBehavior 只在 ai 模式被 Member 执行。
  - `Refines 0043`：行为序列继续从最终输入记录派生。
  - `Refines 0053`：视觉状态只来自 FSM 与 active effect BT。
- ADR 通过后再开始阶段 1。

## 阶段 1：契约与类型

- [x] 新增 `MemberControlMode = "controlled" | "ai"`。
- [x] Member 根据 `resolvedBehavior` 是否存在推导控制模式：存在则 `ai`，为空则 `controlled`；场景解析不再额外增加模式字段。
- [x] 删除 `MANUAL_IDLE_BEHAVIOR` 伪行为树；`controlled` Player 不需要 AI 行为树。
- [x] 定义 `MovementBehaviorRecord`：

```ts
interface MovementBehaviorSample {
  direction: { x: number; z: number };
  intensity: number;
}

interface MovementBehaviorRecord {
  kind: "movement";
  memberId: string;
  startTimeMs: number;
  samples: MovementBehaviorSample[];
  source: "controller" | "ai";
}
```

- [x] `EngineRunOutput` 增加 `movementBehaviors: MovementBehaviorRecord[]`，与 `inputs` 平行。
- [x] 定义输入源拒绝原因：

```text
control_source_not_active
```

## 阶段 2：统一控制输入入口

- [x] 把 `Member.submitControlInput` 改为唯一输入入口，参数包含来源：

```ts
submitControlInput(event: MemberControlEvent, source: MemberControlMode): void
```

- [x] 入口内先检查 `source === member.controlMode`，不匹配时：
  - 记录拒绝事实到 `RunOutputRecorder`。
  - 不向 FSM 发送事件。
- [x] 匹配时保持现有顺序：先登记 pending 输入，再同步发送 FSM 事件。
- [x] `MessageRouter` 不再直接 `actor.send`；控制器意图经 EventQueue 到达 Member 后调用统一入口。
- [x] `GameEngine.processIntent` 只负责输入窗口和 RPC 成功语义，不在外部控制器路径重复记录输入。
- [x] AI 行为树的 `submitControlInput` 走同一入口，不经过 MessageRouter。

## 阶段 3：AI 行为树移到 Member

- [x] 新增 `AiBehaviorRuntime`，由 Member 持有：

```ts
class AiBehaviorRuntime {
  mode: "running" | "paused";
  step(): void;
  pause(): void;
  resume(): void;
  isRunning(): boolean;
}
```

- [x] 移除 `Member` 构造时的：

```ts
btManager.registerParallelBt("member-flow", ...)
```

- [x] Player/Mob 构造时根据 `resolvedBehavior` 是否存在创建或跳过 AI 行为树。
- [ ] AI 行为树 bindings 只暴露控制输入动作，不暴露 `state` action：

```text
selectTarget
castSkill
waitUntilActionSettled
其他后续确认的控制动作
```

- [x] 模式切换：

```text
controlled -> ai：恢复已有 AI 行为树；没有则按 resolvedBehavior 创建。
ai -> controlled：暂停 AI 行为树，保留当前 BT 节点状态。
```

- [x] `ai` 模式下 `MessageRouter` 对控制器意图返回 `control_source_not_active`，不进入 FSM。
- [x] `Member.tick` 只在 `controlMode === "ai"` 时 step AI 行为树。

## 阶段 4：移动行为录制与回放

- [x] Worker 每逻辑 Tick 在采样控制移动后，将 `MemberMovementInput` 追加到当前移动段。
- [x] 移动段开始条件：

```text
当前无移动段，且本 Tick movement 非 null
```

- [x] 移动段封闭条件：

```text
1. movement 从非 null 变为 null
2. member.controlMode 切换
3. 输入源从 controller 切换为 ai，或反向
```

- [x] 释放技能、跳跃、格挡、闪躲不封闭移动段；FSM 决定这些时段是否消费移动样本。
- [x] 移动段样本按逻辑 Tick 顺序追加，不按渲染帧追加。
- [x] `ai / 回放` 模式新增行为移动源：

```ts
sampleIndex = floor((currentTimeMs - movementRecord.startTimeMs) / logicStepMs)
```

- [x] 越界样本视为 `movement = null`。
- [x] 现有移动 SAB 保持不变：只服务 `controlled` 实时模式；录制读取当前采样结果，回放不经过 SAB。

## 阶段 5：BtManager 收敛

- [x] 删除 `BtManager` 中 `member-flow` 特殊分支：

```text
isSteppingMemberFlow
clearMemberFlowStateDeclaration
steppingContext: "member-flow"
```

- [x] `Member` 删除 `memberFlowStateDeclaration`。
- [x] `state` action 只允许 active effect BT 调用。
- [x] 状态投影器只组合：

```text
FSM 状态 + active effect BT 状态声明
```

- [x] `parallelEntries` 只允许注册 buff / passive BT；成员 AI 不再进入该容器。

## 阶段 6：录制行为编译与场景解析

- [x] `recordedBehavior.ts` 同时编译离散输入与移动段：

```text
inputs -> AI 离散行为树
movementBehaviors -> AI 移动段数组
```

- [x] `resolveEngineScenario` 不再为 controlled Player 注入 `manual-idle`；有 `member.behavior` 时输出 `resolvedBehavior`，否则输出 `null`。
- [x] Character 预览行为显式使用 `ai` 初始模式。
- [x] Mob 场景解析保持 `resolvedBehavior` 来自 `mob.actions`，但注册位置改为 Member AI runtime。

## 阶段 7：停止策略与旧路径清理

- [x] `untilMemberFlowEnds` 替换为 `untilMemberAiBehaviorEnds` 或等价停止策略。
- [x] `GameEngine` 中基于 `isParallelBtRunning("member-flow")` 的判断全部移除。
- [x] 删除 `member-flow` 相关测试替身与命名。
- [ ] 删除 `MemberController.move / stopMove` 在录制中的离散 `移动 / 停止移动` 路径；移动由移动段承载。
- [x] 更新协议测试、EngineService 测试、executeSimulationTask 集成测试和 simulatorSession 测试。

## 验证与完成条件

- [x] `pnpm typecheck` 通过。
- [x] `pnpm test` 全部通过。
- [x] `pnpm biome check src/ db/` 无新增 error；既有 Mob FSM 占位参数 warning 不恶化。
- [x] ADR 审计 0 errors。
- [ ] 验证 controlled 玩家实时技能、AI 玩家自动技能、Mob AI 均只有一条输入路径。
- [ ] 验证 `ai` 模式下控制器输入被拒绝且被记录。
- [ ] 验证 `controlled -> ai -> controlled` 切换时 AI 行为树暂停并恢复，不丢失当前节点状态。
- [x] 验证移动段在停止、切源、切模式时封闭；释放技能和跳跃不封闭。
- [x] 验证回放时每逻辑 Tick 读取一个移动样本，采样索引与逻辑时间一致。
- [x] 验证 SAB 路径仅服务 controlled 实时移动，录制与回放不创建第二套移动通道。

## 明确不做

- 不让行为序列反向调度 FSM。
- 不让 AI 行为树使用 `state` action。
- 不让 parallelEntries 继续承载成员 AI。
- 不为移动样本引入新的 SAB 通道。
- 不在本计划内完成技能效果 BT 子树化或动作编排链迁移。
