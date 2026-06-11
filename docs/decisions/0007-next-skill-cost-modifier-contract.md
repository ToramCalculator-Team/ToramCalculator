# 0007 - 下一技能消耗修正契约

- **状态**: Proposed
- **日期**: 2026-06-01
- **决策层**: 跨层
- **相关代码**:
  - `src/lib/engine/core/World/Member/MemberBaseSchema.ts`
  - `src/lib/engine/core/Pipeline/builtInBinaryOpPipelines.ts`
  - `src/lib/engine/core/World/Member/runtime/Agent/CommonActions.ts`
  - `src/lib/engine/core/World/Member/types/Player/PlayerStateMachine.ts`
- **相关 ADR**: 0003

## 背景

`法術/衝擊波` 施放成功后会赋予“魔能調節”状态，使下一个技能的 MP 消耗减半。

`skill.cost` 管线会在施法检查和实际扣费前各运行一次。一次性消耗修正如果在管线里清理，会在检查阶段被提前消费；如果挂在 `buff.*` 数据域，会把来源类型写进计算路径，后续托环、被动、装备提供的下一技能消耗修正会被迫复用 buff 命名。

## 候选方案

### A. 生成一个 `buff.nextSkillCost.mpCostRate` 槽

把魔能調節作为 buff 数据，`skill.cost` 读取 `buff.nextSkillCost.mpCostRate`。

- 优点：
  - 与技能文本中的“状态”措辞接近。
  - 只需给冲击波行为树声明一个槽。
- 缺点：
  - 计算路径被来源类型污染。
  - 其他来源的下一技能消耗修正缺少自然位置。
  - `skill.cost` 全局读取该槽时，未声明该槽的成员会产生缺失属性告警。

### B. 在 `skill.cost` 上安装一次性 pipeline overlay

冲击波施放后临时插入 overlay，把 `mpCostRate` 改为半耗，扣费后移除 overlay。

- 优点：
  - 直接复用 `skill.cost` overlay 机制。
  - 不需要新增属性槽。
- 缺点：
  - overlay 是管线结构修正，频繁安装和卸载会影响 resolver 缓存。
  - 叠加、刷新、checkpoint 需要单独定义。
  - 一次性消耗修正仍需要在 FSM 扣费后清理。

### C. 使用消费点属性槽 `skill.nextCost.mpCostRate`（采纳）

在成员基础 schema 中提供 `skill.nextCost.mpCostRate`，`skill.cost` 每次读取该槽并叠加到 MP 消耗倍率。冲击波通过稳定 sourceId 写入 `-0.5`，下一次扣费成功后由 Player FSM 清理 `skill.nextCost` 前缀。

- 优点：
  - 数据域按消费点命名，来源通过 sourceId 表达。
  - StatContainer 已支持按 sourceId 前缀清理，一次性消费可以复用现有能力。
  - 槽在基础 schema 中存在，管线读取不会产生缺失属性告警。
  - 管线保持纯计算，扣费后的副作用仍由 FSM 处理。
- 缺点：
  - 基础 schema 新增 `skill` 根节点，需要更新动态槽命名说明。
  - 当前倍率槽采用加法语义，未来乘法叠加需要另设契约。
  - `skill.nextCost` 前缀下的 modifier 会在下一次成功扣费后一起清理。

## 决议

采纳方案 C。具体约定：

1. `skill.nextCost.mpCostRate` 是引擎保留的下一技能 MP 消耗倍率修正槽。
2. 该槽的基础值为 `0`，并声明 `noBaseValue: true`，表示没有下一技能消耗修正且保留小数倍率。
3. `skill.cost` 先保留现有 `mpCostRate` 锚点，再读取 `skill.nextCost.mpCostRate`，得到 `effectiveMpCostRate`。
4. 半耗写入 `-0.5`，最终倍率从默认 `1` 变为 `0.5`。
5. 写入方使用稳定 sourceId，例如 `skill.nextCost.mpCostRate.magicImpact`。
6. Player FSM 在技能消耗扣除成功后清理 `skill.nextCost` 前缀下的 modifier。
7. `skill.cost` 管线不得执行清理、派发事件、注册行为树等副作用。

理由：

1. 下一技能消耗修正的消费点是技能扣费，不依赖来源是 buff、托环、被动还是装备。
2. `skill.cost` 已经是消耗计算契约，读取消费点槽能保持所有消耗规则在同一条链路中收敛。
3. FSM 能区分施法检查和实际扣费，适合承担一次性修正的消费清理。
4. StatContainer 的 sourceId 前缀清理可以表达“同一类下一技能修正一起消费”的生命周期。

## 代价

这个决议接受这些代价：

1. **基础 schema 增加引擎保留域**。`skill.nextCost.*` 与技能自定义槽共享 `skill` 根节点，后续技能 ID 需要避开 `nextCost`。
2. **倍率语义暂定为加法修正**。`mpCostRate` 默认 `1`，半耗写入 `-0.5`。未来出现乘法叠加时，需要新增独立槽或管线锚点。
3. **清理粒度按前缀执行**。`skill.nextCost` 前缀下的所有一次性修正会在下一次成功扣费后被消费。

重新考虑条件：

1. 出现需要跨多个技能保留剩余次数的消耗修正。
2. 多个下一技能消耗效果需要按来源类型、技能类型或优先级分批消费。
3. UI 需要显示“魔能調節”这类状态时，仅靠 sourceId 难以表达可见状态。

## 影响范围

- 代码层面：
  - `MemberBaseSchema` 增加 `skill.nextCost.mpCostRate`。
  - `skill.cost` 管线读取该槽并输出有效 MP 消耗倍率。
  - BT action 增加按 sourceId 覆盖写入 modifier 的能力。
  - Player FSM 在扣费成功后消费 `skill.nextCost` 前缀。
  - Toram 技能导入脚本把 `mp_cost_half` 生成为下一技能消耗修正动作。
- 文档层面：
  - 本 ADR 记录下一技能消耗修正契约。
  - `SchemaMerge` 的动态槽命名说明需要标注 `skill.nextCost.*` 为引擎保留域。
- 迁移：
  - 现有 `skill.cost` overlay 锚点 `mpCostRate` 保留。
  - 已生成的冲击波行为树需要重新导入。

## 参考

- `docs/decisions/0003-skill-cost-as-pipeline-contract.md`
