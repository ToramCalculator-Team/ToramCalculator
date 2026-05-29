# 0005 - 命中后效果通过攻击 Payload 传递

- **状态**: Proposed
- **日期**: 2026-05-29
- **决策层**: 编排层 / 通信
- **相关代码**: `src/lib/engine/core/World/Member/runtime/Agent/CommonActions.ts`、`src/lib/engine/core/World/Member/runtime/DamageResolution.ts`
- **相关 ADR**: 0004

## 背景

大量技能的 `effect` 分支带有 `condition: "hit"`，表示命中后给施法者/队伍施加 buff（如迅捷攻擊命中后 +25 暴击率）。当前 `singleAttack` 是 fire-and-forget：创建 `DamageAreaRequest` 后立即返回 `SUCCEEDED`，施法者行为树不等待命中结果。

现有 `subscribeProc` 机制可以在攻击前注册监听器，命中事件从目标侧传回时触发回调。但这要求每个带 effect 的技能都手动编排 subscribe + attack + 异步回调，且 buff 施加逻辑脱离行为树的顺序表达。

源数据中 766 个 active effect 里，约 300+ 因 `hasEffect` 被跳过。如果能在攻击声明中直接携带命中后效果，导入覆盖率可从 48 → 200+ 棵树。

## 候选方案

### A. 行为树手动编排（subscribeProc + singleAttack）

在行为树中显式注册 proc 监听器，攻击后由监听器异步施加 buff。

- 优点：不需要修改 DamageAreaRequest 结构；现有机制已可用
- 缺点：行为树冗长且难以自动生成；buff 施加脱离顺序流；无法根据命中结果分支；复杂条件组合（命中+暴击+特定 tag）难以表达

### B. 攻击 Payload 携带 onHitEffects

将"命中后效果"作为 `DamageAreaRequest.payload` 的一部分声明，由伤害结算流程统一处理。

- 优点：一个 singleAttack 节点完整声明所有命中后效果；行为树保持简洁；MDSL 生成器可直接从源数据组合输出；异常和 buff 统一在伤害结算流程中处理
- 缺点：DamageAreaRequest payload 变大；伤害结算流程需要承担回调施法者的职责（跨成员通信）

## 决议

选 B。

理由：
1. 绝大多数"命中后效果"模式固定（命中→给施法者加 buff），不需要行为树级别的灵活性
2. 行为树应描述技能的宏观流程（动画→攻击→结束），不应承担微观的事件编排
3. 自动生成 MDSL 时，一个节点能完整表达攻击+异常+buff 大幅降低生成复杂度
4. 跨成员通信的代价可控——命中确认事件本身已存在，只需扩展 payload

## 代价

- 伤害结算流程从"纯目标侧"变为"目标侧+回调施法者侧"，增加了职责边界的模糊性
- 如果未来出现需要行为树根据命中结果做复杂分支的场景（如命中后选择不同后续技能），此方案无法覆盖，仍需回退到 subscribeProc
- `subscribeProc` 不会被移除，两套机制并存可能造成选择困惑——需要明确使用判据

## 影响范围

- 代码层面：
  - `DamageAreaRequest.payload` 扩展 `onHitEffects` 字段
  - `commonAttackSchema` 扩展对应参数
  - FSM 命中确认后增加回调施法者逻辑
  - `importToramSkillBehaviors.mjs` 移除 `hasEffect` 阻塞，生成 onHitEffects
- 文档层面：CommonActions catalog 需更新参数说明
- 迁移：现有 48 棵 active 树无需改动（ailments 已在 payload 中）

## 附录：异常持续时间系统常量

异常持续时间存储在目标 StatContainer 中（可被修改器影响）：

| AbnormalType | 中文 | 默认持续时间 |
|---|---|---|
| Flinch | 膽怯 | 2000ms |
| Tumble | 翻覆 | 3000ms |
| KnockBack | 逼退 | 500ms |
| Breaking | 降防 | 5000ms |
| Stun | 昏厥 | 5000ms |
| Paralysis | 麻痺 | 5000ms |
| Stop | 停止 | 5000ms |
| Weak | 衰弱 | 5000ms |
| Ignition | 著火 | 5000ms |
