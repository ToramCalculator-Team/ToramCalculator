# 0007 - 下一技能消耗修正契约

- **状态**: Proposed
- **日期**: 2026-06-01
- **决策层**: 跨层
- **相关代码**: `src/lib/engine/core/World/Member/MemberBaseSchema.ts`、`src/lib/engine/core/Pipeline/builtInBinaryOpPipelines.ts`、`src/lib/engine/core/World/Member/types/Player/PlayerStateMachine.ts`
- **相关 ADR**: 0003

## 背景

“下一技能 MP 消耗减半”是一种一次性修正。`skill.cost` 会在检查和实际扣费前运行，若管线自己清理修正，会在检查阶段提前消费；若修正挂在 `buff.*`，计算路径又会被来源类型污染。

## 候选方案

### A. 使用 buff.nextSkillCost 属性槽

- 优点：贴近技能文本中的“状态”。
- 缺点：计算契约依赖来源类型，其他来源难以复用。

### B. 临时安装一次性 pipeline overlay

- 优点：直接复用 pipeline 扩展点。
- 缺点：安装、叠加、checkpoint 和消费时机都需要额外协议。

### C. 使用消费点属性槽 skill.nextCost.mpCostRate

- 优点：按消费点命名，来源通过 `sourceId` 区分；管线保持纯计算，FSM 负责成功扣费后的消费。
- 缺点：基础 schema 增加保留域；当前只定义加法倍率和前缀级清理。

## 决议

选 C：**使用 `skill.nextCost.mpCostRate` 表达下一次成功技能扣费的 MP 倍率修正。**

核心约束：

1. 槽基础值为 `0`，半耗写入 `-0.5`，与默认倍率 `1` 相加得到 `0.5`。
2. 写入方使用稳定 `sourceId`，不把来源类型编码进属性路径。
3. `skill.cost` 只读取并计算，不执行清理或派发事件。
4. Player FSM 只在实际扣费成功后清理 `skill.nextCost` 前缀。

## 代价

- `skill.nextCost.*` 成为引擎保留命名空间。
- 倍率暂定为加法修正；乘法叠加需另立契约。
- 前缀级消费会同时清理该域下的所有一次性修正。

若出现多次消费、按来源分批消费或可见状态展示需求，应重新评估当前槽和清理粒度。

## 影响范围

- 成员基础 schema、`skill.cost` 和 Player FSM 必须共享这套消费语义。
- 技能、装备、被动等来源都通过 `sourceId` 写入同一消费点槽。

## 参考

- ADR 0003：技能消耗作为 Pipeline 契约
