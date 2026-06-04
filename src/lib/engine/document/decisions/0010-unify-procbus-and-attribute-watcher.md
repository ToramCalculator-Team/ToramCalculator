# 0010 - 合并 ProcBus 与 AttributeWatcher 为单一成员内事件总线

- **状态**: Accepted
- **日期**: 2026-06-05（Accepted：起步方案已落地，Step 3a/3b 完成）
- **决策层**: 编排层 / 通信
- **相关代码**: `src/lib/engine/core/World/Member/runtime/ProcBus/ProcBus.ts`、`src/lib/engine/core/World/Member/runtime/AttributeWatcher/AttributeThresholdSource.ts`、`src/lib/engine/core/World/Member/Member.ts`、`src/lib/engine/core/World/Member/runtime/Agent/CommonActions.ts`、`src/lib/engine/core/World/Member/attachments/RuntimeAttachmentInstaller.ts`、`src/lib/engine/core/Event/EventCatalog.ts`、`src/lib/engine/core/Event/BuiltInEvents.ts`
- **相关 ADR**: 0008（世界可观测属性作为空间介质，受击结算后 emit `damage.received` 到自身 ProcBus）

## 背景

成员内部目前有两套独立的「条件满足时唤醒 handler」订阅系统：

- **ProcBus**（`ProcBus.ts`）：按事件 mask 位与过滤，再跑 predicate / handler。事件源是 `status.entered/exited`、Pipeline `emit`、受击后的 `damage.received` 等离散事件。
- **AttributeWatcher**（`AttributeWatcher.ts`）：订阅 `StatContainer.onChange`，在属性值跨越注册阈值时唤醒 handler。事件源是 HP/MP 等属性跨阈值。

两者在结构上近乎同构：

1. 都按 `sourceId`（passive/skill/buff id）注册，卸载时 `unsubscribeBySource` / `unwatchBySource` 按来源批量清理。
2. handler 不可序列化；checkpoint 只导出注册元数据（ProcBus 导出 `{sourceId, mask}`，Watcher 导出 `{sourceId, path, threshold, direction}`），**restore 时都靠 passive/attachment 安装逻辑重新注册**，导出的数据本身仅供调试。
3. 都是每成员独立持有，跨成员事件由外部路由。
4. 都在 `Member.createBtCapabilities` 暴露成对的 subscribe/unsubscribe 能力，并由 `CommonActions` 的 `subscribeStatus` / `subscribeProc` / `watchThreshold` / `unsubscribeBySource` 四个声明式动作统一封装（attachments 走 `RuntimeAttachmentInstaller` 的 `installProcSubscriptions` / `installThresholdWatchers`，路径平行）。

差异只有一处：**触发判据不同**——ProcBus 是「mask 位与命中」，Watcher 是「数值跨越阈值」。

这带来的缠绕（见本轮架构分析）：

- 同一个意图（「XXX 时对 self 做一次性修改」）有两个家，§2.3.2 那棵决策树本质是在两套同构系统之间做人脑路由；`hook与触发层设计讨论结论.md` §2.3.6 甚至出现同一 passive（燃烧的斗志）「前期用 overlay、后期切 proc mask」「HP 类用 watcher」的分裂归属。
- 两套注册表、两套 checkpoint、两套 capabilities 字段、两套 installer 分支，都要手工保持对齐。
- `AGENTS.md`「通信机制角色」已把成员内响应统一命名为 ProcBus 一个角色，但代码里 Watcher 仍是平行的第二套实现，文档与代码不一致。

已确认的有利前提：`StatContainer` 有同帧 dirty drain + 重入保护（ADR-0006），watcher handler 回写属性会在同帧收敛、不自激。这让「阈值穿越转成一条事件喂进总线」在执行模型上安全。

需要决定：是否把 AttributeWatcher 并入 ProcBus，使「成员内响应总线」真的只有一套实现；若并，阈值这种**有状态的连续信号**如何表达成总线事件而不破坏 O(1)、checkpoint、回放确定性。

