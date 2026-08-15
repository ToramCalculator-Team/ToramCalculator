# 实时世界状态 SAB 迁移计划

- **状态**: 待实施
- **日期**: 2026-08-15
- **相关决策**: ADR 0050、0051、0052；属性与历史边界依赖 ADR 0029、0044
- **目标**: 用一个版本化实时状态 SAB 替代高频 `FrameSnapshot` 和分散的渲染状态通道，让 UI 与渲染器读取同一份最新世界状态。

> **决策前置**：当前 ADR 0052 仍包含“渲染层不接收离散视觉事件”的旧边界。本计划采用“动作事件 + 连续状态 SAB”的新边界，正式实施前必须通过新 ADR 修订或取代该冲突条款；本计划不改写已发布 ADR 的历史正文。

## 范围

本计划处理实时连续世界状态及其消费者迁移：成员状态、完整成员属性、modifier 来源、区域状态、静态视觉资源注册表的接入、UI 最新视图和渲染最新视图；同时收敛动作事件与连续状态在渲染层的职责边界。

保留以下独立路径：

- 技能、施法、攻击、闪避、格挡、受击、死亡、目标切换和输入确认等按语义保留的离散事件通道。
- telemetry 和生命周期 RPC。
- ADR 0044 定义的完整 Tick 状态历史 SAB。

渲染层同时消费三类输入：静态视觉资源注册表、实时状态 SAB 和职责明确的动作事件。动作事件只表达动作实例的开始、重启或结束，不承载位置、属性或逐帧动画进度；SAB 保存当前动作状态，供渲染器在初始化、丢失事件或提交跳跃后恢复当前世界。渲染器按本地渲染帧推进动画，不等待引擎逐 Tick 发送动画进度。

## 固定基线

### 首版布局容量

- Player 基础属性叶子：138。
- Mob 基础属性叶子：31。
- 动态属性：按成员场景装配后的去重 `attributeSlots` 精确分配。
- Modifier entry：默认每成员 256，按 `nextPowerOfTwo(max(128, P + 80))` 计算，硬上限 512。
- Area state：世界级 256 个并发槽位。
- 离散动作事件：不设统一全局容量或合并规则；同一成员同一 Tick 内的多个动作实例必须逐条保留，具体通道单独定义容量、溢出诊断和消费者策略。
- 动作速率输入：不在 SAB 中新增重复的 `actionRate` 字段；渲染器从 `MemberAttrTable` 按 `AttributeSchemaTable` 的稳定索引读取成员行动速度属性 `mspd`，再按动作动画契约换算本地播放速率。移动速度字段 `MemberStateTable.speed` 不得用于替代 `mspd`。

这些数字是首版协议预算，不是允许运行时覆盖旧状态的软限制。布局不足时必须在 Worker 与 Session 协商阶段失败或重新创建新布局。

### 渲染器接入时机与动画恢复策略

渲染器接入引擎的时机分为两类，采用不同的初始化和动画恢复策略：

#### 类型1：同引擎一起初始化（主流路径）

适用场景：玩家主动进入战斗、新场景加载、模拟器验证场景。

**策略**：引擎等待渲染器初始化完成后才开始模拟。渲染器从第一个 Tick 开始接收所有动作事件，完全避免动画恢复问题。

**实施要点**：
- Session 初始化流程中，在创建 Worker 和 SAB 后、通知引擎开始模拟前，等待渲染器就绪信号。
- 设置合理超时（5-10秒），超时后仍启动引擎，渲染器降级为类型2路径。
- 渲染器初始化完成后调用 `markRendererReady()` 通知 Session。

#### 类型2：运行中接入（特殊路径）

适用场景：调试时重启渲染器、观战中途加入、重连（如果支持）。

**策略**：渲染器中途接入时，从 SAB 读取当前世界状态，按动作语义分类恢复：

- **静态姿态**（idle、dead）→ 直接应用对应动画
- **持续动作**（move）→ 从当前状态开始播放，不需要知道历史进度
- **瞬时动作**（hit、attack、cast）→ 已错过触发时机，快速恢复到 idle

之后的动作事件正常处理。此策略接受短暂的视觉不连续（瞬时动作直接跳过），但对特殊场景足够好。

**实施要点**：
- 渲染器连接时读取 SAB 最新提交，按活动槽位创建/更新实体。
- 根据 `MemberStateTable.currentAction` 的语义分类应用初始动画。
- 不需要在 SAB 中维护全局逻辑时间或动作已持续时长。
- 如果后续发现视觉不连续不可接受，可仅为持续动作增加开始时间字段，瞬时动作仍保持"忽略"策略。

