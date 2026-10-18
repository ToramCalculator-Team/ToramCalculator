# GameEngine

## 模块职责

1. **模拟时间**：持有帧序号与模拟时间，并在每次逻辑 Tick 结束后无条件推进。
2. **输入快照**：每 Tick 从输入端口读出一份不可变输入快照，整体交给 World。引擎不解析其中的目标身份标记。
3. **事实发布与产出**：引擎在 Tick 末提交连续世界状态到输出端口的状态区；事实由各过程发布到常设事件总线，总线在 Tick 内累积，Tick 末随状态区一次提交写入事件区；未订阅时不产生对外数据。
4. **规则执行调度**：驱动 World 执行一次完整的离散逻辑 Tick。
5. **生命周期与运行级准入**：场景加载与卸载、启动与停止、暂停与恢复，以及这次运行是否接受外部输入的判定。

---

## 理想结构

### 核心依赖

```typescript
class GameEngine {
  // 模拟状态容器（公开只读，供测试访问）
  readonly world: World;

  // 模拟时间：帧序号与模拟时间
  private tickIndex: number;
  private simulationTimeMs: number;

  // 黑板：两个端口各一个缓冲区，端口内分状态区与事件区
  private inputBuffer: SharedArrayBuffer | null;
  private outputBuffer: SharedArrayBuffer | null;

  // 基础设施（跨场景复用）
  private jsProcessor: JSProcessor;
  private pipelineCatalog: PipelineCatalog;
  private pipelineResolverService: PipelineResolverService;
  private eventCatalog: EventCatalog;

  // 生命周期控制
  private frameLoop: FrameLoop;

  // 配置
  private config: EngineConfig;
  private runtimeConfig: RuntimeConfig;
  private scenarioData: WorldScenarioData | null;

  // 引擎运行时间（wall-clock，用于性能统计）
  private startTime: number;
  private lastStepTickDurationMs: number;
}
```

---

### 构造与生命周期

```typescript
/**
 * 构造引擎实例
 * @param config 引擎配置
 * @param infra 长期驻留的基础设施（JSProcessor、Catalog 等），由 Worker 级持有
 */
constructor(config: EngineConfig, infra: EngineInfrastructure): void
// TODO:
// - 校验当前处于 Worker 上下文
// - 创建 World（内部持有成员消息队列）与 FrameLoop
// - 保存基础设施引用

/**
 * 加载场景数据，从 idle 转为 ready
 * @param data 场景初始化数据
 */
loadScenario(data: WorldScenarioData): void
// TODO:
// - 保存场景数据
// - 委托 world.loadScenario(data) 建立成员、地形与随机种子
// - 重置帧序号与模拟时间
// - 重置引擎运行时间基准
// - 提交一次连续状态，让状态区的初始内容可读

/**
 * 卸载当前场景，回到 idle
 */
unloadScenario(): void
// TODO:
// - 委托 world.clear() 清空成员、区域与消息队列
// - 清空两个黑板引用与场景数据

/**
 * 重置到场景初始状态（保留场景数据）
 */
reset(): void
// TODO: 按已保存的场景数据重新加载

/**
 * 清理仿真层资源，保留基础设施
 */
cleanup(): void
// TODO:
// - 停止帧循环
// - 卸载场景
// - 清空运行统计
```

---

### 黑板管理

端口的数量由写入权与容量策略决定，不由数据语义数量决定。两个端口各一个缓冲区，每个端口内分状态区与事件区。发布号的粒度由写入者数量决定：输入端口每槽位一个发布号，输出端口全区一个 Tick 末提交号。输出端口在 Tick 末一次提交中同时发布两区，读取方只有整端口重试一种。布局由写入端架构静态决定，读取端按同一份布局常量独立解析，双方之间不传递布局描述。

