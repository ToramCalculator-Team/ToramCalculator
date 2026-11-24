# ReactorGameSystem

## 模块职责

ReactorGameSystem 是 [GameSystem](GameSystem.md) 的 Reactor 实现，把网络装配、输入采样与状态发布映射到运行库的 tag 与微步上。

1. **网络根**：作为 `App` 的子类，持有游戏层构建的反应器网络。
2. **输入采样**：持有输入采样器，把输入通道接到网络。
3. **状态对象**：维护统一状态对象，每一步执行完毕后更新。
4. **时刻映射**：把运行库的 tag 映射为逻辑时刻，报告已完成时刻与下一项工作时刻。
5. **状态编解码**：把 `App` 的内部状态转换为可序列化的状态数据，并从状态数据恢复。

## 理想结构

```typescript
abstract class ReactorGameSystem extends App implements GameSystem {
  /** 网络根：子类构建的反应器网络。 */
  protected root!: Reactor;

  /** 输入采样器：网络内的源反应器。 */
  protected inputSampler!: InputSampler;

  /** 宿主时钟：安装为运行库的物理时间源。 */
  protected clock!: Clock;

  /** 统一状态对象。 */
  public abstract readonly state: SystemState;
}
```

```typescript
/**
 * 建立网络与状态对象
 *
 * 由构造函数调用。安装宿主时钟、建立网络根与输入采样器、分析反应依赖、完成起始时刻的启动反应。
 *
 * @param clock 宿主时钟
 * @param input 输入通道
 * @param state 既有状态；恢复时提供
 */
protected abstract initialize(clock: Clock, input: InputChannel, state?: unknown): void

/**
 * 建立网络根与输入采样器
 *
 * @param clock 宿主时钟
 * @param input 输入通道
 * @returns 网络根与输入采样器
 */
protected abstract createNetwork(clock: Clock, input: InputChannel): {
  root: Reactor;
  inputSampler: InputSampler;
};

/**
 * 当前逻辑时刻
 *
 * @returns 运行库当前 tag 映射出的时刻；微步写入 cursor
 */
getCurrentTime(): SimulationTime

/**
 * 下一项工作的逻辑时刻
 *
 * @returns 事件队列队首 tag 映射出的时刻；队列为空时返回 null
 */
getNextTime(): SimulationTime | null

/**
 * 捕获状态
 *
 * 把 App 检查点转换为只含原始值的状态数据：起始时刻、当前 tag 与微步、待处理事件。
 *
 * @returns 当前时刻与检查点 payload
 */
captureState(): { time: SimulationTime; payload: ReactorCheckpointPayload }

/** 释放网络、输入采样器与事件源订阅，恢复运行库的物理时间源。 */
dispose(): void
```

### 时刻映射

`SimulationTime.cursor` 放微步：外部按 `timeMs` 排序，需要精确定位时用 `cursor`。

### 状态对象

状态对象由网络发布的参数与实体状态派生，每一步执行完毕后整体更新。网络在同一个逻辑时刻上可能有多个微步；状态对象在该时刻的全部微步完成后才更新，读取方因此不会拿到上游已完成、下游未完成的中间状态。

### 状态数据与恢复

恢复通过构造参数完成：提供状态数据时，在启动任何工作之前把 payload 还原为 `App` 检查点。运行库不重跑启动反应，也不重排同一批定时器。

### 时间与唤醒

装配时把宿主时钟安装为运行库的物理时间源。运行库内的一切时间读取与等待都经由宿主时钟：

- 物理 Origin 事件与经过时间计算读取当前时刻。
- 闹钟使用宿主时钟的唤醒能力安排与取消，到期判定以宿主时钟为准。

时钟不前进时运行库没有到期工作，系统停在当前已完成的时刻。单步与快进是时钟越过一个或多个到期时刻，唤醒按到期先后依次触发。

运行库提供启动、暂停、恢复、单步与停止入口，宿主按时钟状态调用。

## 关键设计决策

### 1. 实现是 App，契约不依赖 App

**设计理念**：单继承留给运行库。

契约只描述时刻报告与状态发布；本实现把契约映射到 `App` 的 tag、微步与检查点能力。其他模型实现同一契约时不受 `App` 影响。

### 2. 时刻由 tag 映射

**设计理念**：tag 是运行库的唯一顺序轴，逻辑时刻是它对外的表达。

`timeMs` 表达逻辑时刻，微步写入 `cursor`；外部按 `timeMs` 排序，需要精确定位时用 `cursor`。

### 3. 状态对象由网络派生

**设计理念**：可观察内容由网络装配与游戏内容决定，只有实现能完整描述。

状态对象按系统的内部结构组织；读取方需要什么形状，由读取方自行投影。

### 4. 物理时间读取宿主时钟

**设计理念**：物理时间就是系统所在虚拟世界的真实时间。

装配时把宿主时钟安装到运行库的物理时间源；物理 Origin 事件与经过时间计算据此取值。

### 5. 恢复通过构造

**设计理念**：恢复与首次运行走同一条路径。

状态数据在构造函数中还原，之后才允许启动工作；运行库因此只面对位于给定时刻的实例。
