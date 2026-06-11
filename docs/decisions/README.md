# 架构决策记录（ADR）

本目录记录项目级架构决策，覆盖应用层、引擎、数据层和跨层契约。每一条 ADR 回答一个问题：**为什么这样做，而不是那样做。**

## 为什么需要 ADR

代码能表达"现在是什么"，但表达不了：
- 为什么选 A 不选 B
- 放弃 B 时我们接受了什么代价
- 什么情况下会让我们重新考虑 B

这些信息如果只留在讨论记录里，半年后重构时就丢了。ADR 是把这类信息固化下来的最小载体。

## 写作规范

1. **一条 ADR 只解一个问题。** 如果一个决策牵扯多个独立取舍，拆成多条。
2. **定稿后只增不改。** 新认识写新 ADR，旧 ADR 标 `Superseded by NNNN`。
3. **不描述代码现状。** 现状看代码和 catalog。ADR 只写"意图"和"权衡"。
4. **必写"代价"段落。** 如果找不到代价，说明你还没想清楚。
5. **编号连续、不复用。** 废弃的 ADR 保留编号，状态改为 `Deprecated` 或 `Superseded`。
6. **候选方案必须同时列出优点和缺点。** 只有单边论证说明分析不完整。
7. **使用中文书写。** 元数据键（`状态`、`日期`、`决策层`）保持中文；只有用户明确要求时才使用其他语言。

模板见 [0000-template.md](./0000-template.md)。

## 维护规则

### 何时写 ADR

**应该写**：
- 跨模块的接口/契约变化（影响 ≥2 个一级目录）
- 引入或移除一个"通信机制/层次/注册表"
- 放弃一个已实现的方案改走另一条路
- 定下一个会约束后续多个 passive/skill/pipeline 的约定（命名前缀、bitfield 划分、payload 字段扩展等）
- 引入外部依赖或参考实现（借鉴 GAS / MMORPG aura 这类）

**不要写**：
- 单函数/单文件内部的实现选择
- 能通过代码/类型直接表达的东西（让代码本身当文档）
- 临时性的排查结果或 bug 修复原因（用 commit message 或注释即可）
- 尚未落地的纯头脑风暴（先写成 Proposed，或留在讨论记录里，不要占编号）

### 新增 ADR 的步骤

1. **查重**：在本 README 的索引和"待拆清单"里搜一遍关键词，避免重复立项或错过应该 Supersede 的旧条目。
2. **领编号**：取当前最大编号 +1，四位数（`0001`, `0002`, …, `0042`, …）。编号只增不减、废弃也保留。
3. **建文件**：`NNNN-<kebab-case-英文-slug>.md`。slug 短而具体，能一眼区分即可。
4. **填元数据**：复制 `0000-template.md`，至少填 `状态` / `日期` / `决策层` / `相关代码`。初稿状态用 `Proposed`。
5. **更新索引**：在本 README 的索引表追加一行。如果来自"待拆清单"，勾掉对应项。
6. **关联代码**：如果决议影响具体模块，在被影响文件顶部加一行引用注释：
   ```ts
   // 见 docs/decisions/NNNN-xxx.md
   ```
   只在"为什么这样写不明显"的地方加，不要在每个受影响文件都加。
7. **提交**：ADR 与对应代码改动同一个 commit，commit message 首行带 `(ADR-NNNN)` 标记。

### 状态流转

```
        ┌─────────────┐
        │  Proposed   │  起草中，未落地
        └──────┬──────┘
               │  讨论收敛 + 代码开始迁移
               ▼
        ┌─────────────┐
        │  Accepted   │  定稿，作为当前权威
        └──────┬──────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│ Superseded  │  │  Deprecated  │
│   by NNNN   │  │              │
└─────────────┘  └──────────────┘
 有替代决议        决议失效但未被替代
                  （例如对应特性被移除）
```

**从 Proposed 升到 Accepted**：由决议的采纳者改，同时更新索引中的状态列。
**从 Accepted 转到 Superseded/Deprecated**：**永远不要直接改旧 ADR 的正文**。只改三处：
- 旧 ADR 顶部 `状态` 字段
- 旧 ADR 末尾加一段 `## 后续` 说明被谁替代、为什么
- 新 ADR 的 `相关 ADR` 字段写 `Supersedes NNNN`

### 修订已有 ADR

| 情况 | 做法 |
|---|---|
| 错别字、链接失效、格式问题 | 直接改，commit 用 `docs: ` 前缀 |
| 补充相关代码位置、补全参考链接 | 直接改，不改变论点 |
| 论点本身变化 | **不改原文**，写新 ADR 并 Supersede |
| 代码重构导致引用行号失效 | 更新行号即可；如果决议本身因为重构而过时，走 Supersede 流程 |

