# Reactor 计算模型改造讨论记录

- **状态**: 讨论中（中间工作产物，非决策文档）
- **日期**: 2026-11-02
- **性质**: 记录引入 Reactor 计算模型后的概念体系与已达成的设计取舍，供后续 ADR 与计划修订取材。定稿内容应迁移到 `docs/decisions/` 与模块文档。
- **相关**: `docs/plans/declarative-logic-system-refactor.md`、`docs/plans/engine-blackboard-communication-refactor.md`、ADR 0059、ADR 0060、`docs/translations/3448128-确定性并发系统的通用协调语言.md`

## 1 前提与范围

引擎的调度由 Reactor 模型接管：`GameEngine` 的 tick 调度与 `World` 的两相调度都归入 Reactor 运行时。本期不涉及跨机分布式，只做单进程多 worker 内的 Reactor 网络。

`src/lib/Reactor/` 是 reactor-ts 官方仓库的 core 运行时副本，含 17 个 TS 文件与 `share/`，**不含 `federation.ts`**。`core/reactor.ts:2237` 注释写明的"此函数由 `federation.ts` 覆盖"在本地副本中没有对应实现，联邦执行能力不随此副本提供。

## 2 事实基础

讨论中核对过的代码事实：

| 事实 | 位置 |
|---|---|
| `Tag` 由逻辑秒、纳秒、微步构成 | `reactor/core/time.ts:333` |
| `Tag.getLaterTag(delay)` / `getMicroStepsLater(n)` 是两个时间推进维度 | `reactor/core/time.ts:414,428` |
| `Timer` 是自带 offset 与 period 的可调度触发器 | `reactor/core/reactor.ts:81` |
| `Action.schedule(extraDelay, value, intendedTag?)` 调度未来一次性事件 | `reactor/core/action.ts:26,64` |
| 调度器实现在 `App extends Reactor` 内，不在独立对象上 | `reactor/core/reactor.ts:1747` |
| `_canProceed(event)` / `_advanceTime(tag)` / `_startTimeStep()` 是联邦化的三个钩子，本地为恒真/空实现 | `reactor/core/reactor.ts:2180,2190,2237` |
| `App._next()` 落后于物理时间时用零延迟定时器展开调用栈追赶 | `reactor/core/reactor.ts:2329,2347` |
| 队列空且未开启 `keepAlive` 时 `App` 主动 shutdown | `reactor/core/reactor.ts:2400` 附近 |
| `Bank` 按同一类批量构造成员，`port()` 返回端口数组 | `reactor/core/bank.ts:38,72` |
| 连接期检查会拒绝直通、环、mutation 因果环 | `reactor/core/reactor.ts:CanConnectResult` |
| `WorldStateWriter` 是输出 SAB 的唯一写入方，定长槽位整块覆盖 | `engine/thread/worldStateBuffer.ts:739,930,954` |
| 控制器输入 SAB 是单槽快照 + seqlock，不是环形缓冲；读不稳定返回 `null` | `engine/thread/controllerInputBuffer.ts:26-100` |
| `World.tick()` 与 `World.loadScenario()` 目前是空实现 | `engine/core/World/World.ts:65,54` |
| `GameEngine` 以 `tickIndex * stepMs` 推进，漂移超一步抛错 | `engine/core/GameEngine.ts:24,31,209,220` |
| `MemberManager` 通过八个 setter 向成员注入能力 | `engine/core/World/MemberManager.ts:73-158` |
| `SpaceManager` 是被动查询结构 | `engine/core/World/SpaceManager.ts:50,77` |

## 3 概念体系

### 3.1 时间与调度

| 概念 | 职责 | 位置 |
|---|---|---|
| **Tag** | 时间的唯一标识，由逻辑秒、纳秒、微步构成。因果先后由 tag 比较得出 | `reactor/core/time.ts:333` |
| **Timer** | 周期触发器。模拟网格、输入收账、远间隔 AI 决策都是 Timer，period 即该区域的推进密度 | `reactor/core/reactor.ts:81` |
| **Action** | 一次性未来触发，带延迟。buff 过期、技能段间隔、冷却完成 | `reactor/core/action.ts:26` |
| **App** | 单进程调度器。持有事件队列与反应队列，推进 tag，落后时压缩追赶 | `reactor/core/reactor.ts:1747` |
| **GameEngine** | 生命周期与物理时钟。创建 `App`、注册 Timer、start/stop、场景加载 | `engine/core/GameEngine.ts` |
| **GameEngineSM** | 对外运行状态（运行/暂停/停止）与场景装载、快照编排 | `engine/core/GameEngineSM.ts` |

