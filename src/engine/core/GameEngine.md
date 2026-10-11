# GameEngine

## 职责

GameEngine 是引擎的核心编排器，职责范围严格限定为：

1. **引擎时间管理**：管理引擎运行时间（wall-clock，不受暂停影响）
2. **外部输入输出**：从输入黑板读取控制输入，向输出黑板写入模拟结果
3. **规则执行调度**：调用 World.tick() 驱动规则层执行
4. **生命周期管理**：场景加载/卸载、启动/停止、暂停/恢复

**时间语义**：
- **Engine 时间**：引擎运行的 wall-clock 时间，用于性能统计、生命周期管理
- **World 时间**：模拟世界的逻辑时间（tickIndex、simulationTimeMs），由 World 管理并包含在 World checkpoint 中

---

## 理想结构

### 核心依赖

```typescript
class GameEngine {
  // 模拟状态容器（公开只读，供测试访问）
  readonly world: World;
  
  // 引擎运行时间（wall-clock）
  private startTime: number;
  private lastStepTickDurationMs: number;
  
  // 输入输出快照（快照模式）
  private inputBuffer: SharedArrayBuffer | null;
  private inputLayout: InputLayout | null;
  private lastStableInput: InputSnapshot | null;
  
  private outputBuffer: SharedArrayBuffer | null;
  private outputLayout: OutputLayout | null;
  
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
  private scenarioData: EngineScenarioData | null;
}
```

---

### 构造与生命周期

```typescript
/**
 * 构造引擎实例
 * @param config 引擎配置
 * @param infra 长期驻留的基础设施（JSProcessor、Catalog 等）
 */
constructor(config: EngineConfig, infra: EngineInfrastructure): void
// TODO:
// - 初始化 World（传入基础设施依赖）
// - 初始化 FrameLoop

/**
 * 加载场景数据，从 idle 转为 ready
 * @param data 场景初始化数据
 */
loadScenario(data: EngineScenarioData): void
// TODO:
// - 保存 scenarioData
// - 调用 world.loadScenario(data)（World 负责初始化成员、设置随机种子等）
// - 计算输入布局：this.inputLayout = calculateInputLayout(data.members)
// - 计算输出布局：this.outputLayout = calculateOutputLayout(data.outputConsumers)
// - 重置引擎时间：this.startTime = performance.now()

/**
 * 卸载当前场景，回到 idle
 */
unloadScenario(): void
// TODO:
// - 调用 world.clear()
// - 清空 inputLayout / outputLayout
// - 清空 lastStableInput

/**
 * 重置到场景初始状态（保留场景数据）
 */
reset(): void
// TODO: 调用 unloadScenario() 再 loadScenario()

/**
 * 清理所有资源
 */
cleanup(): void
// TODO: 停止循环、清空场景、释放黑板
```

---

### 黑板管理（快照模式）

```typescript
/**
 * 设置输入黑板
 * @param buffer 输入 SharedArrayBuffer
 */
setInputBuffer(buffer: SharedArrayBuffer): void
// TODO:
// - 验证 buffer.byteLength >= inputLayout.totalSize
// - 保存 this.inputBuffer = buffer
// 注意：布局由 loadScenario 计算，双方独立计算保证一致

/**
 * 设置输出黑板
 * @param buffer 输出 SharedArrayBuffer
 */
setOutputBuffer(buffer: SharedArrayBuffer): void
// TODO:
// - 验证 buffer.byteLength >= outputLayout.totalSize
// - 保存 this.outputBuffer = buffer

/**
 * 获取输入布局（供外部创建 SAB 和 Writer）
 * @returns 当前输入布局，未计算则返回 null
 */
getInputLayout(): InputLayout | null
// TODO: 返回 inputLayout 的副本

/**
 * 获取输出布局（供外部创建 SAB 和 Reader）
 * @returns 当前输出布局，未计算则返回 null
 */
getOutputLayout(): OutputLayout | null
// TODO: 返回 outputLayout 的副本
```

---

### 时间推进

