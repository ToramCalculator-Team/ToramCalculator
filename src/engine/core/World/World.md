# World

## 模块职责

1. **成员与区域管理**：成员生命周期、状态与行为；瞬时伤害与持续区域的计算与应用。
2. **输入应用**：按输入快照中的目标身份标记把控制器意图施加到成员，无意图的成员回退到自身 AI 采样。
3. **Tick 分相执行**：把一次逻辑 Tick 分成自写推进与统一结算两相，消除访问顺序对结果的影响。
4. **跨帧调度**：持有成员消息队列，按模拟时刻把消息投递给成员状态机。
5. **空间与地形**：成员空间查询、范围查询，以及地形高度投影。
6. **对外事实收集**：接收成员在唯一采集出口写入的对外事实，供引擎在输出边界取走。
7. **确定性随机与表达式求值**：为规则层提供可检查点的随机数与表达式计算能力。

World 不管理引擎运行时间、不读写黑板、不控制生命周期、不做性能统计。

---

## 理想结构

### 核心依赖

```typescript
class World {
  // 子系统
  private memberManager: MemberManager;
  private spaceManager: SpaceManager;
  private damageSystem: DamageSystem;
  private areaManager: AreaManager;

  // 跨帧调度
  private eventQueue: EventQueue;

  // Tick 内的阶段缓冲
  private pendingFacts: PendingFactBuffer;

  // 确定性随机
  private random: Random;

  // 本 Tick 事实收集（成员在 actor.send 前的唯一出口写入，引擎在输出边界取走）
  private factSink: FactSink;

  // 规则层依赖
  private expressionEvaluator: ExpressionEvaluator;
  private pipelineResolverService: PipelineResolverService;
  private eventCatalog: EventCatalog;

  // 地形
  private sampleTerrainHeight: (x: number, z: number) => number;
}
```

---

### 构造与初始化

```typescript
/**
 * 构造 World 实例
 * @param infra 基础设施依赖（表达式求值、Pipeline 解析、事件目录）
 */
constructor(infra: WorldInfrastructure): void
// TODO:
// - 创建随机数生成器
// - 按依赖顺序创建成员、空间、伤害与区域子系统
// - 创建成员消息队列与阶段缓冲
// - 保存基础设施引用

/**
 * 加载场景数据
 * @param data 场景初始化数据
 */
loadScenario(data: EngineScenarioData): void
// TODO:
// - 设置随机种子
// - 设置地形定义并建立高度采样
// - 按场景数据创建成员
// - 重建空间索引
// - 清空消息队列、阶段缓冲与事实收集

/**
 * 清空世界状态
 */
clear(): void
// TODO: 依次清空成员、伤害、区域、消息队列、阶段缓冲与事实收集
```

---

### Tick 分相执行

```typescript
/**
 * 执行单次逻辑 Tick
 * @param tick 本次 Tick 的时间上下文（帧序号、模拟时间、逻辑步长）
 * @param inputSnapshot 本 Tick 的输入快照
 */
tick(tick: SimulationTickContext, inputSnapshot: InputSnapshot): void
// TODO:
// 采样相
// 1. 按槽位与目标身份标记取出各成员的移动意图
// 2. 遍历成员：有控制器意图的成员提交手动来源输入；无意图的成员按 AI 采样
// 3. 调用 member.tick(tick, movementInput)，成员在本相内只写自身状态
// 4. 按地形高度积分成员位置
// 结算相（此时全部成员位置已确定）
// 5. 依次交付阶段缓冲中的意图：范围解析、伤害结算、区域创建
// 6. 用本 Tick 的模拟时刻推进持续区域
// 7. 断言阶段缓冲已空，并断言队列中不存在本时刻及更早的未交付事实
```

两相之间的边界就是"全部成员位置已确定"这一刻。伤害范围解析与目标锁定必须在结算相进行，否则成员注册顺序会改变同一段伤害的可见目标集合。

输入快照只被这一个入口解读：命令按目标身份标记转交给成员 FSM，移动意图按目标身份标记取用。引擎不解析其中的身份标记，也不理解槽位。

