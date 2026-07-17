# 架构决策记录（ADR）

本目录保存 ToramCalculator 已发布的架构决策证据。默认阅读路径是：**当前决策视图 -> 相关 ADR -> 必要时进入历史链**，不应按编号顺序重建系统架构。

## 治理来源

ADR 的文档分类、显著性准入、颗粒度、生命周期、关系和存量整理统一遵守：

- [Architecture Decision Governance](../../.agents/skills/architecture-decision-governance/SKILL.md)
- [架构决策治理标准](../../.agents/skills/architecture-decision-governance/references/governance-standard.md)

本 README 只保存项目专属操作、当前决策地图和完整历史目录，不复制治理理论。写作结构见 [0000-template.md](./0000-template.md)。

## 项目约定

- ADR 使用中文，文件名为 `NNNN-<kebab-case-slug>.md`。
- 探索、产品范围、任务和验收先进入 `docs/plans/`；通过治理检查后才创建 ADR。
- 新 ADR 取当前最大已发布编号加一。未发布草稿可以重写、合并、删除和重新编号。
- 允许状态为 `Proposed`、`Accepted`、`Rejected`、`Superseded by NNNN`、`Deprecated`、`Withdrawn`。
- `Proposed` 只用于正在主动评审的决策；实现进度不写入状态。
- `Accepted` 决议不改写。结论变化时创建新 ADR，并建立双向 `Supersedes` / `Superseded by` 关系。
- 关系优先使用 `Supersedes`、`Depends on`、`Refines`、`Conflicts with`，不把模糊的“相关”作为默认关系。
- 代码或提交只在“为什么这样写不明显”时引用 ADR，不要求每个受影响文件都添加引用。

## 操作流程

1. 读取治理技能、当前决策视图、相关 ADR、计划和代码。
2. 运行 `python3 .agents/skills/architecture-decision-governance/scripts/audit_decisions.py .`。
3. 完成文档分类、G1-G4 显著性检查和独立取代测试；未通过时放到正确载体，不创建 ADR。
4. 搜索相同决策问题，判断是已有决策的证据、细化、冲突还是取代。
5. 从模板创建 ADR，并同步当前决策视图和完整历史目录。
6. 更新计划和代码中的 ADR 引用；文档变更只检查审计结果、引用和 `git diff`，无需构建。

## 当前决策视图

这里只展示当前 `Accepted` 决策。被取代、撤回或拒绝的条目只出现在完整历史目录。

### 引擎计算与运行时

| 决策 | 当前权威边界 |
|---|---|
| [0001](./0001-stat-container-as-unified-persistence-slot.md)、[0022](./0022-structured-modifier-provenance.md) | StatContainer 是持久属性槽与结构化 modifier 来源的统一载体 |
| [0002](./0002-member-runtime-attachments-as-prebattle-assembly-contract.md) | RuntimeAttachment 是成员战前装配契约 |
| [0003](./0003-skill-cost-as-pipeline-contract.md)、[0007](./0007-next-skill-cost-modifier-contract.md) | 技能消耗由纯 Pipeline 计算，成功扣费后由 FSM 消费一次性修正 |
| [0004](./0004-skill-percentage-import-semantics.md) | 外部技能百分比修正统一映射到静态百分比通道 |
| [0008](./0008-world-observable-as-spatial-medium.md) | 空间层只读取 WorldObservable 并保持确定性世界调度边界 |
| [0010](./0010-unify-procbus-and-attribute-watcher.md)、[0011](./0011-member-facts-dual-bus-paired-dispatch.md) | ProcBus 负责成员内响应，DomainEventBus 负责对外投影，权威结算点成对派发 |

### 应用状态与渲染

| 决策 | 当前权威边界 |
|---|---|
| [0009](./0009-persistent-render-runtime.md)、[0016](./0016-render-layer-architecture.md)、[0042](./0042-engine-service-owns-generic-engine-resources.md) | 应用持有唯一常驻 SceneRuntime；EngineService 拥有通用引擎资源，Session 持有实时引擎句柄并通过受限边界投影视觉内容 |
| [0014](./0014-routing-vs-state-management-baseline.md) | 路由表达主业务位置，状态机表达跨路由业务与服务生命周期 |
| [0021](./0021-aui-interface-state-machine.md) | AUI 状态机是跨模态交互状态的唯一来源 |
| [0037](./0037-aui-supervises-local-session-actors.md) | AUI 作为顶层 actor 统辖局部 Session child，具体输入先进入 child，控制向下、提案与事实向上 |