## 阶段 0：事实基线与协议草案

- [ ] 列出 `FrameSnapshot`、`RenderSnapshot`、`latestFrame`、`worldStateBuffer` 和当前领域事件批的全部生产者与消费者。
- [ ] 记录每个消费者需要的字段，确认 UI 与渲染器都从实时状态 SAB 读取，不再从消息对象补字段。
- [ ] 为 Member、Area、Attribute、Modifier、Source、Chain 定义版本化布局描述符和目录字段，明确 `active`、槽位代次和 `visualProfileId` 等实体生命周期字段。
- [ ] 建立静态 `VisualProfileRegistry` 资源清单：模型、外观和动画映射只在渲染器本地或 Session 初始化时提供一次，不进入 SAB。
- [ ] 确认初始实体和运行中召唤物使用同一资源解析规则；预注册 `visualProfileId` 的召唤物只通过活动槽位出现，不重新请求资源清单。
- [ ] 定义动作状态字段：当前语义动作、动作实例代次、活动/结束标志；不得把逐帧 `progress` 或动作开始时间锚点写入 SAB（类型1接入不需要，类型2接入按语义分类恢复）。
- [ ] 定义动作事件协议：动作名称、实体 ID、`actionInstanceId`、开始/结束模式和必要的一次性逻辑阶段时长；同一动作的重复实例不得按成员和 Tick 合并。
- [ ] 确认 `mspd` 在 `AttributeSchemaTable` 中的稳定索引，以及 `mspd` 到本地动画播放倍率的换算契约；渲染器不读取 Modifier 链或状态实例来重复计算行动速度规则。
- [ ] 定义渲染器接入模式和恢复策略：`WAIT_FOR_RENDERER`（引擎等待渲染器就绪）和 `LATE_JOIN`（中途接入按动作语义分类恢复：静态姿态直接应用、持续动作从当前开始、瞬时动作恢复到idle）。
- [ ] 定义 `markRendererReady()` 和 `waitForRendererReady()` 接口，明确 `WAIT_FOR_RENDERER` 模式的超时策略（5-10秒）和失败回退到 `LATE_JOIN`。
- [ ] 明确 `commitVersion`、seqlock / 原子提交规则、读失败策略和布局版本校验。
- [ ] 定义渲染器的完整提交读取接口，避免逐槽位读取导致成员、区域和动画来自不同提交。
- [ ] 明确场景布局协商时机：Worker 完成成员装配后返回目录，Session 创建 SAB，再通过 RPC 附加给 Worker。
- [ ] 为超出 512 modifier 或 256 area 的错误定义稳定诊断码，禁止静默截断。

## 阶段 1：实时状态 SAB 核心读写器

- [ ] 将当前仅有成员位置的 `worldStateBuffer` 重构为统一实时状态 SAB，不建立第二套并行缓冲区。
- [ ] 实现 Header、MemberDirectory、AttributeSchemaTable 和 MemberStateTable 的创建、校验与读写；MemberDirectory 支持活动标记、槽位代次、实体类型/视觉资源引用和动态召唤物占用。
- [ ] 实现 MemberAttrTable 的动态 offset/count 布局；从 `StatIndexedReadSource` 直接写入 base、act 和 modifier 汇总值。
- [ ] 在 MemberAttrTable reader 中提供按稳定属性索引读取 `mspd` 的接口；不要为动画播放倍率复制一份独立的 SAB 状态。
- [ ] 在 MemberStateTable 中实现当前动作语义、动作实例代次和活动标志的读写；不写入动作开始时间锚点、动画 `progress` 或 Babylon `speedRatio`。
- [ ] 实现 ModifierEntryTable、ModifierSourceTable、ModifierChainTable 的固定宽度编码和来源索引。
- [ ] 实现 AreaStateTable 的 256 槽位、活动标记、形状、位置、剩余时间和来源成员索引。
- [ ] 为成员和召唤物验证空闲槽位分配、槽位复用、代次变化和超出容量错误；不通过消息命令创建第二套实体生命周期。
- [ ] 增加布局版本、长度、容量、offset 对齐和提交序号的单元测试。
- [ ] 覆盖 Player 138 属性、Mob 31 属性以及带重复动态槽声明的去重测试。

## 阶段 2：Worker 附件与单次提交

