# 0022 - StatContainer 使用结构化 Modifier 来源链

- **状态**: Accepted
- **日期**: 2026-07-10
- **决策层**: 数据层 / 计算层 / 跨层契约
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StatContainer/`、`src/lib/engine/core/World/Area/types.ts`、`src/lib/engine/core/World/Member/runtime/Status/StatusInstanceStore.ts`
- **相关 ADR**: 补充 0001、0002

## 背景

ADR 0001 已规定所有需要 checkpoint 的持久数值统一进入 `StatContainer`，但 `StatusInstanceStore` 仍保留了可写的 `stacks`，形成两处都能承载层数的漂移空间。

`StatContainer` 当前又只按字符串 `sourceId` 保存 modifier 来源。伤害使用 `damage.hp.<areaId>`，技能消耗使用 `skill.cost.mp.<skillId>`，不同来源把因果关系编码进字符串，分析和调试需要理解各自的命名约定，还可能在伤害区域销毁后失去 `areaId` 到成员和技能的映射。

## 候选方案

### A. 保留字符串 sourceId，由分析层按前缀解析

- 优点：改动小，现有聚合和卸载逻辑无需迁移。
- 缺点：字符串同时承担身份、分类和因果关系；新增来源会继续产生隐式协议，无法类型检查。

### B. 在 StatContainer 中保存真实对象引用链

- 优点：可以直接从 modifier 访问 Member、Skill 和运行时载体。
- 缺点：引入循环引用、对象失效和跨线程序列化问题，checkpoint 将依赖整个运行时对象图。

### C. 保存稳定 key 与结构化 ID 引用链

- 优点：聚合/卸载身份与分析来源分离；来源链可 checkpoint、可跨 Worker，并能在中间运行时对象销毁后独立解释。
- 缺点：需要迁移 modifier 写入入口和 checkpoint 格式；调用方必须提供真实来源链。

## 决议

选 C：**每个 modifier 来源由稳定 `key`、类别和从根来源到直接载体的结构化 ID 链组成；StatContainer 保存完整来源描述，不再把来源压缩成字符串。**

核心约束：

1. `key` 只负责同来源聚合、覆盖和卸载，不承担因果语义。
2. `chain` 只保存 `{ kind, id }` 形式的不可变引用，不保存 Member、Skill、BehaviorTree 或区域实例对象。
3. 成员产生的 modifier 链以 `member` 开始；技能区域伤害使用 `member -> skill -> damageArea`，技能直接效果使用 `member -> skill -> effect`。
4. modifier 所属的 `StatContainer` 已表达实际目标，来源链不重复保存 `targetMemberId`。
5. 同一 `key` 再次写入时必须具有相同类别和来源链；冲突应直接报错，不允许静默合并不同来源。
6. 导出和 checkpoint 必须保存完整 `ModifierSource`，分析层不得解析 key 前缀还原因果关系。
7. 延续 ADR 0001：层数、冷却和计数器只存于 `StatContainer`；`StatusInstanceStore` 删除 `stacks` 和无约束 `meta`，仅保存可见状态身份、来源、标签和生命周期。

## 代价

- `StatContainer` 的来源条目比单个字符串占用更多内存；来源对象应按 key 复用，避免为同一来源重复创建对象。
- checkpoint 格式发生变化，旧 checkpoint 不做跨版本兼容；当前 checkpoint 只在运行会话内使用。
- 来源链要求各写入入口了解自己的直接业务来源，但不得因此把上层对象传入 StatContainer。

## 影响范围

- `ModifierSource`、DataStorage 导出和 `StatContainerCheckpoint` 使用同一结构化来源契约。
- RuntimeAttachment 安装器负责把成员和战前来源拼成来源链。
- 技能/FSM/行为树动作负责提供成员、技能和直接效果引用。
- 伤害区域请求必须携带来源技能 ID，目标结算时才能构造完整伤害来源链。
- `StatusInstanceStore` 不再保存任何持久数值。