### 数据、同步与领域打包

| 决策 | 当前权威边界 |
|---|---|
| [0018](./0018-close-write-id-convergence-loop.md) | `write_id` 闭合服务端确认、幂等和 rollback 收敛环 |
| [0041](./0041-character-data-uses-pglite-live-view.md) | PGlite business view 是 Character 持久数据唯一响应式读源；Session 只管理未完成命令与会话状态，不建立渲染覆盖副本 |
| [0019](./0019-progressive-login-game-profile-sync-boundary.md) | `game_profile` 是本地主体与同步边界 |
| [0020](./0020-multi-game-domain-packaging.md) | 多游戏领域由源码目录隔离并由生成器发布命名空间 |

### Simulator 设计、运行与分析

| 决策 | 当前权威边界 |
|---|---|
| [0024](./0024-interactive-simulator-session-and-tasks.md) | 单一交互会话与可并行模拟任务具有不同生命周期 |
| [0046](./0046-compile-business-workflows-to-generic-engine-contracts.md) | Simulator 与 Character 在应用层把业务工作流编译为通用引擎执行和技术记录策略，Engine 不编码设计、验证、分析或预览模式 |
| [0026](./0026-simulator-owned-members-with-concrete-selection.md)、[0031](./0031-typed-member-relations-over-polymorphic-reference.md) | Simulator 独占成员编排，Member 使用按类型区分的显式关系 |
| [0027](./0027-scene-resolution-for-logic-and-visual-inputs.md)、[0032](./0032-resolve-member-flow-and-intrinsic-mob-ai-by-type.md) | 场景解析统一产出逻辑、视觉和 resolvedBehavior，运行时不回查多个持久来源 |
| [0028](./0028-capture-tick-snapshots-before-ui-throttling.md)、[0029](./0029-flat-typed-attribute-snapshot-contract.md)、[0044](./0044-store-tick-state-history-in-sab-segments.md) | Simulator 验证请求 Worker 记录可精确还原的 Tick 状态历史，历史以 SAB-only 分段保存，实时 UI 只消费独立的节流投影 |
| [0030](./0030-persist-simulator-design-not-run-output.md) | 只持久化 Simulator 设计，运行产出属于当前会话 |
| [0043](./0043-derive-recorded-actions-from-final-inputs.md)、[0034](./0034-recorded-member-flow-preserves-simulation-time.md) | 最终输入记录是行动接纳的唯一事实，行动录制从中派生并保留相对模拟时间 |
| [0035](./0035-apply-local-design-copy-diffs-to-original-entities.md)、[0036](./0036-design-copy-completely-defines-run-input.md) | DesignCopy 完整定义运行输入，并按实体身份差异应用回正式设计 |
| [0038](./0038-transfer-completed-run-output-to-simulator-session.md) | Engine 只拥有活动运行和尚未确认移交的产出，Session 拥有已接收的 RunRecord |
| [0039](./0039-character-skill-preview-uses-fsm-authoritative-branches.md) | Character 技能预览复用通用模拟分支和 Member FSM 权威，不复制可用性算法 |
| [0040](./0040-paired-typed-worker-rpc-contracts.md)、[0045](./0045-engine-lifecycle-uses-dual-ended-protocol-state-machine.md) | 通用 Worker transport 与 Engine 协议校验分层；实时生命周期由双端协议状态机表达，Worker 拥有已提交状态，Handle 只公开类型化命令和只读状态 |

## 历史链与撤回项