- [ ] 将场景加载后的成员装配结果转换为实时状态布局描述符，并在 Session 初始化时准备静态视觉资源注册表或一次性资源清单。
- [ ] 把 SAB 创建和 Worker 附件改为两阶段协议，不在主线程猜测动态属性或 modifier 容量。
- [ ] Worker 在每个 Tick 结算完成后以同一个提交序号写入成员状态、属性和区域；不得分别提交不同表。
- [ ] 在 SAB 附加后确保完整当前状态可被读取，使 UI 和渲染器可以从任意稳定提交建立世界，无需等待下一 Tick 或识别特殊初始提交。
- [ ] 实现 `markRendererReady()` 和 `waitForRendererReady()` 接口；Session 在 `WAIT_FOR_RENDERER` 模式下等待渲染器就绪信号，超时（5-10秒）后降级为 `LATE_JOIN` 模式并启动引擎。
- [ ] 确保动作状态与成员属性在同一提交序号下可读取；渲染器读取当前动作基线后从本地相位开始推进，并按 `mspd` 的最新值调整播放速率。
- [ ] 在 pause、stop、reset、场景重载和 Session 释放时验证 writer 的解绑顺序。
- [ ] 为 SAB 不可用、布局版本不匹配、容量不足和读重试耗尽增加明确错误路径。

## 阶段 3：UI 迁移

- [ ] 新增主线程实时状态 reader 和提交版本调度器；SAB 写入本身不直接触发 Solid 响应式更新。
- [ ] 将 `SimulatorValidationView` 从 `latestFrame.members` 改为按 MemberDirectory 和属性索引读取。
- [ ] 将 `MemberStatusPanel` 的属性展示改为从 SAB reader 生成按需投影，不在每次提交中重建完整字符串来源对象。
- [ ] 明确 UI 只保存最新 reader 投影，不保留 `FrameSnapshot` 队列或中间帧。
- [ ] 验证成员切换、场景重载、暂停恢复、Session 切换和 SAB 释放后的读写隔离。

## 阶段 4：渲染迁移

- [ ] 将 `RenderSyncSystem` 改为读取统一实时状态 SAB 的一致提交，不依赖某个特殊的”初始提交”版本。
- [ ] 让渲染器在静态资源注册表就绪后读取任意稳定提交，按活动槽位建立当前实体；初始化完成后立即继续读取最新提交，允许跳过中间提交。
- [ ] 渲染器初始化完成后调用 `markRendererReady()` 通知 Session；在 `WAIT_FOR_RENDERER` 模式下，引擎收到信号后开始模拟。
- [ ] 实现 `LATE_JOIN` 模式的动作恢复逻辑：读取 SAB 当前动作状态，按动作语义分类处理（静态姿态直接应用、持续动作从当前开始、瞬时动作恢复到idle）。
- [ ] 让初始实体和运行中召唤物走同一套 `visualProfileId`/实体类型到本地资源注册表的解析流程；新实体出现时由状态差异触发创建。
- [ ] 将区域位置、生命周期和形状改为读取 AreaStateTable；单体攻击使用点状表现，区域攻击按区域形状绘制。
- [ ] 将成员当前语义动作和动作实例代次写入 SAB；不写入动作开始时间锚点或逐帧动画进度。渲染器从 MemberAttrTable 读取 `mspd`，在本地渲染时钟中按行动速度推进动画。
- [ ] 保留职责明确的动作事件消费：动作开始/重启事件选择并启动语义动画，动作结束事件停止或恢复持续动作；同一成员连续受击必须按不同 `actionInstanceId` 分别触发。
- [ ] 验证动作事件只驱动动作边沿，连续播放速度和当前动作状态由 SAB 与本地渲染时钟共同完成；渲染器不得把本地相位写回 SAB。
- [ ] 删除渲染层对高频 `RenderSnapshot` 成员位置和区域数组的依赖。
- [ ] 保留渲染器本地插值和连续性中断处理，但不得把插值状态写回 SAB 或成为第二权威源。
- [ ] 删除 `RendererCommunication` 对 `renderSnapshotApplied` 和启动前通用 `render_cmd` 回放缓冲的依赖；动作事件使用独立、可验证的实时投影入口，不与实体状态命令混用。
- [ ] 验证成员重建、区域过期、场景切换和 SAB 读失败时的清理行为。
- [ ] 测试 `WAIT_FOR_RENDERER` 模式的超时回退和 `LATE_JOIN` 模式的中途接入视觉连续性。

## 阶段 5：跨线程通道边界审计