第 7 步的两条断言合在一处，是因为它们共享同一个前提：本 Tick 应当交付的事实必须在本 Tick 内交付完毕，残留即实现缺陷。队列由 World 持有，所以断言在 World 末尾，而不是让引擎跨过 World 去检查它持有的队列。

---

### 跨帧调度

```typescript
/**
 * 把一条成员消息按绝对模拟时刻入队
 * @param targetId 目标成员的身份标记
 * @param event 成员消息
 * @param executeAtMs 执行时刻（模拟时间，毫秒）
 */
enqueueMemberMessage<TEvent extends EventObject>(targetId: string, event: TEvent, executeAtMs: number): void
// TODO: 校验执行时刻严格晚于本次 Tick 的模拟时刻，再委托 eventQueue.insert()

/**
 * 交付本 Tick 到期的成员消息，并清理已交付项
 * @param currentTimeMs 当前模拟时间
 * @returns 本 Tick 交付的成员消息
 */
consumeDueMessages(currentTimeMs: number): QueueEvent[]
// TODO:
// - 单次遍历已到达的时间区间，完成取用、交付与清理，不重复排序
// - 队列归 World 持有，交付与清理是同一个动作的两个半程，拆成两个公开方法只会让调用方漏掉其中一半
```

成员消息的两种入队来源只在时间锚点上不同：Tick 内派发以本次 Tick 的模拟时间为锚点；Tick 外的外部注入由引擎带上自己的模拟时间。两者都必须指向严格晚于当前时刻的执行时刻；本 Tick 内生效的因果链不经过队列，由阶段缓冲承载（见下）。

队列不持有时间闭包：入队、交付与清理都显式接收当前模拟时间，`createSnapshot(currentTimeMs)` 同样收参数。World 若让队列闭包读外部时间源，等于通过函数指针读引擎私有可变状态，比参数传递更耦合且不可见。

---

### Tick 内的阶段缓冲

成员之间的相互影响不经过队列，也不立即施加，而是记入阶段缓冲，由 Tick 的结算相统一交付。

```typescript
/**
 * 登记一条跨实体的结算意图
 * @param fact 伤害段、区域创建等意图
 */
requestFact(fact: PendingFact): void
// TODO: 追加到阶段缓冲，不立即修改任何成员状态

/**
 * 交付阶段缓冲中的全部意图
 * @param tick 本次 Tick 的时间上下文
 */
flushPendingFacts(tick: SimulationTickContext): void
// TODO:
// - 依序解析范围、锁定目标、结算伤害
// - 交付过程不再登记新的意图

/**
 * 判断阶段缓冲是否为空
 */
hasPendingFacts(): boolean
```

判据是写入目标而不是"看起来是否延迟"：写自身状态的立即执行，写其他成员或共享集合的必须经阶段缓冲。这条边界由接口形状保证——成员可用的能力只暴露自身写入与只读查询，跨实体修改只有阶段缓冲一条通路。

---

### 成员与空间查询

```typescript
/**
 * 获取指定成员
 * @param memberId 成员标识
 * @returns 成员实例，不存在时返回 undefined
 */
getMember(memberId: string): Member | undefined

/**
 * 获取所有成员
 */
getAllMembers(): ReadonlyArray<Member>

/**
 * 查询范围内成员
 * @param center 中心点
 * @param radius 半径
 */
queryMembersInRange(center: { x: number; z: number }, radius: number): Member[]

/**
 * 查询存活成员
 */
queryAliveMembers(): Member[]
```

---

### 地形

```typescript
/**
 * 设置地形定义
 * @param definition 地形定义
 */
setTerrainDefinition(definition: TerrainDefinition): void
// TODO: 建立同步点采样的地形高度采样器

/**
 * 把点投影到地面
 * @param position 三维位置
 * @returns 投影后的位置
 */
projectToGround(position: { x: number; y: number; z: number }): { x: number; y: number; z: number }
```

---

### 事实收集与连续状态采集

对外事实在成员内 `actor.send` 之前的唯一采集出口写入，由 World 收集，供引擎在输出边界取走。收集器不解释事实内容，也不做扇出：它既是事实的唯一采集点，也是唯一分发点，因此不存在「谁订阅了」这一层。

