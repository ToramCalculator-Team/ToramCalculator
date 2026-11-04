# GameSystem

## 模块职责

1. **模拟入口**：初始化、启动、停止、暂停、恢复、单步。
2. **时间**：提供当前逻辑时刻，通知一次逻辑时间完成。
3. **状态**：捕获与恢复本系统的权威状态。
4. **观察**：提供采集器诊断。

GameSystem 与具体模拟模型无关。当前实现是 [ReactorGameSystem](ReactorGameSystem.md)；ECS 实现以后接同一个壳。

---

## 理想结构

### 核心依赖

```typescript
interface GameSystem {
  initialize(): void;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  stepToNext(): SimulationTime | null;
  getTime(): SimulationTime;
  onAdvance(listener: (time: SimulationTime) => void): () => void;
  captureCheckpoint(): GameSystemCheckpoint;
  restoreCheckpoint(checkpoint: GameSystemCheckpoint): void;
  getCollectorStats(): CollectorStats[];
}
```

### 时间

```typescript
/**
 * 一次逻辑推进的时刻
 *
 * cursor 由实现解释：Reactor 放 tag 与微步，ECS 放步序号。引擎只按 timeMs 排序。
 */
interface SimulationTime {
  timeMs: number;
  cursor?: unknown;
}
```

### 检查点

```typescript
/**
 * GameSystem 的权威状态
 *
 * time 是恢复点，payload 由实现解释：Reactor 放原始起点、tag、微步、节点状态与待处理事件；
 * ECS 放步序号与组件状态。引擎只在外层加模型类型与版本。
 */
interface GameSystemCheckpoint {
  time: SimulationTime;
  payload: unknown;
}
```

### 方法

```typescript
/**
 * 初始化
 *
 * 由 GameEngine 在加载时调用一次。实现在这里建立自己的网络或系统，初始化后
 * 形状不再变化。
 */
initialize(): void

/**
 * 启动推进
 */
start(): void

/**
 * 停止推进
 */
stop(): void

/**
 * 暂停推进
 *
 * 暂停保留状态，恢复后从暂停时的逻辑时刻继续，不补算暂停期间的时间。
 * 物理时钟在暂停期间冻结：反应里读到的经过时间连续，不因暂停跳跃。
 *
 * 调用前引擎已确认暂停，此后输入不再写入共享缓冲。
 */
pause(): void

/**
 * 恢复推进
 */
resume(): void

/**
 * 推进一次逻辑时间
 *
 * @returns 推进后的时刻；没有待处理事件时返回 null
 */
stepToNext(): SimulationTime | null

/**
 * 当前逻辑时刻
 *
 * @returns 当前时刻
 */
getTime(): SimulationTime

/**
 * 注册逻辑时间完成观察者
 *
 * 观察者在一次逻辑时间的全部工作结束后调用。观察者不得推进模拟或修改状态。
 *
 * @param listener 完成回调
 * @returns 取消注册的函数
 */
onAdvance(listener: (time: SimulationTime) => void): () => void

/**
 * 捕获权威状态
 *
 * @returns 当前时刻与实现自己的状态
 */
captureCheckpoint(): GameSystemCheckpoint

/**
 * 恢复权威状态
 *
 * 只接受已初始化且未启动的实例。违反时抛错，不做修补：已启动实例的定时器、
 * startup 反应与在飞事件都已消费，再恢复会双重排定。
 *
 * @param checkpoint 检查点
 */
restoreCheckpoint(checkpoint: GameSystemCheckpoint): void

/**
 * 采集器诊断
 *
 * @returns 各采集器的采样次数、写入耗时与容量使用
 */
getCollectorStats(): CollectorStats[]
```

---

## 关键设计决策

### 1. 壳与模拟模型无关

**设计理念**：外层只依赖“推进、时间、状态、观察”这四件事，不依赖 Reactor 的 tag，也不依赖 ECS 的组件。

GameEngine 只持有 GameSystem 接口。当前实现是 ReactorGameSystem；以后加 ECS 实现时，引擎、输入输出、记录与检查点外壳不变。

### 2. 逻辑时间是最小公共轴

**设计理念**：Reactor 和 ECS 都能提供“当前逻辑时间”，但次序的表达不同。

接口只要求 `timeMs`；`cursor` 由实现解释。Reactor 把 tag 与微步放进 cursor，ECS 把步序号放进 cursor。引擎排序只看 `timeMs`，需要时把 cursor 原样保存。

### 3. 检查点信封归引擎，payload 归实现

**设计理念**：引擎负责版本、模型类型与搬运；实现负责自己的状态格式。

`time` 是恢复点，用于排序与定位。原始起点不进接口，因为它只对实现自己的推导有意义：Reactor 的 payload 带 `startTime`，供恢复后继续算经过时间；ECS 的 payload 带步序号与组件状态。引擎不解释 payload。

### 4. 采集器是观察层

**设计理念**：观察不参与因果链。

采集器由实现建立，在一次逻辑时间完成时读取状态。它们不推进模拟，不修改状态；没有采集器时模拟照常运行。

### 5. 当前实现是 ReactorGameSystem

**设计理念**：先落地 Reactor，不为 ECS 写空实现。

ReactorGameSystem 继承 App，负责网络根、输入采样器、采集器与 tag 推进。ECS 实现等真实需求出现时再补，不提前占位。