- [ ] 确认连续世界状态不再通过 `render_cmd`、`RenderSnapshot` 或其他消息对象补充；实体、区域和持续动画由 SAB 驱动。
- [ ] 确认 `render_cmd` 的状态同步职责已删除；若保留兼容入口，只允许承载类型明确的动作事件，不得继续承载 spawn、destroy、位姿、区域、相机或连续动画状态。
- [ ] 动作事件不得使用会合并同成员同类事件的 `DomainEventBus` 默认投影；审计同一 Tick 内连续受击、连续攻击和动作重启不会丢失实例。
- [ ] 不建立全局离散事件 envelope、全局消费确认或统一容量；只对确有逐次不可丢失语义的动作事件通道定义 `actionInstanceId`、顺序、溢出诊断和实时消费者策略。
- [ ] 单独审计 `EventQueue` 满载返回失败的引擎内部语义，不把它与 Worker 到渲染器的状态投影混为一谈。
- [ ] 确认 ProcBus、EventQueue、DomainEventBus 的引擎内部角色不被跨线程协议变更破坏。

## 阶段 6：删除旧实时快照路径

- [ ] 删除 `frame_snapshot` push 生产与订阅、`latestFrame` 和 `setRealtimeSnapshotHz`。
- [ ] 删除 `FrameSnapshot` 在实时 UI 中的剩余生产代码和重复属性对象导出。
- [ ] 删除旧 `get_render_snapshot` / `RenderSnapshot` 初始化通道及其生产消费者。
- [ ] 删除 `render_cmd` 的状态命令生产与消费，包括 `spawn`、`destroy`、位姿校正、持续动画、区域同步和相机目标命令；动作事件迁移到职责明确的动作事件入口，不得与状态同步重新合并。
- [ ] 删除渲染器启动前通用命令缓冲及 `markRenderSnapshotApplied`，确认渲染器可在任意稳定 SAB 提交上建立当前世界；实时动作事件只处理连接后的动作实例，不回放已结束历史动作。
- [ ] 全仓搜索确认实时 UI、渲染器和 Session 不再读取旧快照路径；Tick 历史路径仍只依赖 ADR 0044 的历史 SAB。
- [ ] 删除不再需要的 FrameSnapshot schema 字段：timestamp、engine 统计、byController、selectedMemberDetail 和重复 Buff 视图；保留历史或调试用途前先确认消费者为零。

## 验证与完成条件

- [ ] 运行 SAB reader/writer、布局协商、seqlock、容量校验和超限错误测试。
- [ ] 运行 Member 属性、modifier provenance、Area 生命周期和场景重载测试。
- [ ] 运行 Worker 生命周期、Session 切换、UI reader 和渲染 reader 测试。
- [ ] 使用 60 Hz、8 成员、持续创建区域的短时负载验证提交延迟、读重试和内存占用。
- [ ] 验证 UI 与渲染器在同一提交版本上读取相同成员位置、属性和区域状态，允许跳过中间提交。
- [ ] 验证渲染器从任意稳定提交启动、初始化期间跳过旧状态命令、召唤物通过活动槽位创建，以及槽位复用不会残留旧实体。
- [ ] 验证 `WAIT_FOR_RENDERER` 模式：引擎等待渲染器就绪信号后开始模拟，渲染器从第一个 Tick 接收所有动作事件，无动画恢复问题。
- [ ] 验证 `WAIT_FOR_RENDERER` 模式的超时回退：超时后引擎启动，渲染器降级为 `LATE_JOIN` 模式。
- [ ] 验证 `LATE_JOIN` 模式：渲染器中途接入时按动作语义分类恢复（静态姿态、持续动作、瞬时动作），接受短暂视觉不连续。
- [ ] 验证 `mspd` 属性变化会在后续渲染帧调整本地动作播放速率，不产生引擎逐帧动画进度消息，也不把 Babylon 播放速率写回引擎。
- [ ] 验证同一成员同一 Tick 内两次受击、两次普通攻击和动作重启都产生不同 `actionInstanceId` 并分别触发；状态 SAB 只负责恢复最终当前动作。
- [ ] 验证连续动画在 60 Hz 渲染频率下保持本地连续推进，不依赖引擎逐帧消息。
- [ ] 相关 TS 路径运行 `pnpm biome check`；修改 Worker、Vite、Service Worker 或包入口时再运行 `pnpm build`。
- [ ] 完成旧实时快照路径清零后，删除本计划文件，并把长期有效的代码契约和验收结果留在 ADR、类型与测试中。
