# 0004 - 技能 Behavior Tree 导入迭代计划

- **状态**: Proposed
- **日期**: 2026-05-28
- **决策层**: 跨层
- **相关代码**:
  - `db/scripts/importToramSkillVariants.mjs`
  - `db/backups/skill_variant.csv`
  - `db/generated/schema.prisma`
  - `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`
  - `src/lib/engine/core/World/Member/attachments/RuntimeAttachment.ts`
  - `src/lib/engine/core/World/Member/attachments/RuntimeAttachmentInstaller.ts`
- **相关 ADR**: 0001、0002

## 背景

外部 `toram-skills.json` 中的技能资料已经能导入 `skill` / `skill_variant` 的静态字段，但技能行为仍主要停留在原始 JSON 或人工实现中。下一阶段需要把可机械转换的技能效果写入 `behavior_tree`，让主动技能、被动技能和触发型注册行为都能通过统一入口进入引擎。

当前最需要先固定的是被动属性修正的单位语义。JSON 中部分属性修正带有 `extra === "%"`, 例如穿透、稳定率、伤害减轻等。它们在游戏资料中表现为百分数，但落入 `StatContainer` 时存在两种可能解释：

1. 百分数属性自身的直接数值增加。
2. 对目标属性基础值施加百分比修正。

为了先推进导入链路，本迭代暂定采用简单规则：**所有 `extra === "%"` 的属性修正都导入为 `STATIC_PERCENTAGE`**。后续如果 `noBaseValue` 属性的计算或展示验证出偏差，再单独调整规则。

## 候选方案

### A. `extra === "%"` 统一导入 `STATIC_PERCENTAGE`

导入脚本只看 JSON 的单位标记：`extra === "%"` 生成 `staticPercentage` modifier；其他数值生成 `staticFixed` modifier。

- 优点：
  - 规则简单，可快速覆盖全部被动属性修正。
  - 与现有 modifier DSL 中 `%` 后缀映射 `STATIC_PERCENTAGE` 的直觉一致。
  - dry-run 报告和后续 CSV diff 更容易检查。
- 缺点：
  - 对 `noBaseValue` 属性可能存在语义偏差；这类属性当前计算中会把 percentage 值加回总值，但 UI 和调试输出会显示为百分比修正通道。
  - 如果某些 JSON 的 `%` 只是属性单位，而不是修正类型，后续需要迁移已生成数据。

### B. 按目标属性的 `noBaseValue` 决定通道

`extra === "%"` 时读取 AttributeSchema：`noBaseValue` 属性写入 `STATIC_FIXED`，其他属性写入 `STATIC_PERCENTAGE`。

- 优点：
  - 更接近 `StatContainer` 的计算语义。
  - 百分数型属性不会在调试面板中被误读为“对基础值施加百分比”。
- 缺点：
  - 导入脚本需要依赖运行时 AttributeSchema 或导出一份属性元数据，脚本复杂度上升。
  - 在技能资料覆盖率还未跑通前，会把通道规则和属性 schema 同时引入变量，不利于先定位导入缺口。

### C. 为每个 JSON 属性维护显式映射表

每个外部属性名映射到内部 attribute key 时，同时声明 modifier 通道。

- 优点：
  - 最精确，可以处理特殊个案。
  - 后续资料源变更时能逐项审阅。
- 缺点：
  - 初期维护成本最高。
  - 容易把规则散落在映射表里，缺少统一默认行为。

## 决议

暂定采用方案 A：**所有 `extra === "%"` 的导入项统一写入 `STATIC_PERCENTAGE`**。

具体约定：

1. `extra === "%"` 只决定 modifier 通道，不缩放数值；`10%` 导入为 `value: 10`。
2. `extra === "%"` 生成 `modifierType: "staticPercentage"`，对应运行时 `ModifierType.STATIC_PERCENTAGE`。
3. `extra !== "%"` 生成 `modifierType: "staticFixed"`，对应运行时 `ModifierType.STATIC_FIXED`。
4. 本规则先只用于 `toram-skills.json` 到 `behavior_tree` / `RuntimeAttachment.modifiers` 的机械导入，不改变手写 DSL 和运行时 API。
5. dry-run 报告必须单独列出所有 `extra === "%"` 的导入项，便于后续抽样验证 `noBaseValue` 属性。