```typescript
/**
 * 设置输入端口缓冲区
 * @param buffer 由控制侧创建的输入共享缓冲区
 */
setInputBuffer(buffer: SharedArrayBuffer): void
// TODO:
// - 校验缓冲区长度不小于静态输入布局容量
// - 保存引用，不计算布局

/**
 * 设置输出端口缓冲区
 * @param buffer 输出共享缓冲区
 */
setOutputBuffer(buffer: SharedArrayBuffer): void
// TODO:
// - 校验容量、布局版本与事件区保留深度
// - 保存引用

/**
 * 提交当前连续世界状态到输出端口的状态区
 */
commitContinuousState(): void
// TODO:
// - 未设置输出端口时直接返回
// - 向 World 取一份连续状态收集结果（成员与区域），不自行访问成员运行时
// - 补上共享时间轴映射，与事件区在本次提交中一起发布

/**
 * 把本 Tick 被订阅的事实追加到输出端口的事件区
 * 引擎是已发送事实的搬运者与发布者；事实由各过程在总线发布，订阅决定哪些需要对外交付。
 */
drainPublishedFacts(): void
// TODO:
// - 未设置输出端口或未订阅时直接返回
// - 向 World 取走本 Tick 被订阅的事实批
// - 按追加顺序写入事件区，顺序键为（模拟时刻，同 Tick 序号）
// - 状态区与事件区共用本次提交号，一次提交后读者可见；两区在 Tick 末成对发布
// - 写入量超过保留深度时抛错，不静默覆盖或丢弃
```

---

### 时间推进

一次逻辑 Tick 是原子的：模拟时间只推进一次，且推进后队列中不得残留本时刻应交付的事实。

```typescript
/**
 * 执行单次逻辑 Tick
 * @param options 可选参数：覆盖的逻辑步长
 * @returns 本次 Tick 的执行结果（帧序号、模拟时间、耗时、交付事实条数）
 */
stepTick(options?: { deltaTimeMs?: number }): TickStepResult
// TODO:
// 1. 记录 Tick 起始耗时基准
// 2. 从输入端口生成不可变输入快照；未设置缓冲区时使用空快照
// 3. 构造 Tick 上下文并调用 world.tick(context, inputSnapshot)
// 4. 提交连续世界状态到状态区，追加本 Tick 被订阅的事实到事件区
// 5. 无条件推进帧序号与模拟时间
// 6. 更新耗时统计并返回结果
//
// 队列残留的断言在 World.tick 末尾（队列归 World 持有），引擎不跨过去替它检查。

/**
 * 启动连续执行（clocked 模式）
 */
start(): void
// TODO: 启动帧循环，并提交一次连续状态

/**
 * 停止连续执行
 */
stop(): void
// TODO: 停止帧循环

/**
 * 暂停执行（仅 clocked 模式）
 */
pause(): void
// TODO: 暂停帧循环

/**
 * 恢复执行（仅 clocked 模式）
 */
resume(): void
// TODO: 恢复帧循环

/**
 * 单步执行（unclocked 模式或调试）
 */
step(): void
// TODO: 调用一次 Tick
```

---

### 检查点

```typescript
/**
 * 捕获引擎检查点
 * @returns 帧序号、模拟时间与 World 检查点
 */
captureCheckpoint(): EngineCheckpoint
// TODO: 组装引擎时间与 world.captureCheckpoint()

/**
 * 恢复引擎检查点
 * @param checkpoint 引擎检查点
 */
restoreCheckpoint(checkpoint: EngineCheckpoint): void
// TODO:
// - 恢复帧序号与模拟时间
// - 委托 world.restoreCheckpoint(checkpoint.world)
// - 提交一次连续状态
```

---

### 运行时配置与统计

```typescript
/**
 * 设置运行时配置
 * @param config 运行时配置（驱动模式、逻辑频率、时间倍率、准入开关等）
 */
setRuntimeConfig(config: RuntimeConfig): void
// TODO: 保存配置并同步帧循环参数

/**
 * 获取当前运行时配置
 * @returns 运行时配置副本
 */
getRuntimeConfig(): RuntimeConfig

/**
 * 获取场景初始化数据
 * @returns 场景数据副本，未加载时返回 null
 */
getInitializationData(): WorldScenarioData | null

/**
 * 获取引擎运行时长（wall-clock，毫秒）
 */
getRunTimeMs(): number

/**
 * 获取最近一次 Tick 耗时（wall-clock，毫秒）
 */
getLastStepTickDurationMs(): number

/**
 * 获取帧循环统计
 */
getFrameLoopStats(): FrameLoopStats

/**
 * 采集连续状态所需的共享时间轴映射
 */
getRealtimeClockSnapshot(): FrameLoopClockSnapshot
```