## 候选方案

### A. 维持两套独立系统（现状）

ProcBus 管离散事件，AttributeWatcher 管阈值，各自注册表 / checkpoint / capabilities。

- 优点：不动代码，零迁移风险；阈值穿越判定贴着 `StatContainer.onChange`，路径最短。
- 缺点：成员内响应有两个家，选哪个靠人脑决策树；两套 checkpoint / capabilities / installer 分支长期维护；与 `AGENTS.md` 已收敛的「ProcBus 是唯一成员内响应总线」叙述冲突。

### B. 单一事件模型：阈值穿越降格为事件源（本轮已选方向）

只保留 ProcBus 一条总线。AttributeWatcher 不再是独立订阅系统，降格为**喂总线的事件源适配器**：一个轻量组件继续订阅 `StatContainer.onChange` 做跨阈值检测，跨越的那一刻 `procBus.emit("attr.crossed", {path, threshold, direction, oldValue, newValue})`。订阅者统一通过 ProcBus 订阅 `attr.crossed`，用 predicate 过滤自己关心的 path/threshold。

所有「XXX 时 YYY」统一成 `subscribe(sourceId, mask, predicate, handler)` 一种形态。

- 优点：成员内响应只有一套注册表 / checkpoint / 订阅 API；阈值与离散事件统一为 mask→predicate→handler；与 `AGENTS.md` 角色表一致；新增触发类型只是新增事件源适配器，不新增机制。
- 缺点：`attr.crossed` 是高频候选事件（属性每帧可能变），若所有订阅者都订到同一个 `attr.crossed` mask，predicate 扇出会退化（每次属性变化唤醒所有阈值订阅者再逐个比 path）；阈值检测的「上次值 / 方向 / per-source 冷却」等连续信号状态要找新归属；既有 `watchThreshold` 动作与 installer 的 watcher 分支要迁移。

### C. 统一总线但保留两种 trigger 类型（合并注册表，不合并判据）

`subscribe(sourceId, trigger, handler)`，`trigger = MaskTrigger(mask) | ThresholdTrigger(path, value, dir)`。一套注册表、一套 checkpoint，但总线内部按 trigger 类型分派：mask 类走位与，threshold 类挂 `onChange`。

- 优点：迁移小（两套判据逻辑原样搬进一个类）；阈值判定仍贴 `onChange`，无 `attr.crossed` 扇出问题；checkpoint / capabilities 收敛成一套。
- 缺点：总线内部仍有 `if (trigger.kind)` 两条分支，「单一触发模型」只是名义上的；新增第三类触发（如「每 N 帧」）又要加一类 trigger 分支，没根治可扩展性。

## 决议

选 **B**，但对其唯一实质缺点（`attr.crossed` 扇出）施加约束，使其不退化：

1. **总线唯一**：删除 `AttributeWatcherRegistry` 作为独立订阅系统的地位。成员内只保留 `ProcBus` 一套注册表、一套 checkpoint、一套 `subscribe/emit` API。
2. **阈值适配器**：保留一个轻量 `AttributeThresholdSource`（由现 `AttributeWatcher` 的跨越检测逻辑收窄而来），它**只做一件事**：订阅 `StatContainer.onChange` → 检测跨越 → `procBus.emit`。它不再持有 handler、不再是订阅终点、不进 capabilities。它持有的「上次值」是纯派生状态，可由 checkpoint restore 后从 StatContainer 当前值重建。
3. **扇出留有升级路径,但起步不实现 per-path bit**:起步阶段 `attr.crossed` 是**单一事件**(占 EventCatalog 一个内置位),订阅者通过 ProcBus 订阅它、在 predicate 里按 `payload.path` + 阈值过滤。这沿用 ProcBus 现成的 mask→predicate→handler 链路,零架构改动。**已知的退化场景**:属性每帧变化会唤醒所有 `attr.crossed` 订阅者再逐个比 path——但当前阈值监控是少数 passive 的少数属性(HP/MP 为主),扇出基数小,不构成热点。**升级路径(文档化,不预先实现)**:若实测扇出成为热点,把 `attr.crossed` 拆成按 path 分配独立 bit(`attr.crossed:hp.current`),订阅者 mask 只命中自己关心的 path,退化即消失;此改造的前提与代价见下「代价」与「未决:EventCatalog 生命周期」。
4. **连续信号状态归适配器**:方向、上次值归阈值源适配器;per-source 冷却(现 installer 里的 `lastFiredTimeMs` 闭包)归订阅者 handler 自身,与现状一致——它本就不在 checkpoint 里、靠重放重建。
5. **声明式动作 / installer 收口**：`watchThreshold` 动作与 `installThresholdWatchers` 改为「向 `AttributeThresholdSource` 注册一个被监控的 (path, threshold)，并通过 ProcBus 订阅对应 `attr.crossed:<path>` mask」。对 passive / attachment 作者的声明式接口形状不变（仍是 path/threshold/direction/handler），只是底层落到总线。

