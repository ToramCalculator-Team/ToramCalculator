# 0003 - 技能消耗作为 Pipeline 契约

- **状态**: Proposed
- **日期**: 2026-05-15
- **决策层**: 跨层
- **相关代码**: `src/lib/engine/core/Pipeline/builtInBinaryOpPipelines.ts`、`src/lib/engine/core/World/Member/types/Player/PlayerStateMachine.ts`

## 背景

Simulator 中玩家释放技能后 MP 没有变化。排查结果显示玩家 FSM 在施法前只校验 `hpCost` / `mpCost`，释放被接受后没有把消耗写回 `StatContainer`。

技能消耗不是固定字段读取。后续规则会影响消耗结果，例如减半、免耗、HP 代偿、MP 不足触发被动、消耗值参与命中或仇恨计算。

现有引擎已经用 Pipeline 承载可被 overlay 修正的纯计算规则。`applyDamage` 的模式是管线输出结果，FSM 负责写回属性。

## 候选方案

### A. FSM 直接计算并扣除消耗

FSM 读取当前技能变体，求值 `hpCost` / `mpCost`，校验通过后直接写回 `hp.current` / `mp.current`。

- 优点：改动范围小，扣费位置贴近技能释放状态迁移。
- 缺点：缺少 overlay 锚点，passive / buff 无法统一修正消耗；UI 预览、可用性检查、实际扣费容易出现多套计算路径。

### B. 行为树动作负责扣除消耗

把扣费作为技能 BT 的通用动作或技能逻辑作者显式调用的动作。

- 优点：技能作者可以在技能逻辑里控制扣费时机。
- 缺点：基础消耗会依赖每个技能 BT 正确调用；BT 当前只读消费技能上下文，承担扣费会扩大 BT 写入职责；失败或中断路径难以统一处理。

### C. `skill.cost` Pipeline 计算，FSM 校验并写回

FSM 预求值技能变体上的基础消耗表达式，把 `baseHpCost` / `baseMpCost` 交给 `skill.cost` 管线。管线输出最终 `hpCost` / `mpCost`，FSM 用同一结果完成可用性检查和属性写回。

- 优点：消耗修正有稳定 overlay 锚点；FSM 保留状态迁移和写回职责；模式与 `applyDamage` 一致；同一结果可被 UI、守卫、扣费复用。
- 缺点：新增一个跨层契约；管线输入需要携带技能上下文；复杂的非数值分支要通过 `eval` 或编排层事件表达；`skill.cost` 会在施法检查阶段运行，overlay 不能在该管线里派发一次性事件。

## 决议

选 C。

理由：

1. 技能消耗属于可被 passive / buff / status 改写的计算规则，需要进入 Pipeline 才有统一插入点。
2. FSM 是技能释放是否成立的编排者，继续负责检查资源和写回 `StatContainer`。
3. `skill.cost` 的输出能同时服务可用性检查和实际扣费，减少同一消耗规则在多个位置重复实现。
4. `applyDamage` 已经采用“管线算结果，FSM 写回”的边界，技能消耗沿用该边界能减少第二套模式。
5. `skill.cost` 管线保持无事件副作用；消耗成功、施法完成等一次性事件由 FSM 在释放被接受后发出。

## 代价

`skill.cost` 成为长期契约，锚点命名需要维护兼容。后续 passive 如果依赖 `baseHpCost`、`mpCostRate`、`mpCost` 等 target，重命名会影响它们。

Pipeline 当前以数值计算为主。按技能树、技能 ID、状态组合做复杂分支时，需要通过 `eval`、overlay 条件或编排层事件补充表达能力。

`skill.cost` 会在施法检查和实际扣费前各运行一次。带副作用的 overlay 会重复触发，所以该管线的 overlay 只能修改数值。

基础消耗表达式仍由 FSM 预求值。这样保留了现有数据库字段语义，但让 FSM 继续知道技能变体字段名。

## 影响范围

- 代码层面：`BuiltInBinaryOpPipelines` 新增 `skill.cost`；Player FSM 的资源检查和扣费改为读取该管线输出。
- 文档层面：Pipeline catalog 多一个技能消耗契约，后续消耗类 passive / buff 应优先挂 `skill.cost`。
- 迁移：已有直接求值逻辑收敛为基础消耗输入；实际扣除仍发生在 FSM。

## 参考

- `src/lib/engine/document/hook与触发层设计讨论结论.md` 中 Pipeline / overlay 作为 hook 通路的讨论。