---

### 私有辅助方法

```typescript
/**
 * 计算逻辑步长（毫秒）
 */
private getLogicStepMs(): number
// TODO: 返回 1000 / runtimeConfig.logicHz

/**
 * 帧循环回调
 * @param tick 本次回调的应执行 Tick 描述
 */
private handleFrameLoopTick(tick: FrameLoopTick): void
// TODO: 按 tick.dueTicks 逐次执行 Tick

/**
 * 执行单次逻辑 Tick 并统一更新统计
 * @param clockKind 驱动来源（实时、单步、快进）
 * @param deltaTimeMs 本次 Tick 的逻辑步长
 */
private runSingleTick(clockKind: string, deltaTimeMs: number): TickStepResult
// TODO: 调用 stepTick()，累计统计并提交连续状态

/**
 * 检查停止条件
 */
private checkStopCondition(): boolean

/**
 * 验证 Worker 上下文
 */
private validateWorkerContext(): void
// TODO: 测试环境外拒绝在主线程创建引擎
```

---

## 关键设计决策

### 1. 模拟时间归引擎

**设计理念**：决策状态集中在一处，避免同一判断被拆到两个模块各存一半。

模拟时间由引擎持有并推进，World 通过 Tick 上下文接收本次时刻，据此把相对延迟换算成队列分桶用的绝对时刻。引擎检查点同时装帧序号、模拟时间与 World 状态，恢复时三者一起回到同一时刻。

### 2. 逻辑 Tick 是原子的

**设计理念**：没有单步原子性就没有确定性，也就没有检查点与重放。

模拟时间在每次 Tick 结束后无条件推进，不因"本 Tick 工作量大"而停留。允许一个逻辑时间步被拆到多次调度回调里执行，会让成员在同一时间步内被推进多次，位移与状态都变成事件积压量的函数。因此本 Tick 应交付的事实必须在本 Tick 内交付完毕，残留即抛错——这条断言用来暴露实现缺陷，而不是做流程控制。

与之配套的队列契约是：**队列只接受严格晚于当前模拟时刻的入队时刻**。需要在本 Tick 内生效的因果链不经过队列，由规则层在 Tick 内部的固定阶段直接完成。

### 3. 快照模式

**设计理念**：引擎是黑盒模拟器；输入进、结果出，不承载外部回调。

引擎每 Tick 生成一份不可变输入快照并整体交给 World，输出侧在 Tick 末提交状态区与事件区。快照是唯一入口，引擎不解析 `targetId`、不访问成员运行时状态，因此「哪个槽位控制哪个成员」只被 World 解读一次。引擎不假设输出端口有人读取，也不为读取方改变自身运行。

命令的定帧也发生在 World：命令不带墙钟时间，模拟时刻由读取者按本 Tick 赋予，因此命令属于本 Tick 的因果链而不是队列内容。队列只承载严格晚于当前时刻的投递。

### 4. 输入布局静态

**设计理念**：写入端决定结构，读取端固定解析；双方不做运行时协商。

输入端口按控制器槽位组织：槽位数量、槽位长度和头部长度都是架构常量，与成员列表无关。控制器因此可以在场景加载之前创建，切换控制对象只需重写槽位里的目标身份标记。读取端按同一份布局常量解析，启动时校验一次缓冲区长度。

### 5. 每端口一个缓冲区，端口内两区独立发布

**设计理念**：缓冲数量由写入权与容量策略决定；发布规则服从数据语义，而不是让一种机制兼顾两种语义。