### 3.2 网络与通信

| 概念 | 职责 | 位置 |
|---|---|---|
| **Reactor** | 有状态计算单元。私有状态加一组反应，对外只有端口 | `reactor/core/reactor.ts:140` |
| **Reaction** | 一次执行：读入端口、改自身状态、写出口端口 | `reactor/core/reaction.ts` |
| **Cell** | 反应器私有状态槽位，只有本反应器可读写 | `reactor/core/state.ts` |
| **InPort / OutPort** | 反应器之间的唯一通道，构造期接线，运行期不可变 | `reactor/core/port.ts:228,230` |
| **Bank** | 同构反应器的批量容器，按索引取实例与端口数组 | `reactor/core/bank.ts:38,72` |
| **MultiPort** | 把 Bank 里同一端口汇成一条流 | `reactor/core/multiport.ts` |

### 3.3 逻辑建模

规则层只有三种概念，由用户书写：

| 概念 | 职责 |
|---|---|
| **FSM 图** | 状态集合、转移条件、每个转移挂哪棵树 |
| **节点树** | 一棵 BT 的 JSON/DSL 定义，描述一个转移内部或一个状态存续期间的行为 |
| **节点实现** | 树内节点的函数实现，声明自身能力面（发出什么效果、读什么状态字段） |

运行时层由适配器生成，不手写：

| 概念 | 职责 | 约束 |
|---|---|---|
| **MemberReactor** | 每个成员唯一的 reactor。持有 context 的 `Cell`、事件 `InPort`、效果 `OutPort` | 反应器数量等于成员数量，不随逻辑数量增长；加载后定义不可变 |
| **FSM 解释器** | 库层纯函数：`step(context, events)` 返回新的 context、效果列表与运行中的树状态 | 不感知调度，可脱离 reactor 单测；`after` 时长由调用方编译为 `Action`；`invoke` 禁用 |
| **行为树实例** | FSM 持有的 `running` 状态之一，跨 tag 存于 `Cell` | 树定义来自 JSON/DSL，节点实现来自注册表；转移期间执行的树必须同步完成，状态存续期间持有的树允许 `RUNNING` |
| **规则包（GamePlugin）** | 声明 FSM 图、树定义、节点实现、属性 Schema，向引擎注册 | 注册完成后运行期不再访问规则层 |

### 3.4 边界组件

| 概念 | 职责 | 约束 |
|---|---|---|
| **InputSampler** | 网络内反应器。按 Timer 在 tag 边界读控制器 SAB，区间聚合后写入网络 | 采样高频，入账只在边界；聚合规则按模拟轴、按键、点按分三类 |
| **InputSnapshot** | 一个区间内交付给模拟的恒值输入 | 输入日志记录它，重放喂同一份 |
| **OutputSampler** | 网络外层。tag 结算后主动读端口，对照订阅表裁剪，写 SAB 并发布帧序号 | 单写者；写入值不回流成反应器输入 |
| **WorldStateWriter** | 输出 SAB 帧数据唯一写入方 | `engine/thread/worldStateBuffer.ts:739` |
| **订阅表** | 决定哪些路径做快照并写入 SAB 事件区 | 归 `OutputSampler`；为空时模拟结果不变 |

### 3.5 状态、求值与产出

| 概念 | 职责 |
|---|---|
| **AttributeContainer** | 属性求值。纯数据驱动：脏位图加拓扑序 drain，不感知时间 |
| **DependencyGraph** | 属性依赖的缓存与失效，失效由数据变化触发 |
| **Random** | 确定性随机，种子流按 tag 派生 |
| **SpaceManager** | 空间索引与范围查询，由反应按需调用 |
| **Checkpoint** | 快照与恢复，存 Cell 状态、当前 tag、各 host 的树状态 |
| **runOutput / tickStateHistory** | 运行记录，以模拟时间为权威顺序轴（ADR 0060） |

## 4 设计取舍

### 4.1 连续量与离散量的处理

连续量不构成独立子系统，被拆成三类：

