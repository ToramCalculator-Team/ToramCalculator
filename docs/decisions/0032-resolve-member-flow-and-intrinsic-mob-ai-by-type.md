# 0032 - 按成员类型解析成员流程与 Mob 固有 AI

- **状态**: Accepted
- **日期**: 2026-07-12
- **决策层**: 跨层（数据 / 场景解析 / 引擎）
- **相关代码**: `db/schema/models/data.prisma`、`db/schema/jsons.ts`、`src/lib/engine/core/engineScenarioSchema.ts`、`src/lib/engine/core/World/Member/`
- **相关 ADR**: Depends on 0031；Refines 0027

## 背景

一种候选方案把 Member 定为所有成员运行行为的唯一持久化来源，但这会混合两种不同事实：Mob 模板自身定义的固有 AI，以及用户在某个 Simulator 中为成员设计的可选自动流程。若把 Mob AI 复制到每个 Member，同一 Mob 的规则会出现大量副本；若引擎临时在两个字段间 fallback，又会失去权威来源。

## 决策驱动

- Mob 固有 AI 与 Simulator 内成员流程必须各自只有一个持久化所有者。
- 引擎运行时应消费统一解析结果，不感知不同持久来源。
- Player 手动控制必须能用“没有成员流程”表达，而不是持久化伪空行为树。

## 候选方案

### A. 所有成员行为都复制到 Member

- 优点：引擎始终从一个持久字段读取行为；不同 Simulator 可以覆盖任何成员的行为。
- 缺点：Mob 固有 AI 被重复存储，模板修正无法一致生效；Member 与 Mob 对同一规则形成两个潜在事实源。

### B. 按 MemberType 确定持久来源，场景解析统一输出

- 优点：Mob AI 保持模板事实，Player 成员流程保持方案事实；引擎仍只消费一种已解析行为形状。
- 缺点：场景解析必须理解不同 MemberType 的行为来源，持久 schema 也要表达“某些类型允许为空、某些类型必须为空”。

## 决议

选 B：**成员流程与 Mob 固有 AI 分别由 Member 和 Mob 模板拥有；场景解析按 MemberType 选择权威来源，并向引擎输出统一的 `resolvedBehavior`。**

1. `member.behavior` 改为可空，只表达当前 Simulator 中可选的成员流程，不再被定义为所有成员的通用运行行为。
2. Player Member 的 `behavior` 为空时表示没有自动流程，由用户手动控制；非空时表示当前 Simulator 为该 Player 保存的成员流程。
3. Mob Member 的 `behavior` 必须为空。Mob 的权威行为来源始终是所引用模板的 `mob.actions`，Member 不复制或覆盖它。
4. 场景解析依据 MemberType 和已验证的关系选择权威来源，产出引擎必需的单一 `resolvedBehavior`；引擎运行时不再访问多个持久字段，也不执行 `member.behavior ?? mob.actions` 式 fallback。
5. Player 手动模式所需的 idle 运行行为是解析结果，不需要持久化一棵空行为树来表达“没有成员流程”。
6. Partner 与 Mercenary 是否允许成员流程、使用模板 AI 或两者组合，留到对应运行模型实现前另行决定。

## 代价

不同 MemberType 的持久行为来源不完全相同，场景解析和写入校验需要维护明确的判别联合。Player 的空流程必须与合法但不产生动作的流程区分；Mob 模板 AI 的修改会影响以后从该模板解析的新运行，而不会生成 Simulator 内的独立副本。若未来需要允许单个 Mob 覆盖 AI，必须另行决定覆盖语义，不能复用当前可空字段做隐式 fallback。

## 重新评估条件

- 产品需要为单个 Simulator Member 覆盖 Mob 模板 AI。
- Partner 或 Mercenary 引入无法归入当前 Player/Mob 规则的组合行为来源。
- 模板 AI 需要按 Simulator 固定版本，而不能随模板更新影响以后解析的运行。

## 影响范围

- Member schema、默认数据和迁移允许 `behavior` 为空，并禁止 Mob Member 保存该字段。
- Player 属性槽收集读取可选成员流程；Mob 属性槽收集继续读取 `mob.actions`。
- ADR 0027 的场景解析结果增加统一 resolved behavior，引擎构造不再感知持久来源差异。
- 实施与验收纳入 `docs/plans/minimum-validation-loop.md` 的阶段 0 和阶段 1。