理由：

1. 当前主要目标是打通 `behavior_tree` 的批量生成和运行时安装路径，先使用单一规则能减少导入器变量。
2. `StatContainer` 已有 `STATIC_PERCENTAGE` 通道，`RuntimeAttachmentInstaller` 也能直接映射 `staticPercentage` 字符串枚举。
3. 如果规则错误，修正范围可以限定在导入脚本和已生成数据，不需要改动核心运行时。

## 代价

1. **可能产生语义债务**。`pie.p`、`red.p`、`aggro` 等 `noBaseValue` 属性的百分数来源可能更适合 `STATIC_FIXED`，暂定规则会先放入 `STATIC_PERCENTAGE`。
2. **调试展示可能误导**。MemberStatusPanel 会把这些值显示在 percentage 修正通道里，读者可能以为它们参与 `base * (1 + percentage / 100)`。
3. **后续迁移需要数据重刷**。如果验证后改为 `noBaseValue` 感知规则，需要重跑 behavior_tree 导入并检查 CSV diff。
4. **规则不表达资料源差异**。如果外部 JSON 中 `%` 同时混用为“数值单位”和“修正类型”，单一规则无法区分。

重新考虑本决议的条件：

1. 抽样技能在运行时面板或伤害计算中出现可复现偏差。
2. dry-run 报告显示 `extra === "%"` 大量命中 `noBaseValue` 属性，且这些属性在战斗计算中依赖通道语义。
3. 后续需要支持非 JSON 来源，而来源本身能区分“百分数单位”和“百分比修正”。

## 迭代计划

### 第 0 阶段：导入前盘点

目标：不写入 CSV，只生成可审阅报告。

任务：

1. 扫描 `toram-skills.json`，统计每个技能树、技能、分支的可识别字段。
2. 对齐现有 `skill.csv` / `skill_variant.csv`，输出无法匹配的技能名、繁简差异和缺失变体。
3. 枚举可机械生成的 behavior tree 类型：
   - active：伤害、治疗、资源消耗、动作时间、咏唱/蓄力。
   - passive：静态属性修正、条件属性修正、被动触发。
   - registered：需要注册到事件或分支激活器的行为。
4. 输出 `extra === "%"` 清单，字段包括来源技能、外部属性名、内部 attribute key、value、暂定 modifierType。

验收：

1. dry-run 命令不会修改任何 CSV。
2. 报告能区分“已生成”、“暂不支持”、“无法映射”三类分支。
3. `extra === "%"` 项全部显示为 `staticPercentage`。

### 第 1 阶段：被动静态 modifier 导入

目标：先覆盖无需事件、无需条件、无需运行期表达式的被动属性修正。

任务：

1. 建立外部属性名到内部 `StatContainer` attribute key 的映射表。
2. 为每个被动技能变体生成 `passiveBehaviorTree` 或等价 `RuntimeAttachment.modifiers` definition。
3. 按本 ADR 的暂定规则处理 modifier 通道：
   - `extra === "%"` -> `staticPercentage`
   - 其他 -> `staticFixed`
4. 生成稳定 `sourceId`，建议格式为 `skill.<skillVariantId>.passive.<effectIndex>`。
5. 写入 `behavior_tree.csv`，并在 `skill_variant.csv` 关联 `passiveOwnerId` 所需字段。

验收：

1. 重跑导入脚本结果稳定，CSV 不产生无意义 diff。
2. 被动 modifier 能通过 `RuntimeAttachmentInstaller` 安装到 `StatContainer`。
3. 抽样技能在 MemberStatusPanel 中能看到对应 sourceId 和 modifier 通道。

### 第 2 阶段：主动技能基础行为导入

目标：覆盖直接施放后产生一次性效果的主动技能。

任务：