理由：

1. 触发判据的差异（mask vs 阈值）是**事件源层**的差异，不是**订阅机制层**的差异。把它放在事件源（适配器）而非总线内部分支，才让总线真正单一、可无限加事件源而不改总线。这正是 C 做不到的根治。
2. checkpoint 已经是「元数据导出 + 安装逻辑重放」，两套合一套不增加回放复杂度，反而消除「两套元数据各自对齐」的腐化点。
3. 起步用单一 `attr.crossed` 位是**对需求颗粒度的诚实**:当前一个 passive 都尚未端到端跑通,扇出热点是假想敌而非实测瓶颈。先用零架构改动的方式跑通触发链路,把 per-path bit 留成文档化的升级路径——「未来可能的问题」记在 ADR 里、有明确升级方案即可,不必在热点出现前就改 EventCatalog 生命周期。这正是本 ADR 与「过度设计」的分界。
4. 与 ADR-0008 一致：0008 已确立受击后 emit `damage.received` 到自身 ProcBus，本 ADR 把「阈值穿越」也收进同一条总线，成员内「事实发生 → 总线 → 响应」彻底单通路。

## 代价

这个决策放弃了什么：

1. **放弃阈值判定的最短路径**：现状 watcher handler 直接挂在 `onChange` 上，跨越即调用。改为「onChange → 适配器检测 → emit → 总线 → predicate → handler」多了 emit + 派发两跳。对 HP/MP 这种低频阈值可忽略，但它是真实的间接层增加。
2. **predicate 扇出（起步方案的已知代价）**：单一 `attr.crossed` 位下，任一被监控属性变化都唤醒全部 `attr.crossed` 订阅者再逐个比 path。当前阈值订阅基数小（少数 passive 的 HP/MP），可接受；基数变大时按「升级路径」拆 per-path bit。
3. **一次迁移**：`AttributeWatcherRegistry` 的公开 API、`Member.attributeWatchers` 字段、capabilities 的 `watch/unwatchBySource`、installer 的 watcher 分支、checkpoint 的 `attributeWatchers` 段都要改。BtEditor 预览运行时的 mock 也要跟。

什么情况下会后悔：如果实测发现**绝大多数属性都需要阈值监控**，则连 per-path bit 升级路径也救不了——per-path mask 稀疏优势消失、位宽爆炸，此时 C 方案（threshold trigger 直接挂 onChange、完全不进 mask 空间）反而更省。届时需新 ADR 把阈值源从「mask 事件」退回「总线的一类专用 trigger」。当前判断阈值监控是少数 passive 的少数属性（HP/MP 为主），赌它稀疏；起步方案不赌位宽，先零改动跑通。

## 未决：EventCatalog 生命周期（仅升级到 per-path bit 时才需要解）

起步方案（单一 `attr.crossed` 位）**不触及**本节——它只占一个内置位，`BUILT_IN_EVENTS` 里加一条即可，EventCatalog 维持「worker 启动用内置集合一次性 `Object.freeze`」现状（见 `Simulation.worker.ts:154`，infra 跨 reset 复用、早于任何 `loadScenario`）。

