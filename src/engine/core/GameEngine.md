# GameEngine

## 模块职责

1. **GameSystem 生命周期**：加载、初始化、启动、停止、暂停、恢复与卸载。
2. **线程边界与控制面**：Worker、输入与输出缓冲、协议、运行记录。
3. **物理时钟锚点**：真实时间基准与时间倍率，供网络与采集器对齐。
4. **检查点序列化**：封装模型版本，交给 GameSystem 捕获与恢复状态。

调度、模拟时间与对外发布都不在本模块：调度归 GameSystem（App），模拟时间由 tag 承载，对外发布由采集器承担。

---

## 理想结构

### 核心依赖

```typescript
class GameEngine {
  // 游戏逻辑系统：网络根、运行控制、采集器
  private gameSystem: GameSystem | null;

  // 配置与物理时钟
  private runtimeConfig: RuntimeConfig;
  private clock: PhysicalClock;

  // 当前运行的原始产出
  private readonly runOutput: RunOutputRecorder;
}
```

---

### 构造与生命周期

```typescript
/**
 * 构造引擎实例
 *
 * @param runtimeConfig 引擎运行配置
 */
constructor(runtimeConfig: RuntimeConfig): void
// TODO:
// - 校验当前处于 Worker 上下文
// - 保存运行配置与物理时钟基准
// - GameSystem 保持未加载状态

/**
 * 加载游戏逻辑系统
 *
 * 只做一次装配：初始化网络、接入输入采样器、建立采集器。加载后网络形状
 * 不再变化，规则变更走重新加载而不是运行期接线。
 *
 * @param gameSystem 游戏层实现的 GameSystem
 */
loadGame(gameSystem: GameSystem): void
// TODO:
// - 保存 GameSystem
// - 调用 initialize，由实现建立网络、输入采样器与采集器
// - 把物理时钟交给 GameSystem
// - 提交一次初始快照，让消费端在启动前读到合法状态

/**
 * 卸载当前游戏逻辑系统
 *
 * 停止推进，释放采集器与输出缓冲引用，回到未加载状态。
 */
unloadGame(): void
```

---

### 运行控制

```typescript
/**
 * 启动推进
 */
start(): void

/**
 * 停止推进
 *
 * 停止后 GameSystem 状态保留，可由检查点取走。
 */
stop(): void

/**
 * 暂停推进
 *
 * 仅适用于时钟驱动模式。暂停保留状态，恢复后从暂停时的 tag 继续，不补算暂停期间。
 *
 * 暂停有两个落点，都不修改共享缓冲的协议与布局：
 * - GameSystem 停止唤醒，物理时钟冻结；
 * - 输入写入方在暂停确认后跳过 `write`，控制器照常采样自己的设备。
 *
 * 顺序由引擎保证：先确认暂停，再停写入。暂停确认时刻是输入通道的截断点，
 * 此前已写入但未消费的命令在恢复后按原顺序处理。
 */
pause(): void

/**
 * 恢复推进
 */
resume(): void

/**
 * 推进一次逻辑时间
 *
 * @returns 推进后的逻辑时刻；没有待处理事件时返回 null
 */
stepToNext(): number | null
```

---

### 检查点

```typescript
/**
 * 捕获检查点
 *
 * 保存模型版本与 GameSystem 状态。采集器的输出缓冲不进入检查点。
 *
 * @returns 引擎检查点
 */
captureCheckpoint(): EngineCheckpoint

/**
 * 恢复检查点
 *
 * 恢复前先加载一个新的 GameSystem；恢复后提交一次快照。
 * 目标实例必须是已初始化且未启动的，已启动实例拒绝恢复。
 *
 * @param checkpoint 引擎检查点
 */
restoreCheckpoint(checkpoint: EngineCheckpoint): void
```

---

### 运行时配置与诊断

```typescript
/**
 * 获取当前运行时配置
 *
 * @returns 运行时配置副本
 */
getRuntimeConfig(): RuntimeConfig

/**
 * 获取当前逻辑时刻
 *
 * @returns 逻辑时刻（毫秒）
 */
getLogicalTimeMs(): number
/**
 * 获取物理时钟锚点
 *
 * @returns 真实时间锚点、逻辑时刻与时间倍率
 */
getClockSnapshot(): PhysicalClockSnapshot

/**
 * 获取采集器诊断
 *
 * @returns 各采集器的采样次数、写入耗时与容量使用
 */
getCollectorStats(): CollectorStats[]
```

---

### 私有辅助方法

```typescript
/**
 * 验证 Worker 上下文
 */
private validateWorkerContext(): void
```

---

## 关键设计决策

### 1. 引擎是宿主壳，不是调度器

**设计理念**：调度归 GameSystem（App），宿主只做线程边界、配置与序列化。

GameEngine 不持有事件队列，不推进 tag。它负责加载 GameSystem、转发生命周期命令、把物理时钟与配置交给系统，并在需要时序列化检查点。

### 2. GameSystem 是唯一的装配入口

**设计理念**：装配入口只有一个。

游戏层提供 GameSystem 实现。当前的 ReactorGameSystem 在 `createNetwork` 与 `createCollectors` 中提供网络根与采集器。GameEngine 不再持有工厂、运行时和网络三个对象。

### 3. 引擎不定义游戏概念

**设计理念**：引擎只描述通用机制，游戏概念由游戏层提供。

成员、区域、世界等概念属于游戏层。GameEngine 通过 GameSystem 取得网络与采集器，不引用这些类型。规则变化不改变引擎边界。

### 4. 检查点只保存权威状态

**设计理念**：能重新求出的数据不进检查点。

检查点保存模型版本、当前 tag、网络节点状态与待处理事件。采集器的输出缓冲、呈现帧与诊断计数是派生数据，恢复时由网络重新求出。

### 5. 引擎不逐帧发布

**设计理念**：呈现节奏由消费需求决定。

采集器按自己的周期读取网络参数，求值后写入自己的缓冲。采集频率与推进频率互不约束，也不需要整除。