1. 生成主动技能 `activeBehaviorTree`，优先覆盖伤害、治疗、HP/MP 消耗和固定动作时间。
2. 将公式变量映射到现有表达式上下文，无法映射的变量进入报告，不静默降级为 0。
3. 处理主手、副手、防具条件，把无法表达的条件留为 `unsupported` 报告项。
4. 对生成的 active BT 做 JSON schema 校验。

验收：

1. 主动 BT 能被 repository 读取并进入技能执行流程。
2. 抽样技能的耗蓝、动作时间和基础倍率与原 CSV 字段一致。
3. 无法映射公式变量都有报告条目。

### 第 3 阶段：注册型与触发型行为导入

目标：覆盖需要事件订阅、状态进入/离开、阈值监听或技能分支激活的行为。

任务：

1. 将可静态识别的触发条件映射为 `RuntimeAttachment.subscriptions`、`thresholdWatchers` 或 registered behavior tree。
2. 对 branch activator 建立稳定命名和卸载边界。
3. 对带冷却、计数器、层数的行为声明 `attributeSlots`，遵守 ADR 0001 的 StatContainer 持久化槽约定。
4. 明确哪些技能仍需手写 BT 或手写 attachment。

验收：

1. 注册型 behavior tree 不依赖技能施放时临时拼装。
2. attributeSlots 在 `StatContainer` 构造前完成合并。
3. sourceId 前缀能支持统一卸载。

### 第 4 阶段：运行时验证与回归样例

目标：证明导入结果能在引擎中稳定执行。

任务：

1. 为被动 modifier、主动 BT、注册型 BT 各选 3-5 个代表技能作为样例。
2. 增加最小运行时测试或脚本，验证安装、读取、触发、卸载。
3. 对比导入前后的关键字段：消耗、倍率、属性修正、动作时间。
4. 单独验证 `extra === "%"` 样例，记录是否需要从 `STATIC_PERCENTAGE` 迁移。

验收：

1. 样例技能执行结果稳定。
2. 所有 unsupported 项都有可追踪原因。
3. 若发现 `STATIC_PERCENTAGE` 规则不合适，新增 ADR 或 Supersede 本 ADR 后再改导入规则。

### 第 5 阶段：收敛与清理

目标：把临时导入逻辑收敛成可维护入口。

任务：

1. 把导入脚本拆分为读取、映射、生成、写入、报告几个小模块。
2. 将属性名映射表、技能名映射表、公式变量映射表集中管理。
3. 删除只服务一次性迁移的临时代码。
4. 将本 ADR 从 `Proposed` 更新为 `Accepted`，或用新 ADR 替代。

验收：

1. 新增资料源字段时能定位到单一映射入口。
2. 导入脚本默认 dry-run，显式 `--write` 才修改 CSV。
3. 文档、脚本输出和运行时行为对同一规则描述一致。

## 影响范围

- **数据层面**：
  - 新增或更新 `behavior_tree.csv`。
  - `skill_variant.csv` 需要关联 active / passive / registered behavior tree。
- **导入脚本**：
  - `importToramSkillVariants.mjs` 需要从只更新 skill variant 扩展到生成 behavior tree。
  - 需要新增 dry-run 报告，避免不可映射行为静默丢失。
- **运行时**：
  - `RuntimeAttachmentInstaller` 继续作为 modifier 安装入口。
  - `StatContainer` 暂不修改；`extra === "%"` 的规则在导入侧完成。
- **文档**：
  - 本 ADR 在 Proposed 阶段作为迭代计划和临时规则来源。
  - 若后续确认 `noBaseValue` 需要特殊处理，新增 ADR 替代本条或补一条专门决策。

## 参考

- ADR 0001：StatContainer 作为持久化槽的统一载体
- ADR 0002：Member runtime attachments as prebattle assembly contract
- `db/generated/schema.prisma` 中 `behavior_tree` model 的设计说明
- `src/lib/engine/core/World/Member/runtime/StatContainer/ModifierDslParser.ts` 中 `%` 后缀到 `STATIC_PERCENTAGE` 的现有 DSL 行为
