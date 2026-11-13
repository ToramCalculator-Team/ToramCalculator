# Engine — 代理工作指南

## 通信机制角色（权威定义）

引擎区分 GameReactor 内部组件通信、Reactor 网络数据依赖和网络外采集。

| 角色 | 实现 | 作用域与时序 | 用途 |
|---|---|---|---|
| **Reactor 内部事件** | GameReactor 持有的 `EventBus` | 同一 GameReactor 内同步发布与订阅，不存储事件 | 传递已发生的领域事实及负载，通知 FSM actor、BTRuntime 等组件 |
| **网络数据依赖** | Reactor `Reaction` 与 `InPort` / `OutPort` | 同 tag，或经 `Action.schedule` 到未来 tag | 将需要进入网络计算的数据连接到下游反应 |
| **连续量采集** | 网络外 `OutputCollector` | 按消费者配置的周期读取网络参数 | 求值或外推参数并写入输出缓冲 |
| **离散事件输出** | 网络外 `EventOutputFilter` | EventBus 发布时同步筛选；按提交策略写出 | 收集消费者订阅的事件并交给 SAB 写入器 |

EventBus 是 GameReactor 内部组件通信机制，不是网络端口的替代物，也不是事件存储。事件输出过滤器作为 EventBus 订阅者，不加入 Reactor DAG。只有需要参与网络反应的数据才通过 Reaction 和端口发布。

- 已发生的状态变化、属性阈值穿越等领域事实发布到所属 GameReactor 的 EventBus。
- 未来时刻的效果或状态变化由 Reactor `Action.schedule` 调度；到期执行后按需发布事实。
- 需要下游 Reaction 处理的输出写入 `OutPort` 并由静态拓扑连接。
- 外部控制器意图经输入端口快照进入网络，由游戏逻辑按目标身份处理。

**断点必须是 tag**：分段切换、buff 到期、阈值穿越这些改变连续量参数的时点，能解析求出的都要调度成 tag。时点不是 tag 时，参数会晚于事实生效，采集端在区间内只能用旧参数外推。

**跨 tag 不读端口**：端口值只在写入的那个 tag 上可见，需要跨 tag 持续可见的连续量用参数端口发布，采集器读参数并用状态方程外推。

**输出观察不进入网络**：OutputCollector 只读参数并写样本；EventOutputFilter 只订阅 EventBus 并写匹配事件。二者都不推进模拟，改变外部输出配置不影响模拟状态。

**不使用物理动作**：输入一律经输入端口进入，绑定到正在处理的 tag，不从物理时钟读数。物理时钟只用于两个不入 tag 的场合：调度器决定睡眠时长，采集器决定自己的采样节奏。理由：物理动作的 tag 来自平台时钟，不在程序定义内，含物理动作的运行无法在同一 tag 序列上复现，检查点与重放因此失效。实现时用 `Action` 的默认逻辑原点。

网络内节点之间相互影响的写入按因果先后分属不同微步，由端口依赖或微步推进决定，而不是靠遍历顺序。微步只用于真正需要区分因果的场合。

## 线程间通道

引擎与主线程之间的数据面不再是一个固定端口，而是**一类采集器一个缓冲区**：

- **输入端口**：控制侧写自己的槽位，网络按 tag 读出输入快照。槽位内分状态区（方向、步态、强度）与命令区（离散动作），同槽位共用一个发布号。
- **输出缓冲区**：每个采集器一个。采集器持有选择字段、采样周期、容量与满了怎么办这四项配置，按自己的周期写入自己的缓冲区。

一个采集器一个缓冲区的理由是提交号粒度：全局单提交号会让 10 秒采集与 60Hz 采集共用一个提交号，必然有一个被迫降频。

缓冲区内的发布规则：连续量允许读取方跳过中间提交，离散事实必须逐次消费，容量不足时显形失败而不是静默覆盖。

模拟时刻是唯一的顺序轴，微步表达同一时刻内的先后。事实不携带墙钟时间偏移。

控制面（生命周期命令与结果、一次性变长查询、运行故障）不走共享内存。

**输出设施由消费者配置启用**：引擎提供 OutputCollector、EventOutputFilter 和 SAB writer 的通用机制；消费者声明输出需求后，GameSystem 在运行装配时创建对应实例。未配置外部输出时不创建相应设施。改变外部采集配置不影响模拟状态；内部 EventBus 订阅仍按模拟逻辑响应。

过线的只能是设备无关、已定帧、可重放的语义值：方向是世界方向，步态是语义标签（走 / 跑），命令不带墙钟时间。

引擎不持有任何外部回调，也不假设输出一定有消费者。

## 引擎边界

引擎只描述通用机制：反应器网络、时间、输入、输出、属性求值、计算管线、行为树运行时、Reactor 内事件总线、网络外事件输出过滤、xstate 运行时能力、检查点与记录。成员、区域、世界等游戏概念属于游戏层；GameReactor 组合引擎能力与游戏规则。GameSystem（当前是 `ReactorGameSystem`）构建网络根，并依据消费者配置装配输出设施。引擎模块与文档不定义这些游戏概念。

`GameSystem` 是与模拟模型无关的壳，`GameEngine` 只依赖它；当前实现是 `ReactorGameSystem extends App`。`GameEngine` 是宿主壳，只做线程边界、控制面、共享缓冲与检查点序列化。

第一版状态机运行时用 xstate v5。GameReactor 直接持有同步 xstate actor；actor 接收内部事件并提交意图，不映射 Reactor 输入输出端口。`invoke`/`spawn` 禁用，`after` 编译成 `Action`，动作只提交意图。玩家内容用 schema 校验，内置内容用生成的静态类型。

## 文档与 ADR
引擎设计意图通过模块旁的模块架构文档、`src/engine/document/` 和 `docs/decisions/` 保留。工作时读取相关文档；新设计内容写入项目级 ADR，历史叙述文档只作为历史快照读取。

当前 L1 概览见 `src/engine/document/引擎架构设计.md`；`src/engine/document/架构设计说明概要.md` 保留为旧帧模型的历史快照。

历史叙述文档包括 `src/engine/document/架构设计说明概要.md`、`src/engine/document/hook与触发层设计讨论结论.md`、`src/engine/document/WorldAreaSystem.md`。

ADR 规则的权威来源是 `docs/decisions/README.md`；写 ADR 前必须阅读。

满足以下任一条件时，先向用户提议新增 ADR，并等待确认：

- 跨越至少 2 个引擎顶层目录，或修改契约：`PipelineCatalog`、`EventCatalog`、`AttributeSchema`、`StatusTypeRegistry`、线程间协议、checkpoint 格式。
- 将已经实现的方案切换为另一种方案。
- 引入新的 registry、通信机制或分层方式。
- 建立未来 passive、skill、pipeline 必须遵守的约定。

不要静默修改已 `Accepted` 的 ADR 正文；实质修正应新增 ADR，并在新 ADR 中写 `Supersedes: NNNN`。ADR 使用中文书写。
