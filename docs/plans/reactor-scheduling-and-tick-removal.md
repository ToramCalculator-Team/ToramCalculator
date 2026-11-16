# Reactor 调度与 tick 序号移除

调度只有两类：

| 类别 | 时间来源 | 谁决定下一次推进 |
|---|---|---|
| Reactor 网络 | tag | 事件队列中的最小 tag |
| 采集器 | 各自的周期配置 | 该采集器自己的 Timer |

网络侧没有顶级周期性调度。`tickIndex` 是固定周期模型的遗留标识，本计划移除它。

## 1 两类调度的边界

### 1.1 Reactor 网络

网络不按固定周期推进。`App._next()`（`lib/Reactor/core/reactor.ts:2327`）在事件队列非空时直接跳到队首 tag，队列空时才推进物理时间并等待。时间轴上不存在等距刻度。

推进由事件构成。当前需要列举的事件源：

| 事件源 | 机制 | 说明 |
|---|---|---|
| 外部输入 | 输入端口 | 采样可高频，入账绑定 tag |
| Reactor 网络内数据依赖 | 端口级联 | 同 tag 内微步推进 |
| GameReactor 内部领域事件 | Reactor-local EventBus | 当前调用内同步通知订阅者 |
| 定时到点 | `Action.schedule` | buff 过期、阈值穿越、段时长累加 |
| 业务语义周期 | `Timer` | AI 决策、稳态推进 |
| 模拟结束 | `Timer` 或 `Action` | 到点 `requestStop` |

`Timer` 的周期由业务语义决定，不承担"切网格"职责。不同 Timer 的 period 可以互不整除。

`Timer` 的 offset 为零时，其 reaction 会在启动时立即触发一次，同时按 period 排队（`lib/Reactor/core/reaction.ts:90`）。为避免首次触发落在启动时刻而非周期点，网络内的 `Timer` 统一以 period 作 offset。

### 1.2 采集器

采集器不进入 Reactor 网络，不产生事件，不推进模拟。每类采集器有自己的 Timer 或驱动循环，周期独立配置。

采集器需要跨 tag 持续可见的数据时，由网络内同 tag 的级联反应落到 `State` 或纯 worker 内存（端口值只在写入的 tag 上可见，见 `lib/Reactor/core/port.ts:41`）。采集器读该载体，不直接读端口。

采集器把求值后的结果写入 SAB。状态方程只有一份实现，位于引擎内。消费端不持有求值代码。

### 1.3 采集器的 tick

采集器自己的 Timer 有"第几次采集"的概念，这是采集器内部序号，与网络推进次数无关。两者互不要求整除，也互不可推导。

## 2 移除 tickIndex

### 2.1 现状

`tickIndex` 在 20 个文件中出现 79 次，按职责分为四组。

| 组 | 位置 | 用途 |
|---|---|---|
| 时间派生 | `GameEngine.ts:24,167,182,234` | 序号即时间：`tickIndex * stepMs` |
| 记录顺序 | `tickStateHistory.ts:270,283,472`、`runOutput.ts:189` | 记录顺序轴、连续性校验 |
| 传输 | `worldStateBuffer.ts:249`、`protocol.ts:48,88`、`Simulation.worker.ts:292` | SAB 头部、遥测、控制面批次 |
| 成员上下文 | `types.ts:15`、`Member.ts:269`、`JSProcessor/types.ts:32`、`DamageResolution.ts:152`、`ActionMethods.ts:136` | 代入表达式与伤害记录 |

### 2.2 替代

| 原用途 | 替代 |
|---|---|
| 时间 | `logicalTimeMs`。已是 SAB 主字段，精度足够 |
| 顺序 | tag（时间 + 微步）。微步区分同一时刻的因果顺序 |
| 连续性校验 | 「时间不倒退 + 同一时间微步递增」，替换 `tickStateHistory.ts:283` 的序号等差校验 |
| 表达式上下文 | 只保留 `currentTimeMs`。`JSProcessor/types.ts:32` 自述"仅用于排序、日志和回放定位"，排序已被 tag 覆盖 |
| 伤害记录 `frame` | 改为 `logicalTimeMs`，字段名改为时间语义 |
| 遥测 | 采集器的采集序号 + `logicalTimeMs` |
| SAB `HDR_TICK_INDEX` | 删除，布局版本递增 |

### 2.3 记录的排序

`tickStateHistory` 当前以整数序号作为记录顺序与目录索引。改为以记录在段内的位次索引，头部存 `logicalTimeMs` 与微步。

ADR 0060 规定运行记录以模拟时间为权威顺序轴，与本次改动方向一致；序号只是该轴的冗余编码。

产品未发布，既有运行记录不保留迁移方案，布局版本直接递增。

### 2.4 logicHz 的去留

`logicHz` 有两个来源：`RuntimeConfig.logicHz`（`types.ts:42`）与 `WorldScenarioSchema.logicHz`（`ScenarioSchema.ts:124`），语义是"每秒逻辑 tick 数"。

移除 `tickIndex` 后它不再表征推进频率，只表征物理积分的子步步长与控制器输入分辨率。两者应拆开：

| 概念 | 归属 | 名义 |
|---|---|---|
| 物理积分子步 | 各子系统自己的 Timer 或积分器参数 | `integrationStepMs` |
| 控制器输入分辨率 | `InputSampler` 的 period | `inputPeriodMs` |

`logicHz` 作为统一字段删除；场景 schema 与 UI 表单（`locales/dictionaries/zh_CN.ts:2756` 等处）随之调整。

## 3 状态历史改为周期采样