连续状态同样由 World 汇总后交出：引擎只把结果写进输出端口，不直接访问成员运行时状态。两者都是「取一份快照」，区别只在语义——事实必须逐次消费，连续状态允许跳过。

```typescript
/**
 * 采集本 Tick 的连续世界状态，供引擎提交到输出端口状态区
 */
collectContinuousState(): ContinuousWorldState
// TODO:
// - 汇总成员连续状态（位置、朝向、动作状态、属性与 modifier 来源）与区域状态
// - 返回可序列化结果，不暴露成员实例
// - 采集在这里而不是引擎，是因为引擎不访问成员运行时状态

/**
 * 记录一条成员对外事实
 * @param record 成员、来源、事件名、负载与模拟时刻
 */
recordFact(record: MemberFactRecord): void
// TODO: 追加到本 Tick 事实收集，不解释内容、不投影

/**
 * 取走本 Tick 收集的全部事实
 */
takeFacts(): readonly MemberFactRecord[]
// TODO:
// - 返回本 Tick 收集的事实，交出所有权并清空收集
// - 事实只被取走一次，引擎是唯一取用者

/**
 * 求值表达式
 * @param expression 表达式字符串
 * @param context 表达式上下文
 * @returns 求值结果
 */
evaluateExpression(expression: string, context: ExpressionContext): number | boolean
```

---

### 检查点

```typescript
/**
 * 捕获世界检查点
 * @returns 成员、区域、随机数状态与消息队列检查点
 */
captureCheckpoint(): WorldCheckpoint
// TODO: 收集各子系统检查点，不包含模拟时间（时间由引擎持有）

/**
 * 恢复世界检查点
 * @param checkpoint 世界检查点
 */
restoreCheckpoint(checkpoint: WorldCheckpoint): void
// TODO: 依次恢复成员、区域、随机数与消息队列
```

---

## 关键设计决策

### 1. 时间由引擎传入

**设计理念**：时间的推进条件只应存在一处。

World 不自持也不推进模拟时间：它从 Tick 上下文的第一个参数取本次时刻，需要相对延迟换算时以该参数为锚点。检查点因此不包含时间，引擎检查点里的时间与 World 状态在恢复时一起生效。

### 2. Tick 分两相

**设计理念**：访问顺序不应成为模拟结果的一部分。

遍历成员时，先被访问的成员看到的是尚未更新的其他成员状态；如果在遍历中直接施加跨成员影响，伤害目标集合就会随成员注册顺序变化。分相之后，采样相只做自身推进，结算相在全部位置确定后统一解析，顺序依赖被消除而不是被推移。

### 3. 跨帧调度归 World

**设计理念**：调度对象与调度时机在同一模块内闭合。

成员消息的键是模拟时刻，内容是成员状态机消息，两者都属于模拟规则层。队列由 World 持有后，成员路由随之消失：Tick 拿到的输入快照已经带上目标身份标记，按标记取成员一步完成。队列只承载严格未来时刻的投递，Tick 内的因果链由阶段缓冲承载，两类语义各有归属。

### 4. 输入应用在 World 完成

**设计理念**：输入如何影响模拟属于规则层，引擎只做搬运。

World 从快照取移动意图，并决定成员这一 Tick 的控制来源：有控制器意图的成员走手动来源，其余成员回退到自身 AI 采样。来源授权在成员侧判定，World 只负责选择并向成员提交。

### 5. 队列不持有时间闭包

**设计理念**：参数传递优于函数指针读取私有可变状态。

队列的入队、取用与清理都显式接收当前模拟时间，不通过闭包读取外部时间源。这样队列的输入完全由调用参数决定，检查点恢复与时序测试都能在同一组参数下重现。

### 6. 技能效果在施法前摇统一产生

**设计理念**：让全部技能效果共用同一条延迟通路，避免出现第二套时序。

技能生命周期为读条前摇、读条（咏唱或蓄力）、施法前摇、施法、施法后摇。效果计算统一发生在施法前摇，此时产生的伤害段与区域创建全部作为延迟事实交付：多段伤害按段间隔排入队列，均分后的段伤害在结算时一次锁定，不逐段重算。规则层因此不需要为"本 Tick 立即生效"保留任何例外通路。