| 类别 | 处理 | 依据 |
|---|---|---|
| 时长与区间（buff 持续、冷却） | 两个离散事件：施加与过期。线性 ramp 的 modifier 保存「函数 + 生效区间」，求值时代入 reaction 的 tag | 不需要逐帧推进 |
| 物理与运动 | 真连续。积分在一个反应内部完成，外部看是"某个 tag 上的一段计算"。阈值穿越解析求出精确时刻，作为该 tag 上的离散事件发出 | 时刻由事件决定，不需要等距刻度 |
| 控制器输入 | 外部信号。区间内零阶保持，与通信重构的输入快照是同一件事 | 异步到达，需绑到 tag |

分离的轴是**积分器与事件网络**，不是连续系统与离散系统：事件网络拥有时间基准，积分器是无时间的纯函数，由事件在特定 tag 上调用。

属性求值是惰性的，不是累积的：`f(t)` 只取决于 tag，无累积误差。缓存作用域限制在单次 reaction 执行内，跨 tag 不复用。

### 4.2 调度器归属

调度器归 `App`，不归 `GameEngine`。`GameEngine` 保留生命周期与物理时钟，时钟由引擎创建并注入给运行时（见 9.1）。`App._canProceed` / `_advanceTime` / `_startTimeStep` 保持默认实现，暂不抽象为接口，等实际做联邦执行时再改。

### 4.3 周期源

系统循环消失，周期由 `Timer` 表达。时间轴上不存在等距刻度：`App._next()` 直接跳到下一个已排队事件的 tag。

| 周期源 | 位置 | 机制 |
|---|---|---|
| 控制器采样 | 主线程 | 输入事件驱动，写控制器 SAB |
| 输入收账 | worker 内 `InputSampler` | Timer，period 决定输入分辨率 |
| 稳态推进 | worker 内各子系统 | Timer，period 由该子系统的业务语义决定 |
| 采集与呈现 | worker 内采集器 | 自己的 Timer，与模拟周期无关 |

周期 Timer 的正当理由是**语义上的周期**（每 100ms 重新决策一次），不是"为了让时间前进而切网格"。不同周期源的 period 可以互不整除。

### 4.4 输入采样器的位置

输入采样器是网络内的反应器，不是网络外的驱动器。这样"tag 边界"也纳入 tag 体系，整个系统只有一个时间基准。

输入影响状态，因此必须落在确定性边界内侧：采样可高频，入账绑定 tag 边界。控制器 SAB 的单槽快照不保留区间中间方向，因此 `InputSampler` 的 period 决定输入分辨率。

### 4.5 FSM 不构造成 Reactor

一张 FSM 图不映射为一个 reactor。每个成员只有一个 `MemberReactor`，其 reaction 的函数体调用库层纯函数。

- reactor 数量等于成员数量，而不是成员数乘以逻辑数量。
- 时间基由 reaction 的 tag 提供，FSM 与行为树层完全不感知调度，因而可脱离 reactor 单测。
- FSM 描述拆成四份：事件类型、状态图、action/guard 实现、context 类型。拆分的代价是「图里引用了不存在的 action 名」从编译期掉到加载期；内置逻辑用 `as const` 字面量构建器保住编译期检查，编辑器保存的 JSON 在加载期校验。
- 「一次性效果必须同步完成」的约束保留，表达位置从宿主类改为节点类型与转移动作的断言。

### 4.6 端口值只在自身 tag 可见

`port.ts:41` 的 `isPresent()` 要求端口写入的 tag 与当前 tag 完全相同（含微步），否则读到 absent。端口是一次性投递点，不是保持型发布点。

验证：源每 7ms 写一次，另一反应每 5ms 读一次，只在 35ms 公倍数上读到值，其余全部 absent。

因此"采集器按自己的周期直接读端口"不成立。端口值需要跨 tag 可见时，必须由同一 tag 上的级联反应落到 `State`（`state.ts:22` 的 `get()` 无 tag 条件）或其他 worker 内存载体。

### 4.7 分支点必须是 tag

参数在某个 tag 上发布，采集端只能知道到那个 tag 为止的事实。若一次分段切换的时刻不是 tag，参数会拖到下一个 tag 才发布，采集端在那个区间内只能沿用旧方程外推。

验证：切换点 250ms、发布点 300ms，采集器在 250–300ms 之间外推出 2.75，真值 2.625。把切换点本身变成 `Action.schedule(250)` 后误差归零。