两个端口各一个缓冲区：输入端口由控制侧写、引擎读；输出端口由引擎写、消费方读。每个端口内状态与事件是同一缓冲里的两个区。

分区的不变量是**发布独立**，不是缓冲独立：容量与失败策略独立（状态区覆盖，事件区保留深度不足即失败）、消费者读取游标独立、每个端口只做一次布局校验与一次缓冲区交接。

发布号的粒度由**写入者的数量**决定，不由区的数量决定。连续状态只需要最新值，允许读取方跳过中间提交；离散事实必须逐次消费，任何一次被覆盖都造成不可补救的信息损失。这个差异体现在容量策略与读游标，不体现在发布号的数量上。

**输入端口**是多写入者写不相交槽位，槽位之间天然互斥，不需要锁。需要保证的只有同一槽位内的状态与命令共用一个发布号且每个槽位只递增一次，使引擎一次读取得到该槽位一致的（状态，命令）视图。

**输出端口**写入者只有引擎一个，且写入只发生在 **Tick 末**：状态区与事件区合起来是一个发布单元，共用一个提交号。事件区不需要独立发布号，因为 Tick 内没有对外可见的发布时点——Tick 内任一时刻的缓冲区都不对应任何合法世界状态。两区独立发布会让读者在 Tick 中途醒来并读到半更新的世界，比读到上一 Tick 的完整结果更糟。一次提交同时覆盖两区，读者不需要区分「只关心状态」与「只关心事件」，也因此在重试时必定重读整个提交。

**模拟时刻是采样刻度，不是事件时刻**。Tick 内任意两个时刻的差值是设备性能与调度抖动的函数，不是领域事实，因此事实不携带 Tick 内时间戳，「Tick 1 与 Tick 2 之间某时刻」不是事件的属性。事实的定序由（模拟时刻，同 Tick 序号）完成：前者说明属于哪一 Tick，后者说明该 Tick 内的发生次序，Tick 内不引入更细的时间划分。控制器产出的事件带真实顺序与（离散化后的）意图时刻，进入输入端口时同样只保留槽位内的顺序，不把主线程墙钟带进模拟。

保留深度越界必须显形失败：静默覆盖等于让读取方读到已被替换的事实，而这类损失在运行分析与行为录制里事后无法发现。

### 6. 外部输入准入分层

**设计理念**：每层只回答一个问题，判定依据只有一处权威。

引擎只回答运行级问题：这次运行是否接受外部输入、输入窗口是否打开。成员是否听某个来源由成员自身的控制模式判定，引擎持有的是副本，不重复裁决。动作在当下是否合法由状态机判定，并通过对外事实显形。控制器的输入被拒绝时不需要回执：拒绝体现为该动作没有出现在成员的执行序列里。

### 7. 事实顺序以模拟时间为轴

**设计理念**：权威时间轴必须与采样密度无关。

帧序号表达的是采样密度：逻辑频率变化会把同一批真实事件切进不同的帧编号，因此它只能用于排序定位与诊断，不能作为事实的顺序依据。所有对外事实以模拟时刻为主键、以同 Tick 序号为兜底，两者合起来构成全序，跨帧率的运行结果因此可以互相比对。Tick 内没有更细的时间划分：模拟时刻说明属于哪一 Tick，同 Tick 序号说明该 Tick 内第几件。

### 8. 事实由订阅驱动，不由引擎主动推送

**设计理念**：事实的产生是过程的职责，是否需要对外交付是消费者的需求；前者不应由后者决定。

引擎持有唯一常设事件总线，各过程自发发布「已发送的事实」，订阅只决定哪些事实需要写进输出端口的事件区。没有订阅者时不创建事件区、不收集、不写出，且模拟结果与有订阅时逐 Tick 一致：引擎不得为了满足订阅而改变模拟。事实只承载「发生了什么」——事实身份、涉及主体与模拟时刻；数值不进入事实，需要数值的消费者从状态载体读取。发布一次即可同时满足成员内响应与外部观察，两者是同一条总线上的两种作用域。
