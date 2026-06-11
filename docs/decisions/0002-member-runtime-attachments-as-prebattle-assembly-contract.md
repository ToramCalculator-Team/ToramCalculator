# 0002 - Member runtime attachments as prebattle assembly contract

- **状态**: Accepted
- **日期**: 2026-05-14
- **决策层**: 跨层
- **相关代码**:
  - `src/lib/engine/core/World/Member/attachments/RuntimeAttachment.ts`
  - `src/lib/engine/core/World/Member/attachments/RuntimeAttachmentInstaller.ts`
  - `src/lib/engine/core/World/Member/construction/collectPlayerRuntimeAttachments.ts`
  - `src/lib/engine/core/World/Member/types/Player/Player.ts`
  - `src/lib/engine/core/World/Member/MemberManager.ts`
- **相关 ADR**: 0001

## 背景

`character` 当前承载多类战前配置来源：装备、已学技能、雷吉斯托环、料理与道具。它们的来源表不同，战斗运行时写入的能力集合存在交集：

1. `modifiers` 写入 `StatContainer`。
2. `pipelinePatches` 写入成员级 pipeline overlay。
3. `subscriptions` 写入成员内 `ProcBus`。
4. `thresholdWatchers` 写入 `AttributeWatcherRegistry`。
5. `attributeSlots` 必须在 `StatContainer` 构造前并入 schema。

现状里装备和被动技能 modifiers 由 `PrebattleDataSysModifiers` 安装，雷吉斯托环的 overlay / subscription / watcher 由 `RegistletLoader` 安装。这个分布按数据来源切开，导致同一种运行时能力有多条安装路径。

Member 创建还存在时序约束：`attributeSlots` 早于 `StatContainer`，`subscriptions` 晚于 `EventCatalog` 注入，`thresholdWatchers` 晚于 `StatContainer`，表达式求值晚于 `expressionEvaluator` 注入。

## 候选方案

### A. 每个来源目录维护自己的安装器

装备、被动技能、雷吉斯托环、道具分别保留 loader。每个 loader 自己写入 `StatContainer`、`pipelineOverlays`、`ProcBus` 和 `AttributeWatcherRegistry`。

- 优点：
  - 来源生命周期局部可读。
  - 单一来源的新增字段可以在本目录内完成。
- 缺点：
  - 同一种能力会重复实现安装与卸载。
  - MemberManager 需要知道每个来源的安装时序。
  - 后续新增来源时会复制托环 loader 的能力分发逻辑。

### B. 统一 RuntimeAttachment 契约（采纳）

各来源 collector 只把数据翻译成 `RuntimeAttachment`。统一 installer 按能力写入运行时组件。

- 优点：
  - Member 创建流程按生命周期阶段表达：解析成员、收集附加效果、构造运行时组件、安装附加效果。
  - `modifiers`、overlay、subscription、watcher 只有一条安装路径。
  - 来源类型保留在 `sourceId`、`ModifierSource` 和卸载前缀里，debug 与清理仍能追踪来源。
- 缺点：
  - `RuntimeAttachment` 会成为跨来源契约，字段扩展需要维护兼容性。
  - collector 需要承担来源数据到统一能力的翻译成本。
  - 旧讨论文档里的 `Registlets/RegistletLoader` 叙述会成为历史快照，需要读者以本 ADR 为准。

### C. 将所有附加内容建模为运行时 component

每个装备、技能、道具、托环都生成独立 component，系统按 component 类型扫描并写入运行时组件。

- 优点：
  - 运行期增删来源更自然。
  - 对未来动态装备切换和临时道具效果更灵活。
- 缺点：
  - 当前 Member / StatContainer / ProcBus 架构需要大范围改写。
  - 战前静态配置会被引入运行期调度成本。
  - checkpoint 与 replay 需要新增 component 图序列化规则。

## 决议

采纳方案 B。约定如下：

1. **来源 collector 输出 `RuntimeAttachment[]`**。装备、被动技能、雷吉斯托环、道具只负责翻译来源数据。
2. **统一 installer 按能力安装**。`modifiers` 写入 `StatContainer`，`pipelinePatches` 写入 `pipelineOverlays`，`subscriptions` 写入 `ProcBus`，`thresholdWatchers` 写入 `AttributeWatcherRegistry`。
3. **属性槽先于运行时组件构造**。collector 输出的 `attributeSlots` 先合并进 schema，再创建 `StatContainer`。
4. **`sourceId` 是卸载边界**。同一来源派生出的 overlay、subscription、watcher、modifier 都使用稳定前缀，卸载按前缀清理。
5. **MemberManager 只触发阶段切换**。成员类型构造自身 blueprint 与 runtime，Manager 注入引擎服务后调用统一的战前附加效果安装入口。

理由：

1. 运行时组件是能力边界，来源类型是数据边界；安装路径按能力收敛可以减少重复逻辑。
2. `attributeSlots` 的构造前约束来自 `StatContainer` 的固定数组布局，必须独立于具体来源提前收集。
3. `ProcBus` 依赖 `EventCatalog`，subscription 安装时序需要由统一入口保证。
4. ADR 0001 已经确定持久化数值槽落在 `StatContainer`，RuntimeAttachment 给 passive / skill / buff / registlet 提供同一条声明路径。

## 代价

1. **契约字段会增长**。后续 skill branch、道具持续时间、来源优先级等能力都可能进入 `RuntimeAttachment`，需要避免把来源私有字段塞进公共契约。
2. **collector 成为翻译层**。来源表结构变化时要同步维护 collector，遗漏会导致数据存在但运行时无效果。
3. **历史叙述与代码入口会短期不一致**。旧讨论文档仍会提到 `RegistletLoader`，当前权威入口改为 RuntimeAttachment collector 与 installer。
4. **`sourceId` 命名需要巡检**。历史托环 id 已包含 `registlet.` 前缀，统一 installer 为兼容现有清理边界会继续接受显式 `sourceId`。
5. **道具动态卸载尚未完成**。当前落地覆盖战前安装；战斗中临时增删道具效果时，需要在同一契约上补生命周期事件。

## 影响范围

- **代码层面**：
  - 新增 `RuntimeAttachment` 契约和统一 installer。
  - Player 构造时收集 attachment，创建 `StatContainer` 前合并 slots。
  - MemberManager 在服务注入后调用 Player 的战前 attachment 安装入口。
  - 装备与被动技能 modifiers 改为 attachment collector 输出。
  - 雷吉斯托环改为 attachment collector 输出，内置试点数据继续可用。
- **文档层面**：
  - `hook与触发层设计讨论结论.md` 中“passive / 托环试点”作为历史快照保留。
  - 后续新增来源时引用本 ADR，而非扩写历史叙述文档。
- **迁移**：
  - 第一阶段迁移 Player 的装备/被动 modifiers 与托环。
  - 第二阶段把道具和 buff 预插入纳入 collector。
  - `skillBranchActivators` 保留在托环数据层，由 BT 条件运行时查询 character 数据，不进入 RuntimeAttachment。
  - 第三阶段删除旧 loader 的直接业务调用，只保留兼容 wrapper。

## 参考

- ADR 0001：StatContainer 作为持久化槽的统一载体
- `src/lib/engine/document/hook与触发层设计讨论结论.md` §2.2 与 §2.3
