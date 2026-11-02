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
| **FsmReactor** | 一张 FSM 图在 Reactor 世界的表示。状态在 `Cell`，事件从 `InPort` 进，动作经缓冲写 `OutPort` | 加载后定义不可变；`after` 编译为 `Action`；`invoke` 禁用 |
| **BtHost** | 一棵树的实例，持有 blackboard 与树状态 | 树定义来自 JSON/DSL，节点实现来自注册表 |
| **transition action 树** | 状态转移时执行的一次性树 | 必须同步完成，禁 `RUNNING` |
| **state activity 树** | 某状态存续期间持有的持续树 | 允许 `RUNNING`，退出状态即丢弃 |
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
| **AttributeContainer** | 属性求值。modifier 带时间区间，求值需要 tag 参数 |
| **DependencyGraph** | 属性依赖的缓存与失效，失效键按 tag 区间 |
| **Random** | 确定性随机，种子流按 tag 派生 |
| **SpaceManager** | 空间索引与范围查询，由反应按需调用 |
| **Checkpoint** | 快照与恢复，存 Cell 状态、当前 tag、各 host 的树状态 |
| **runOutput / tickStateHistory** | 运行记录，以模拟时间为权威顺序轴（ADR 0060） |

## 4 设计取舍

### 4.1 连续量与离散量的处理

连续量不构成独立子系统，被拆成三类：

| 类别 | 处理 | 依据 |
|---|---|---|
| 时长与区间（buff 持续、冷却） | 两个离散事件：施加与过期。线性 ramp 的 modifier 是时间的分段线性函数，读取时按 tag 求值 | 不需要逐帧推进 |
| 物理与运动 | 真连续。积分在一个反应内部完成，外部看是"某个 tag 上的一段计算"。阈值穿越解析求出精确时刻，作为该 tag 上的离散事件发出 | 固定 tick 只能量化到网格边界 |
| 控制器输入 | 外部信号。区间内零阶保持，与通信重构的输入快照是同一件事 | 异步到达，需绑到 tag |

分离的轴是**积分器与事件网络**，不是连续系统与离散系统：事件网络拥有时间基准，积分器是无时间的纯函数，由事件在特定 tag 上调用。

### 4.2 调度器归属

调度器归 `App`，不归 `GameEngine`。`GameEngine` 保留生命周期与物理时钟。`App._canProceed` / `_advanceTime` / `_startTimeStep` 保持默认实现，暂不抽象为接口，等实际做联邦执行时再改。

### 4.3 周期源与采样密度

系统循环消失，周期由 `Timer` 表达。周期源分布：

| 周期源 | 位置 | 机制 |
|---|---|---|
| 控制器采样 | 主线程 | 输入事件驱动，写控制器 SAB |
| 输入收账 | worker 内 `InputSampler` | Timer，period 必须等于或整除模拟网格 period |
| 模拟网格 | worker 内 `World` | Timer |
| 输出高频帧 | 渲染侧 | 读 SAB 后插值，不进 worker |

模拟网格必须显式存在：没有 Timer 就没有推进，物理位置只在有事件的 tag 上更新。各区域的推进密度由各区域的 Timer period 决定，同一网络内 60Hz 与低频共存，不需要额外引入"分片"概念来区分密度。

### 4.4 输入采样器的位置

输入采样器是网络内的反应器，不是网络外的驱动器。这样"tag 边界"也纳入 tag 体系，整个系统只有一个时间基准。

输入影响状态，因此必须落在确定性边界内侧：采样可高频，入账绑定 tag 边界。控制器 SAB 的单槽设计不保留区间中间方向，因此模拟网格 period 决定输入分辨率，两者不能独立设定。

### 4.5 输出采样器主动读

`OutputSampler` 在每个 tag 结算后主动读端口，对照订阅表裁剪，写 SAB。不是由反应器推送。

理由：推送发生在 tag 内部，同一 tag 内多个反应依次写端口，推送会让写入方看到半成品帧。主动读把写入点收敛到 tag 之后。且"本帧有多少事件、是否装得下"需要全局视野。

### 4.6 端口定长与类型推导

端口数量不从规则推导，保持定长：

```typescript
class FsmReactor extends Reactor {
  input: InPort<FsmEvent>
  effect: OutPort<FsmEffect>
}
```

类型多样性放在判别联合里，不放在端口数量上。若端口按每张 FSM 各推一套，`Bank` 无法批量构造成员。

可推导的是联合类型的成员：由"FSM 全部转移的树 × 树内出现的节点 × 各节点声明"在加载期静态算出。类型根源在节点实现的能力面声明，不在 FSM。

### 4.7 类型与校验的单一来源

JSON 本身不提供运行时保证。用 zod 定义树 DSL 的 schema，`z.infer` 得到 TS 类型，编译期与运行期共用一份定义。编辑器从 schema 生成校验规则，不手写第二套。