凡是能解析求出的断点（buff 到期、阈值穿越、段时长累加），都应当 `Action.schedule` 到该时刻；只有无法预知的（碰撞、输入引发的切换）才允许滞后一个输入周期。

### 4.8 采集器持有求值逻辑

采集器不进入 Reactor 网络：不产生事件、不推进模拟。它读取网络内发布的参数，按自己的频率求值，把**求值后的结果**写入 SAB。

状态方程因此只有一份实现，位于引擎内。消费端不再持有 `evalTrajectory` 一类求值代码——当前 `worldStateBuffer.ts:1281` 与 `CommandHandler.ts:135` 各持一份同一公式，属于逻辑外泄。

**SAB 是逻辑引擎快照，供外部消费端展示。** 权威状态与回溯依据走 `runOutput` / `tickStateHistory`（ADR 0060）。

写入代价：`WorldStateWriter.applyMemberPlan()`（`worldStateBuffer.ts:913`）每帧定长重写全部槽位，与采集频率无关；频率提高只增加帧数，SAB 内不累积。

### 4.9 端口定长与类型推导

端口数量不从规则推导，保持定长：

```typescript
class MemberReactor extends Reactor {
  input: InPort<DomainEvent>
  effect: OutPort<Effect>
}
```

类型多样性放在判别联合里，不放在端口数量上。若端口按每张 FSM 各推一套，`Bank` 无法批量构造成员。

可推导的是联合类型的成员：由"FSM 全部转移的树 × 树内出现的节点 × 各节点声明"在加载期静态算出。类型根源在节点实现的能力面声明，不在 FSM。

### 4.10 类型与校验的单一来源

JSON 本身不提供运行时保证。用 zod 定义树 DSL 的 schema，`z.infer` 得到 TS 类型，编译期与运行期共用一份定义。编辑器从 schema 生成校验规则，不手写第二套。

内置规则用 `as const` 加静态推导，编译期报错；编辑器编辑的规则是运行期数据，靠 schema 校验后收窄类型。

### 4.11 规则不可变

编辑并运行后 FSM 定义不可变，运行期没有接线变更，`Mutation` 不参与模拟推进。规则变更走"重新加载并重建网络"，不走运行期热替换。

计划决策 3 与决策 4 里的"tick 开头重建树"因此可以简化为加载期一次构建。

### 4.12 端口拓扑表达不了时序依赖

端口能表达数据依赖，表达不了对共享数据结构的时序依赖。`SpaceManager` 这类 pull 式服务的写入与读取必须分处不同微步：写索引的反应在微步 N，读索引的反应在 N+1。不立这条规则，同一微步内的执行顺序会影响结果。

微步的使用应当稀缺：同一 tag 内的先后优先用端口依赖表达，微步只用于真正需要区分因果的场合。

### 4.13 管理器的去向

| 现结构 | 去向 |
|---|---|
| `MemberManager` 容器职责 | `Bank<MemberReactor>` |
| `MemberManager` 的能力注入 setter | 产出数据的改为端口接线；提供环境的（`random`、`getCurrentTimeMs`、`getTickIndex`、`evaluateExpression`）改为 `NodeContext` / `FsmImpls` 能力面注入 |
| `AreaManager` | `Bank<AreaReactor>` |
| `SpaceManager` | 不变成 Reactor。作为被动数据结构由 `World` 持有，遵守 4.12 的微步规则 |

区分标准：**产出数据的走端口，提供环境的走上下文。**

### 4.14 事件总线与消息队列的归宿

| 原机制 | 替代 |
|---|---|
| `EventBus` 内部派发 | 端口拓扑（构造期静态接线） |
| `EventBus` 对外发布 | `OutputSampler` 的订阅表 |
| `MessageQueue` 跨帧排队 | 同 tag 内动作发端口，跨 tag 用 `Action.schedule` |
| `outboundPrefixes` 字符串前缀匹配 | 删除，订阅表按端口路径 |

ADR 0059 的"订阅驱动单一总线"在 Reactor 下落实为"端口全量写出，订阅表在外层裁剪"。订阅表为空时模拟结果逐 tag 一致，只是不产生 SAB 数据——开放世界无人观看的演化靠这条成立。

## 5 待定项