### 索引维护

索引表和待拆清单就在本 README 里，**不要用脚本生成**。每次新增/改状态都手工同步：
- 索引按编号升序，一条 ADR 一行。
- 状态列用和 ADR 顶部完全一致的词（`Accepted` / `Superseded by 0007` / `Deprecated`）。
- 如果超过 30 条，再考虑按主题分组或拆分索引页。

### 与代码提交的联动

- **新 ADR + 对应实现** 同 commit；commit message 首行加 `(ADR-NNNN)`。
- **仅文档修订**（错别字、链接）独立 commit，前缀 `docs: `。
- **代码改动触发 ADR 更新**（例如把一个 overlay 改成 watcher）：先提 ADR（Supersede 旧的），再提代码，两个 commit 都带 `(ADR-NNNN)`。

### 定期巡检（每季度一次）

不是强制制度，但建议做：
1. 抽 3-5 条 `Accepted` 状态的 ADR，检查其"代价"段落是否已经兑现：如果当初担心的问题真的发生了，补一条 ADR 记录应对；如果完全没发生，加一行"复盘记录"说明担心过度。
2. 检查"待拆清单"是否有条目已经在代码里默默实现但没写 ADR——补写。
3. 删掉待拆清单里已经不相关的条目（不保留编号，因为它们从未占过编号）。

## 索引

| 编号 | 标题 | 状态 | 主题 |
|---|---|---|---|
| [0001](./0001-stat-container-as-unified-persistence-slot.md) | StatContainer 作为持久化槽的统一载体 | Accepted | 数据层 |
| [0002](./0002-member-runtime-attachments-as-prebattle-assembly-contract.md) | Member runtime attachments as prebattle assembly contract | Accepted | 跨层 |
| [0003](./0003-skill-cost-as-pipeline-contract.md) | 技能消耗作为 Pipeline 契约 | Proposed | 跨层 |
| [0004](./0004-skill-behavior-tree-import-iteration-plan.md) | 技能 Behavior Tree 导入迭代计划 | Proposed | 跨层 |
| [0005](./0005-onhit-effects-via-attack-payload.md) | 命中后效果通过攻击 Payload 传递 | Proposed | 编排层 / 通信 |
| [0006](./0006-stat-container-same-frame-dirty-convergence.md) | StatContainer 同帧脏值定点收敛 | Accepted | 数据层 |
| [0007](./0007-next-skill-cost-modifier-contract.md) | 下一技能消耗修正契约 | Proposed | 跨层 |
| [0008](./0008-world-observable-as-spatial-medium.md) | 世界可观测属性作为空间介质 | Proposed | 跨层 |
| [0009](./0009-persistent-render-runtime.md) | 常驻渲染运行时作为应用级场景底座 | Proposed | 跨层 |
| [0010](./0010-unify-procbus-and-attribute-watcher.md) | 合并 ProcBus 与 AttributeWatcher 为单一成员内事件总线 | Accepted | 编排层 / 通信 |
| [0011](./0011-member-facts-dual-bus-paired-dispatch.md) | 成员事实在结算点成对派发到两条总线 | Proposed | 编排层 / 通信 |
| [0012](./0012-intent-first-visual-control.md) | 意图优先的视觉控制：意图层作为 UI 与场景的单一事实源 | Accepted | 跨层（应用层） |
| [0013](./0013-attention-machine-as-phase-independent-root-actor.md) | 注意力机作为阶段无关的根级 actor | Accepted | 跨层（应用层） |

## 待拆分清单

以下决策来自 `src/lib/engine/document/hook与触发层设计讨论结论.md`，将陆续拆成独立 ADR。原文档保留为历史快照。

- [ ] StatusInstance 边界收紧（只承载游戏内可见状态） — §2.1.2
- [ ] DamageDispatchPayload 字段扩展与 bitfield 位索引 — §2.1.3
- [ ] 跨 actor 数据走快照随事件，撤回 peerStats — §2.1.4
- [ ] Pipeline + overlay 作为 hook 主通路 — §2.2.1
- [ ] Pipeline `emit` 算子作为计算层→编排层的主动通知通路 — §2.2.2
- [ ] 订阅三形式并存（overlay / watcher / proc mask）与选用判据 — §2.3.2 → 由 ADR 0010 合并为单一总线
- [x] 属性变更委托（watcher）借鉴 GAS OnGameplayAttributeValueChange — §2.3.3 → ADR 0010（降格为 ProcBus 事件源）
- [x] Proc mask 事件总线借鉴 MMORPG aura/proc — §2.3.4 → ADR 0010
- [ ] EventCatalog 作为编排层扁平注册表 — §2.3.5