仅当走「升级路径」拆 per-path bit 时，才需要解决：`attr.crossed:<path>` 的 bit 依赖「哪些 path 被监控」，而 EventCatalog 在场景加载前就冻结了，无法静态预知 path。两条出路（升级时再定，不预先实现）：
- 放宽 EventCatalog 为「加载期可追加、之后冻结」，`loadScenario` 扫描 attachment/skill 声明的阈值 path 后追加位。
- 或保持冻结，但要求阈值 path 来自一个**编译期已知的封闭枚举**（如 MemberBaseSchema 的数值属性集），启动时即可全量预注册。

记此为已识别的未来工作，不在本 ADR 起步范围内动手。

## 影响范围

- **代码层面**：
  - `ProcBus`：保持订阅/checkpoint 主体不变；阈值穿越经现成 `emit("attr.crossed", payload)` 进入，无需新 API。
  - `AttributeWatcher.ts`：从「独立订阅注册表」收窄为 `AttributeThresholdSource` 适配器——只保留跨越检测 + emit，删除 handler 存储 / `watch` 返回订阅 id / 独立 checkpoint。
  - `Member.ts`：`attributeWatchers` 字段语义变为「阈值源适配器」；`createBtCapabilities` 移除 `watch/unwatchBySource`（订阅统一走 `subscribeByName`）。`setEventCatalog` 装配处把适配器接到 ProcBus。
  - `CommonActions.ts`：`watchThreshold` / `unsubscribeBySource` 改为底层走 ProcBus（注册被监控 path + 订阅 `attr.crossed`）；对外动作 schema 不变。
  - `RuntimeAttachmentInstaller.ts`：`installThresholdWatchers` 改为注册阈值源 + ProcBus 订阅；`lastFiredTimeMs` 冷却保持在 handler 闭包。
  - `BuiltInEvents.ts`：新增一条 `attr.crossed` 内置事件（payload: path/threshold/direction/oldValue/newValue）。`EventCatalog.ts` 维持启动冻结现状，**不**改生命周期（per-path bit 升级路径见「未决」节）。
  - `previewRuntime.ts`（BtEditor）：mock capabilities 同步移除 `watch`。
  - checkpoint：`MemberCheckpoint` 移除 `attributeWatchers` 段；restore 路径靠安装逻辑重放不变。
- **文档层面**：
  - `AGENTS.md`「通信机制角色」：把 AttributeWatcher 从「规划中降格」更新为「已降格为 ProcBus 事件源」。
  - `hook与触发层设计讨论结论.md` §2.3.2 决策树、§2.3.3 / §2.3.4 / §2.3.6：本 ADR Accepted 后，该历史文档中「三种订阅形式并存」的结论被本 ADR 取代（在本 ADR「相关 ADR」标注，不改历史文档正文）。
  - README 待拆清单：勾掉「属性变更委托（watcher）借鉴 GAS」「Proc mask 事件总线」两条——它们由本 ADR 合并落地。
- **迁移**：分两步——(1) 引入 `AttributeThresholdSource` 适配器并让 `attr.crossed` 与现 watcher 并行跑通一个试点 passive（HP 紧急回复）；(2) 切换 `watchThreshold` / installer 到总线后删除旧 `AttributeWatcherRegistry`。两步之间可 checkpoint 兼容（旧段保留为空）。

## 参考

- `src/lib/engine/document/hook与触发层设计讨论结论.md` §2.3.2~2.3.6：三种订阅形式并存的原始结论（本 ADR 收敛为一种）。
- ADR 0006：StatContainer 同帧脏值定点收敛（保证 watcher 回写不自激的前提）。
- ADR 0008：受击后 emit `damage.received` 到自身 ProcBus（成员内总线的既有事件源先例）。
- Unreal GAS `OnGameplayAttributeValueChange`：阈值委托的参考实现（现 AttributeWatcher 的借鉴源）。