| 事项 | 备选 | 影响 |
|---|---|---|
| 采集器的呈现节奏 | 采集器按自己的 Timer 求值（当前倾向） / 消费端自行插值 | 后者要求把求值代码外泄给消费端 |
| 物理子步与 tag 的关系 | 区间内部循环（当前倾向，简单且确定） / 每子步一个微步（可观测性好，事件量随采集频率放大） | 影响事件区容量 |
| 无法解析求解的断点 | 滞后一个输入周期（当前倾向） / 二分搜索精确穿越时刻 | 前者简单，后者需要额外求值预算 |
| 落后于物理时间时的策略 | 压缩时间追赶（Reactor 内置） / 减慢模拟 | 影响长时间运行的漂移；倍速下「落后」的含义变为主观速率而非真实时间 |
| `Alarm` 的轮询上限 | 保持一次挂钟等待加重核（当前倾向） / 定期轮询（4–16ms） | 后者能支持时钟被外部拨动，代价是唤醒次数上升 |
| `OutputSampler` 事件的容量超限 | 截断并在帧头标记（当前倾向） / 扩容 | ADR 0059 要求超限显形失败 |
| xstate 的 `invoke` | 禁用（当前倾向） / 保留并约束 | 引入外部异步源会破坏确定性 |

## 6 改造范围

| 层 | 变化 |
|---|---|
| `GameEngine` | tag 化，删除 `tickIndex` 与 `scheduleNext` 的帧循环，收窄为生命周期与物理时钟 |
| `World` | 改为 reactor 容器，两相调度删除，管理器转 `Bank`/`Mutation` |
| 新增 | `runtime/reactor/` 的 `InputSampler`、`OutputSampler`；`runtime/fsm/` 的纯函数解释器 |
| `runtime/bt/` | 落地 BT wrapper，事件走 OutPort |
| `AttributeContainer` / `StatusInstanceStore` | 内部结构不改。过期判定由调用方从「每 tick 扫描」改为 `Action.schedule` 到点触发 |
| `EventBus` / `MessageQueue` | 删除，职责归端口与订阅表 |
| `controllerInputBuffer` | 职责收窄为真实时间到边界的搬运，聚合上移到 `InputSampler` |
| `worldStateBuffer` / `protocol` / `SimulationWorkerPool` | 形状不变 |
| 不动 | `SpaceManager` 索引机制、`PipelineService`、`JSProcessor`、`Checkpoint` 接口形状、`ModifierDslParser` |

## 7 实施顺序

1. `GameEngine` tag 化，`World.tick()` 调用方式不变，行为等价。
2. 接入 `InputSampler` 与 `OutputSampler`，验证边界内外划分。
3. `World` 转 reactor 容器，先接一个子系统（建议 `SpaceManager` 的查询侧），确认 `Bank` 性能。
4. FSM 纯函数解释器与 BT wrapper，可与第 2、3 步并行。
5. status 过期改为 `Action.schedule`，最后做。

第 3 步不能一次性把 Member 全量转 reactor：网络模型与成员逻辑迁移两个变量叠加，出问题时无法定位。过渡期允许管理器与 reactor 并存，但必须写明下线条件。

## 8 验证基线

按第 7 节第 1、2 步完成后即可验证：

1. 一个匀速直线运动成员在 1000ms 内的位移正确。
2. 不同推进周期的 Timer 下，同样时长的位移一致。
3. `OutputSampler` 不写 SAB 时，模拟结果与写入时逐 tag 一致。
4. 分支点由 `Action.schedule` 到点、与落在 Timer 网格上两种情形，采集端外推结果一致。

第 4 条是 4.7 的回归检查：它保证分支点的定位不依赖周期源的 period。

## 9 时钟、暂停与倍速

### 9.1 时钟归引擎持有

物理时间由引擎持有的时钟提供，Reactor 运行时通过 `setClock()` 拿到它。这与 4.2 一致：调度器归 `App`，物理时钟归 `GameEngine`。

时钟的使用者有两个：`App` 的调度（决定何时唤醒）与网络外的采集器（决定何时采样）。两者读同一个时钟，因此倍速对二者同时生效。

`App` 不自己折算时间偏移。折算会把「时间从哪来」分散到两处，注入的时钟失去唯一性。

### 9.2 两个时间源，注入点只有一个

`time.ts` 有两个物理时间读取：