### 3.1 职责划分

状态历史不是逐 tick 追加，而是 10 秒一次的采样。三个职责分属不同位置：

| 职责 | 承载 | 理由 |
|---|---|---|
| 采样时机 | 网络内周期 10 秒的 `Timer` | 采样点必须是 tag，否则记录时间轴与模拟时间轴不重合 |
| 记录写入 | 网络外的采集器 | 只读快照、写 SAB，不产生事件、不推进模拟 |
| 传输 | `tickStateHistory` 的分段布局 | 实时运行时是 SAB；离线任务可以是普通内存 |

采样时机为什么必须在网络内：采样发生的时刻如果是物理时间，它就不能被重放；换成 tag 后，同一 seed 下的采样点集合完全确定。

### 3.2 增量编码删除

当前为逐 tick 记录设计了一套增量编码：`attributeFlags`（`tickStateHistory.ts:400`）、`modifierListChanged`（`:420`）、`measureRecord`（`:379`）、`PreviousMemberState`（`:121`）、`previousMembers`（`:255`）。

10 秒间隔下这套机制失去意义：600 个 tick 之后几乎每个属性都会变化，差量接近全量，而每样本还要多付一套比对开销。删除后每条记录定长，读写两侧都简化。

规模估算：8 成员 × 138 属性 × 16 字节 ≈ 18 KB/样本，每分钟 6 个样本 ≈ 105 KB。当前增量格式在 60Hz 下的开销是每秒 60 次比对，两者不在一个量级。

### 3.3 分段语义

`SEGMENT_STATE_OFFSET`（`:17`）与 `sealSegment`（`:184`）的封段机制保留：分段是按字节容量划分的存储单元，与采样周期无关。分段头中的 `startTick`/`tickCount` 改为 `startTimeMs`/`sampleCount`。

连续性校验从「序号等差」（`:283`）改为「时间严格递增」。采样周期固定时两者等价。

### 3.4 采集器配置接口

状态历史是采集器的一种实例。采集器 = 四元组：选什么（字段集）、何时采（周期）、装多少（容量）、满了怎么办（截断/扩容/覆盖）。状态历史的四元组取值：全部成员全部属性、10 秒、分段容量、封段续写。

一个采集器一个 SAB。`worldStateBuffer` 的 `HDR_COMMIT_VERSION`（`:248`）是全局单提交号，10 秒采集与 60Hz 采集共用它必然有一个被迫降频，因此状态历史使用独立缓冲。

## 4 SimulationClock 撤回的原因

先前曾计划新增 `SimulationClock` 统一产出整数纳秒 tag。撤回理由：

- 它解决的是"统一周期 tick 如何映射为整数纳秒"，而统一周期 tick 本身要被删除，问题不存在。
- 它会把 `tickIndex` 提升为时间权威，正好与第 2 节相反。
- `TimeValue` 只接受整数纳秒（`lib/Reactor/core/time.ts:303`），60Hz 的 16.666… ms 无法表示为整数毫秒。网络侧不需要这个转换：时间由 tag 携带，tag 由事件调度产生，不需要从频率反推。

## 5 实施顺序

每一步都能独立验证，且不依赖后续步骤。

1. **移除表达式与伤害记录中的序号。** `JSProcessor/types.ts:32`、`DamageResolution.ts:152`、`ActionMethods.ts:136` 删除 `tickIndex` 字段，调用方改用 `currentTimeMs`。此步不涉及调度。
2. **状态历史改为周期采样。** 删除增量编码（第 3.2 节），记录头存时间，分段头语义改为时间与样本数。此步可与第 1 步合并验证。
3. **成员运行时上下文收窄。** `types.ts:15` 的 `SimulationTickContext` 改为只含 `currentTimeMs` 与积分步长；`Member.ts:269` 停止写入序号。
4. **`GameEngine` 帧循环改为事件驱动。** 删除 `scheduleNext`（`GameEngine.ts:188`）与 `tickIndex`；`World` 的推进由网络内事件驱动。此步依赖第 1–3 步已完成，因为此时成员逻辑已不读序号。
5. **`logicHz` 拆分为积分子步与输入分辨率。** 场景 schema、UI 表单、任务配置同步调整。
6. **采集器落地。** 10 秒状态历史、高频呈现帧、事件监控三类采集器各自调度，各写自己的缓冲。

第 4 步是唯一改变推进机制的步骤，前 3 步都是删除冗余编码与删除无效优化；因此即便第 4 步耗时超预期，前 3 步的删除收益已经成立。

## 6 验收

1. 表达式、伤害记录、运行记录中无 `tickIndex` 字段。
2. 同一 seed 同一输入下，两次运行的记录逐条相同（时间为序）。
3. 记录的时间序列严格递增。
4. 改变采集器周期不影响模拟结果。
5. 改变网络外采集器配置时，模拟结果逐 tag 一致；GameReactor 内部 EventBus 订阅按模拟逻辑执行。
6. 10 秒采样下每分钟记录体积不超过全量采样的理论上限。

## 7 风险

| 风险 | 应对 |
|---|---|
| 10 秒采样丢失事件区间内的状态演化 | 事件流单独记录；状态历史只用于面板回看 |
| 表达式脚本读取 `tickIndex` | 检索规则库中的引用；表达式上下文删除该字段属破坏性变更，需在加载期校验引用 |
| 全量记录体积大于增量记录 | 已估算：约 105 KB/分钟，分段机制按容量封段 |
| 采样 Timer 的 offset 为零导致首帧立即触发 | 统一以 period 作 offset |