```typescript
/**
 * 执行单次逻辑 Tick
 * @param options 可选参数（自定义 deltaTimeMs）
 * @returns Tick 执行结果
 */
stepTick(options?: { deltaTimeMs?: number }): TickStepResult
// TODO: 
// 1. 记录 Tick 开始时间（用于统计 lastStepTickDurationMs）
// 
// 2. 生成输入快照（快照模式）
//    const inputSnapshot = this.inputBuffer
//      ? InputSnapshot.fromBuffer(this.inputBuffer, this.inputLayout!, this.lastStableInput)
//      : new InputSnapshot(new Map(), []);
//    this.lastStableInput = inputSnapshot;
//
// 3. 处理连续输入（合并控制器和 AI）
//    const movementInputs = this.mergeWithAI(inputSnapshot.movement);
//
// 4. 处理离散命令（插入 EventQueue）
//    for (const cmd of inputSnapshot.commands) {
//      this.dispatchMemberEvent(cmd.memberId, cmd.event, cmd.delayMs ?? 0);
//    }
//
// 5. 执行 World tick
//    this.world.tick(context, movementInputs, ...);
//
// 6. 生成输出快照并写入黑板
//    if (this.outputBuffer && this.outputLayout) {
//      const outputSnapshot = OutputSnapshot.fromEngine(this);
//      outputSnapshot.writeToBuffer(this.outputBuffer, this.outputLayout);
//    }
//
// 7. 更新统计并返回结果

/**
 * 启动连续执行（clocked 模式）
 */
start(): void
// TODO: 启动 FrameLoop

/**
 * 停止连续执行
 */
stop(): void
// TODO: 停止 FrameLoop

/**
 * 暂停执行（仅 clocked 模式）
 */
pause(): void
// TODO: 暂停 FrameLoop

/**
 * 恢复执行（仅 clocked 模式）
 */
resume(): void
// TODO: 恢复 FrameLoop

/**
 * 单步执行（unclocked 模式或调试）
 */
step(): void
// TODO: 调用 stepTick()
```

---

### 输出路由

```typescript
/**
 * 私有方法：将模拟结果路由到输出黑板
 * 在每次 stepTick() 结束后调用
 */
private routeOutputs(): void
// TODO:
// 遍历 outputLayout 的每个消费者槽位
//   遍历该槽位订阅的成员列表
//     从 World 收集该成员的域事件、世界状态
//     如果订阅遥测，收集引擎统计
//     调用 outputWriter.write*() 写入对应槽位
```

---

### World 快照管理

```typescript
/**
 * 捕获 World 快照
 * @returns World checkpoint（包含 tickIndex、simulationTimeMs、成员状态等）
 */
captureWorldCheckpoint(): WorldCheckpoint
// TODO: 委托给 world.captureCheckpoint()

/**
 * 恢复到指定 World 快照
 * @param checkpoint World checkpoint
 */
restoreWorldCheckpoint(checkpoint: WorldCheckpoint): void
// TODO: 委托给 world.restoreCheckpoint(checkpoint)
```

---


### 配置管理

```typescript
/**
 * 设置运行时配置
 * @param config 运行时配置（driveMode、logicHz 等）
 */
setRuntimeConfig(config: RuntimeConfig): void
// TODO: 更新 runtimeConfig，调整 FrameLoop

/**
 * 获取当前运行时配置
 */
getRuntimeConfig(): RuntimeConfig
// TODO: 返回 runtimeConfig 副本

/**
 * 获取初始化数据（用于外部重建布局）
 */
getInitializationData(): EngineScenarioData | null
// TODO: 返回 scenarioData 副本
```

---

### 时间查询

```typescript
/**
 * 获取引擎运行时长（wall-clock，毫秒）
 */
getRunTimeMs(): number
// TODO: 返回 performance.now() - startTime

/**
 * 获取最近一次 Tick 耗时（wall-clock，毫秒）
 */
getLastStepTickDurationMs(): number
// TODO: 返回 lastStepTickDurationMs
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
 * FrameLoop tick 回调
 */
private handleFrameLoopTick(tick: FrameLoopTick): void
// TODO: 根据 tick.dueTicks 调用 runSingleTick()

/**
 * 执行单次 Tick（内部）
 */
private runSingleTick(clockKind: string, deltaTimeMs: number): TickStepResult
// TODO: 调用 stepTick()，更新统计

/**
 * 检查停止条件
 */
private checkStopCondition(): boolean
// TODO: 根据 runtimeConfig.stopPolicy 判断是否停止

/**
 * 验证 Worker 上下文
 */
private validateWorkerContext(): void
// TODO: 确保只在 Worker 线程中运行（测试环境除外）

/**
 * 收集引擎遥测数据
 */
private collectTelemetry(): EngineTelemetry
// TODO: 聚合 tickIndex、simulationTimeMs、runTime、fps、成员统计等
```

---


## 关键设计决策

### 1. 时间语义分离
- **Engine 时间**：wall-clock，不受暂停影响，用于性能统计
- **World 时间**：模拟逻辑时间，由 World 管理，包含在 World checkpoint

### 2. Random 归属
- Random 由 World 构造时创建
- `loadScenario()` 时 Engine 调用 `world.setRandomSeed(data.scenario.randomSeed)`

### 3. 输出布局计算时机
- `loadScenario()` 时自动计算
- 也可以提前调用 `calculateOutputLayout()` 获取静态布局
- 布局预留安全空间，设计时考虑可变性而不是频繁变动

### 4. 布局协议
- **输入黑板**：控制器计算 → 注入引擎
- **输出黑板**：引擎计算 → 提供给消费者
- 不需要版本校验，设计时预留可变空间

### 5. 录制实现
- 主线程的行为编辑工具从输出黑板读取域事件实现录制