| 函数 | 值 | 用途 |
|---|---|---|
| `getCurrentPhysicalTime()` | `activeClock.now()` | tag 的基准，可注入 |
| `nowMonotonicMs()` | `performance.now()` | 仅供 `Alarm` 测量已等时长 |

两个量回答的问题不同：前者是「现在是哪一刻」，要能与外部对齐、能落盘；后者是「从某点起过了多久」，单调不倒退。

问题在于注入点只覆盖前者。`Alarm` 用后者的读数判断到期，因此换掉时钟不影响闹钟。

### 9.3 暂停的真实语义

暂停不是「时钟不动」，是两件事同时成立：

| 效果 | 由谁保证 | 机制 |
|---|---|---|
| 逻辑时间不推进 | 时钟 | `now()` 停在暂停时刻 |
| 不再被唤醒 | 运行时 | 清掉闹钟与即时调用 |

第二件必须由运行时做：唤醒源是 `App` 的私有字段，时钟对象碰不到。只冻结时钟会让闹钟按原延迟反复醒来又重排，逻辑不动但物理空转。

对应两个受保护方法：`_pauseScheduling()` 置位抑制标志并清唤醒源，`_resumeScheduling()` 复位并按队首事件重排闹钟。

暂停不可能落在同一个 tag 内：`_next()` 到 `_react()` 全程同步，暂停指令只能在两次调用之间被处理。

### 9.4 倍速是挂钟等待的换算

`setTimeout` 只接受挂钟毫秒，没有原语能把它换成自定义时钟的到期。但调用方可以在调用前换算：

```
rate = d(时钟) / d(挂钟)

暂停  rate = 0
常速  rate = 1
2 倍速 rate = 2

挂钟等待 = 时钟尺度剩余量 / rate
```

`Alarm` 现在把时钟尺度的剩余量直接当挂钟毫秒睡，漏了这次除法，所以倍速与暂停都不生效。

改法：`Alarm` 存**绝对 deadline**（时钟尺度），`arm()` 时算 `(deadline - now()) / rate`。

两个必须处理的边界：

- **醒来要核对。** `setTimeout` 通常晚 1–4ms，偶尔偏早。醒来后问一次时钟：未到点按剩余重排，到点才执行。
- **rate 中途变化。** 入睡期间按暂停，那个挂钟等待会按时醒来。因此 rate 变化必须 `rearm()`，暂停时直接不排。

零额外唤醒次数，精度由 `setTimeout` 决定。

`_next()` 里的物理时间比较、`Origin.physical` 动作的 tag 计算、`getElapsedPhysicalTime()` 都不需要改：它们读 `getCurrentPhysicalTime()`，那个值已经含倍速。

### 9.5 单步

单步是暂停状态下的操作：暂停后推进一个逻辑时刻，用于观察变化。不存在「以单步模式启动」的用法，因此不设手动启动入口。

顺序必须是先移时钟再推进：

```
stepToNext():
  1. 取队首时刻，没有则返回 null
  2. 时钟移到该时刻
  3. 推进逻辑并排空该时刻的全部工作
```

顺序不能反：推进时会执行反应、完成回调会通知采集器，两者都读时钟。若先推进逻辑，这些读点看到的物理时间还在过去。

单步期间必须抑制唤醒，否则推进过程内部会重新排出定时器。推进结束后恢复进入前的模式。

### 9.6 与 `_keepAlive` 的区别

两者独立，不能合并：

| 标志 | 管的是 |
|---|---|
| `_keepAlive` | 队列排空后做什么：`snooze` 再醒，或 `_shutdown()` 收尾 |
| `_sleepSuspended` | 调度器能不能自行安排唤醒 |

`_keepAlive` 为假时队列排空即结束运行，与暂停无关；`_sleepSuspended` 为真时不排任何唤醒，但运行继续。周期性网络必须 `_keepAlive = true`，又必须能暂停与单步。

### 9.7 改造清单

| 改动 | 位置 |
|---|---|
| 时钟带上 `rate`、`pause`、`resume`、`setTo` | 引擎侧时钟实现 |
| `Alarm` 存 deadline、除以 rate、醒来核对、`rearm()` | `reactor/core/time.ts` |
| `_pauseScheduling()` / `_resumeScheduling()` 接时钟 | `App` |
| `stepToNext()` 先移时钟后推进 | `ReactorGameSystem` |