内置规则用 `as const` 加静态推导，编译期报错；编辑器编辑的规则是运行期数据，靠 schema 校验后收窄类型。

### 4.8 规则不可变

编辑并运行后 FSM 定义不可变，运行期没有接线变更，`Mutation` 不参与模拟推进。规则变更走"重新加载并重建网络"，不走运行期热替换。

计划决策 3 与决策 4 里的"tick 开头重建树"因此可以简化为加载期一次构建。

### 4.9 端口拓扑表达不了时序依赖

端口能表达数据依赖，表达不了对共享数据结构的时序依赖。`SpaceManager` 这类 pull 式服务的写入与读取必须分处不同微步：写索引的反应在微步 N，读索引的反应在 N+1。不立这条规则，同一微步内的执行顺序会影响结果。

微步的使用应当稀缺：同一 tag 内的先后优先用端口依赖表达，微步只用于真正需要区分因果的场合。

### 4.10 管理器的去向

| 现结构 | 去向 |
|---|---|
| `MemberManager` 容器职责 | `Bank<MemberReactor>` |
| `MemberManager` 的能力注入 setter | 产出数据的改为端口接线；提供环境的（`random`、`getCurrentTimeMs`、`getTickIndex`、`evaluateExpression`）改为 `NodeContext` / `FsmImpls` 能力面注入 |
| `AreaManager` | `Bank<AreaReactor>` |
| `SpaceManager` | 不变成 Reactor。作为被动数据结构由 `World` 持有，遵守 4.9 的微步规则 |

区分标准：**产出数据的走端口，提供环境的走上下文。**

### 4.11 事件总线与消息队列的归宿

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
| 输出采样器触发的呈现节奏 | 渲染侧 rAF 插值（当前倾向） / worker 侧独立 Timer | 前者不增加 worker 负担，需要插值逻辑 |
| `AttributeContainer` 求值的 tag 参数化 | 全量改造 / 只对 ramp 类 modifier 引入区间 | 影响 `DependencyGraph` 缓存命中率，需实测 |
| 物理子步与 tag 的关系 | 区间内部循环（当前倾向，简单且确定） / 每子步一个微步（可观测性好，事件量随帧率放大） | 影响事件区容量 |
| 落后于物理时间时的策略 | 压缩时间追赶（Reactor 内置） / 减慢模拟 | 影响长时间运行的漂移 |
| `OutputSampler` 事件的容量超限 | 截断并在帧头标记（当前倾向） / 扩容 | ADR 0059 要求超限显形失败 |
| xstate 的 `invoke` | 禁用（当前倾向） / 保留并约束 | 引入外部异步源会破坏确定性 |

## 6 改造范围

| 层 | 变化 |
|---|---|
| `GameEngine` | tag 化，删除 `tickIndex` 与 `scheduleNext` 的帧循环，收窄为生命周期与物理时钟 |
| `World` | 改为 reactor 容器，两相调度删除，管理器转 `Bank`/`Mutation` |
| 新增 | `runtime/reactor/` 的 `InputSampler`、`OutputSampler`、`FsmReactor` 工厂 |
| `runtime/bt/` | 落地 BT wrapper，事件走 OutPort |
| `AttributeContainer` | modifier 时间区间化，求值带 tag |
| `EventBus` / `MessageQueue` | 删除，职责归端口与订阅表 |
| `controllerInputBuffer` | 职责收窄为真实时间到边界的搬运，聚合上移到 `InputSampler` |
| `worldStateBuffer` / `protocol` / `SimulationWorkerPool` | 形状不变 |
| 不动 | `SpaceManager` 索引机制、`PipelineService`、`JSProcessor`、`Checkpoint` 接口形状、`ModifierDslParser` |

## 7 实施顺序

1. `GameEngine` tag 化，`World.tick()` 调用方式不变，行为等价。
2. 接入 `InputSampler` 与 `OutputSampler`，验证边界内外划分。
3. `World` 转 reactor 容器，先接一个子系统（建议 `SpaceManager` 的查询侧），确认 `Bank` 性能。
4. FSM 适配器与 BT wrapper，可与第 2、3 步并行。
5. `AttributeContainer` 时间区间化，最后做。

第 3 步不能一次性把 Member 全量转 reactor：网络模型与成员逻辑迁移两个变量叠加，出问题时无法定位。过渡期允许管理器与 reactor 并存，但必须写明下线条件。

## 8 验证基线

按第 7 节第 1、2 步完成后即可验证三条：

1. 60Hz 网格下，一个匀速直线运动成员在 1000ms 内的位移正确。
2. 30Hz 网格下，同样时长的位移与 60Hz 一致。
3. `OutputSampler` 不写 SAB 时，模拟结果与写入时逐 tag 一致。

这三条通过后再接 FSM 与 BT。
