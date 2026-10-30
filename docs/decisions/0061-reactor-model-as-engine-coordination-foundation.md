# 0061 - 以 Reactor 模型作为引擎游戏系统的协调基础

- **状态**: Accepted
- **日期**: 2025-07-29
- **决策层**: 计算层（引擎 / 游戏系统边界）
- **相关代码**: `src/engine/core/Reactor/`
- **相关 ADR**: Depends on 0059；Refines 0045

## 决策问题

引擎需要承载多个相互影响的游戏系统（伤害结算、区域判定、成员状态机等）。需要决定：用什么编程模型描述这些系统及其交互，使得模拟结果可确定、可重放、可测试，同时保持引擎对游戏内容无感知，使不同游戏包可独立替换系统组合。

## 决策驱动

- 模拟结果必须确定：相同输入序列产生完全相同的输出，这是检查点、重放和回归测试的前提。
- 系统之间的执行顺序必须由数据依赖决定，不能依赖隐式的调用顺序或线程调度。
- 引擎不得内建任何游戏语义；游戏包可以注册任意系统组合，引擎对内容零感知。
- 系统可以在运行时创建和销毁（战斗成员加入/离开），调度机制必须支持动态拓扑。

## 候选方案

### A. 经典 Actor 模型

游戏系统实现为 Actor，通过消息传递通信。Akka、CAF 等成熟框架可直接使用。

- 优点：模块化清晰，Actor 之间无共享状态，天然隔离。
- 缺点：消息到达顺序在语义上未定义。即使框架保证点对点有序，经过中间代理后顺序保证不再传递（详见 Lohstroh et al., DOI:10.1145/3448128，图1c）。相同输入可能产生不同输出，确定性无法保证。

### C. Reactor 模型（本决策采用）

Actor 模型的确定性变体：以显式声明的端口和连接替代地址消息传递，从连接拓扑派生 APG（非循环优先图），按层级顺序执行，逻辑时间 Tag 作为确定性锚点。跨步通信经 LogicalAction 延迟投递，外部异步输入通过物理端口快照在步开始时定帧。

- 优点：在 Actor 风格的模块化基础上保证确定性；执行顺序由数据依赖驱动而非隐式调用顺序；APG 从连接声明纯粹派生，引擎对游戏内容零感知；保留 become 原语支持 Behavior 切换（FSM 状态转移）；已有 Savina 基准测试证明性能不低于非确定性 Actor 框架（平均超越 Akka 1.86x）。
- 缺点：Reaction 体只能通过端口和 LogicalAction 与外部通信，不能直接修改其他 Reactor 状态，有一定代码组织成本；连接图不能有环，反馈回路需要显式引入 LogicalAction 打破。

## 决议

选择 C：**以 Reactor 模型作为引擎游戏系统的协调基础**

确立的不变量：

- 每个游戏系统实现为 Reactor 子类，通过 InputPort / OutputPort / LogicalAction 声明全部对外接口；不得持有其他 Reactor 的直接引用并直接修改其状态。
- 执行顺序由端口连接声明派生的 APG 决定，不由代码内嵌的调用顺序决定。
- APG 的"静态"是单 Tick 内的稳定性：Tick 内拓扑不变，Tick 间可以注册/注销 Reactor，下一 Tick 开始前重算。
- Tag（tickIndex + seqInTick）是确定性锚点；外部异步输入在步开始时通过物理端口快照定帧，定帧后处理过程完全确定。
- become 在本 Tick 调用，下一 Tick 起生效；当前 Tick 的 APG 已由快照确定，不受影响。
- 连接图不能有环；需要反馈回路时，使用 LogicalAction 引入显式延迟打破环路。
- ReactorScheduler 对游戏内容零感知；层级完全由连接关系派生，不内建任何游戏语义。

## 代价

- Reaction 体通过端口通信而非直接调用，增加了接口声明的显式代码量。
- 现有游戏系统（DamageSystem、AreaManager 等）持有 World 引用，改造为 Reactor 子类需要将隐式依赖提升为显式端口声明。
- APG 环路检测在错误连接时抛错，要求连接图设计时考虑因果方向。

## 重新评估条件

- 出现游戏系统之间需要在同一 Tick 内构成反馈环的设计需求，且无法通过 LogicalAction 延迟合理拆分。
- 游戏包需要在 Tick 内动态改变连接拓扑（不仅是注册/注销 Reactor），现有"Tick 内拓扑稳定"约定无法满足。

## 参考

- Lohstroh et al., "Toward a Lingua Franca for Deterministic Concurrent Systems", ACM TECS 2021, DOI:10.1145/3448128
- Menard, Lohstroh et al., "High-Performance Deterministic Concurrency using Lingua Franca", arXiv:2301.02444
- `src/engine/core/Reactor/Reactor.md`