- 交互状态：`0012` -> `0021`。
- 运行时资源：`0015` -> `0042`。
- Simulator 输入隔离：`0023` -> `0025` -> `0036`。
- 行动录制：`0033` -> `0043`。
- `0005`：声明式 `onHitEffects` payload 提案未采用，已撤回。
- `0006`：`StatContainer` 内部刷新算法误归类为 ADR，已撤回；约束由代码、测试和注释维护。
- `0013`：AUI 决策过程中的 actor 布局方案被过度拆分，已撤回；当前边界见 `0021`。
- `0017`：同步与授权问题清单误归类为 ADR，已撤回；活跃事项见 `docs/plans/sync-and-auth-hardening.md`。

## 完整历史目录

| 编号 | 标题 | 状态 | 主要问题域 |
|---|---|---|---|
| [0001](./0001-stat-container-as-unified-persistence-slot.md) | StatContainer 作为持久化槽的统一载体 | Accepted | 引擎数据 |
| [0002](./0002-member-runtime-attachments-as-prebattle-assembly-contract.md) | Member runtime attachments as prebattle assembly contract | Accepted | 引擎装配 |
| [0003](./0003-skill-cost-as-pipeline-contract.md) | 技能消耗作为 Pipeline 契约 | Accepted | 技能计算 |
| [0004](./0004-skill-percentage-import-semantics.md) | 技能 Behavior Tree 导入中的百分比修正语义 | Accepted | 数据导入 |
| [0005](./0005-onhit-effects-via-attack-payload.md) | 命中后效果通过攻击 Payload 传递 | Withdrawn | 攻击通信 |
| [0006](./0006-stat-container-same-frame-dirty-convergence.md) | StatContainer 同帧脏值定点收敛 | Withdrawn | 实现算法误分类 |
| [0007](./0007-next-skill-cost-modifier-contract.md) | 下一技能消耗修正契约 | Accepted | 技能计算 |
| [0008](./0008-world-observable-as-spatial-medium.md) | 世界可观测属性作为空间介质 | Accepted | 世界模型 |
| [0009](./0009-persistent-render-runtime.md) | 常驻渲染运行时作为应用级场景底座 | Accepted | 渲染 |
| [0010](./0010-unify-procbus-and-attribute-watcher.md) | 合并 ProcBus 与 AttributeWatcher 为单一成员内事件总线 | Accepted | 引擎通信 |
| [0011](./0011-member-facts-dual-bus-paired-dispatch.md) | 成员事实在结算点成对派发到两条总线 | Accepted | 引擎通信 |
| [0012](./0012-intent-first-visual-control.md) | 意图优先的视觉控制 | Superseded by 0021 | 应用状态 |
| [0013](./0013-attention-machine-as-phase-independent-root-actor.md) | 注意力机作为阶段无关的根级 actor | Withdrawn | 决策过度拆分 |
| [0014](./0014-routing-vs-state-management-baseline.md) | 路由与状态管理分类基准 | Accepted | 应用状态 |
| [0015](./0015-runtime-resource-architecture.md) | 双引擎常驻与共享场景运行时 | Superseded by 0042 | 运行时资源 |
| [0016](./0016-render-layer-architecture.md) | 应用级场景渲染器架构 | Accepted | 渲染 |
| [0017](./0017-known-issues-sync-and-auth.md) | 数据同步与授权问题清单 | Withdrawn | 文档误分类 |
| [0018](./0018-close-write-id-convergence-loop.md) | 闭合 write_id 收敛环 | Accepted | 数据同步 |
| [0019](./0019-progressive-login-game-profile-sync-boundary.md) | 渐进式登录与 game_profile 同步边界 | Accepted | 数据同步 |
| [0020](./0020-multi-game-domain-packaging.md) | 多游戏领域源码与生成命名空间隔离 | Accepted | 领域打包 |
| [0021](./0021-aui-interface-state-machine.md) | AUI 行为状态机作为跨模态交互状态源 | Accepted | 应用状态 |
| [0022](./0022-structured-modifier-provenance.md) | StatContainer 使用结构化 Modifier 来源链 | Accepted | 引擎数据 |
| [0023](./0023-simulator-session-snapshot-isolation.md) | Simulator 会话采用方案快照隔离 | Superseded by 0025 | Simulator |
| [0024](./0024-interactive-simulator-session-and-tasks.md) | 交互式 Simulator 会话与模拟任务分离 | Accepted | Simulator |
| [0025](./0025-run-snapshot-at-validation-boundary.md) | 在验证边界捕获不可变运行快照 | Superseded by 0036 | Simulator |
| [0026](./0026-simulator-owned-members-with-concrete-selection.md) | Simulator 独占成员编排并选择具体参战配置 | Accepted | Simulator 数据 |
| [0027](./0027-scene-resolution-for-logic-and-visual-inputs.md) | 场景解析统一产出逻辑输入与静态世界资源 | Accepted | 场景解析 |
| [0028](./0028-capture-tick-snapshots-before-ui-throttling.md) | 每 Tick 捕获权威分析快照并在捕获后节流 UI | Accepted | 运行分析 |
| [0029](./0029-flat-typed-attribute-snapshot-contract.md) | 属性快照采用扁平路径与严格叶节点契约 | Accepted | 分析协议 |
| [0030](./0030-persist-simulator-design-not-run-output.md) | 只持久化 Simulator 设计而非运行产出 | Accepted | 持久化 |
| [0031](./0031-typed-member-relations-over-polymorphic-reference.md) | Member 使用分类型关系而非多态字符串引用 | Accepted | Simulator 数据 |
| [0032](./0032-resolve-member-flow-and-intrinsic-mob-ai-by-type.md) | 按成员类型解析成员流程与 Mob 固有 AI | Accepted | 场景解析 |
| [0033](./0033-record-accepted-actions-before-authoring-member-flow.md) | 只用被接纳的语义行动生成成员流程 | Superseded by 0043 | 行为录制 |
| [0034](./0034-recorded-member-flow-preserves-simulation-time.md) | 录制生成的成员流程保留相对模拟时间 | Accepted | 行为录制 |
| [0035](./0035-apply-local-design-copy-diffs-to-original-entities.md) | 本地设计副本按实体身份写回正式设计 | Accepted | 设计写回 |
| [0036](./0036-design-copy-completely-defines-run-input.md) | Simulator DesignCopy 完整定义运行输入 | Accepted | 运行输入 |
| [0037](./0037-aui-supervises-local-session-actors.md) | AUI 统辖局部交互 Session | Accepted | 应用状态 |
| [0038](./0038-transfer-completed-run-output-to-simulator-session.md) | 完成运行时把引擎产出移交 SimulatorSession | Accepted | 运行产出 |
| [0039](./0039-character-skill-preview-uses-fsm-authoritative-branches.md) | Character 技能预览复用 Member FSM 权威 | Accepted | Character 预览 |
| [0040](./0040-paired-typed-worker-rpc-contracts.md) | Worker RPC 使用成对类型化契约 | Accepted | 引擎通信 |
| [0041](./0041-character-data-uses-pglite-live-view.md) | Character 持久数据以 PGlite business view 为唯一响应式读源 | Accepted | Character 数据 |
| [0042](./0042-engine-service-owns-generic-engine-resources.md) | EngineService 拥有通用引擎资源 | Accepted | 运行时资源 |
| [0043](./0043-derive-recorded-actions-from-final-inputs.md) | 行动录制从最终输入记录派生 | Accepted | 行为录制 |
| [0044](./0044-store-tick-state-history-in-sab-segments.md) | Tick 状态历史采用 SAB-only 分段增量存储 | Accepted | 运行记录与线程通信 |
| [0045](./0045-engine-lifecycle-uses-dual-ended-protocol-state-machine.md) | 引擎生命周期采用双端协议状态机 | Accepted | 引擎生命周期与线程通信 |
| [0046](./0046-compile-business-workflows-to-generic-engine-contracts.md) | 业务工作流编译为通用引擎执行与记录契约 | Accepted | 应用与引擎边界 |

## 决策候选与实施计划

- [引擎决策候选清单](../plans/engine-decision-backlog.md)
- [同步与写入授权加固计划](../plans/sync-and-auth-hardening.md)
- [Simulator 最小验证闭环](../plans/minimum-validation-loop.md)
- [AUI 行为状态机迁移计划](../plans/0021-aui-interface-state-migration.md)
- [Simulator Tick 状态历史 SAB 性能重构计划](../plans/simulator-tick-state-history-sab-performance.md)
