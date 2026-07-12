# 0003 - 技能消耗作为 Pipeline 契约

- **状态**: Accepted
- **日期**: 2026-05-15
- **决策层**: 跨层
- **相关代码**: `src/lib/engine/core/Pipeline/builtInBinaryOpPipelines.ts`、`src/lib/engine/core/World/Member/types/Player/PlayerStateMachine.ts`

## 背景

技能释放需要统一计算、校验并扣除 HP/MP 消耗。消耗还会被 passive、buff 和状态修正，因此不能由 FSM 直接读取固定字段，也不能依赖每棵技能行为树自行扣费。

## 候选方案

### A. FSM 直接计算并扣除

- 优点：实现直接，扣费靠近释放状态。
- 缺点：缺少统一扩展锚点，UI 检查和实际扣费容易形成多套算法。

### B. 行为树负责扣费

- 优点：技能作者能控制扣费时机。
- 缺点：每棵树都必须正确实现基础消耗，失败和中断路径难以统一。

### C. skill.cost Pipeline 计算，FSM 校验并写回

- 优点：消耗修正有稳定 overlay 锚点；同一结果可用于可用性检查和实际扣费；沿用“管线计算、FSM 写回”的既有边界。
- 缺点：形成长期跨层契约；复杂条件需要额外表达；管线不能承载一次性副作用。

## 决议

选 C：**基础消耗进入 `skill.cost` Pipeline 计算，Player FSM 使用同一输出完成资源检查和属性写回。**

`skill.cost` 必须保持纯计算。消耗成功、施法完成等一次性事实由 FSM 在释放被接受后发布，不允许由 pipeline overlay 产生副作用。

## 代价

- `skill.cost` 的锚点和字段名成为长期兼容契约。
- 复杂的技能、状态组合需要通过条件 overlay、表达式或编排事件补充。
- 基础消耗表达式仍由 FSM 提供给管线，FSM 会继续知道技能消耗字段。

## 影响范围

- 技能可用性检查、实际扣费和 UI 预览应复用同一消耗结果。
- passive、buff 和装备对技能消耗的修正统一挂在 `skill.cost`。
- `StatContainer` 的实际写回仍属于 FSM 编排职责。

## 参考

- `src/lib/engine/document/hook与触发层设计讨论结论.md`
