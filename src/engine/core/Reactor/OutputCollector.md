# OutputCollector

## 模块职责

OutputCollector 是游戏状态数据的观察者，按消费者的声明周期性地从统一状态对象检出数据，经宿主输出通道送到外界。

1. **选择**：按消费者声明，从统一状态对象中检出所需的字段。
2. **节奏**：按真实时间安排周期唤醒，期限到达时采样。
3. **投影**：把状态对象中的数据转换为消费者需要的形状。
4. **输出**：把样本交给宿主输出通道，由其写出、发布并跨线程传递。
5. **失败**：采样或写出失败时停止写出并上报。

每个采集器服务一个消费者。

## 理想结构

```typescript
class OutputCollector {
  /** 消费者声明：选择、周期、容量与溢出策略。 */
  private readonly declaration: CollectorDeclaration;

  /** 游戏系统的统一状态对象。 */
  private readonly state: SystemState;

  /** 宿主输出通道：缓冲、布局、发布号与跨线程传递。 */
  private readonly channel: OutputChannelHandle;
}
```

```typescript
/**
 * 构造采集器
 *
 * @param declaration 消费者声明
 * @param state 游戏系统的统一状态对象
 * @param channel 宿主输出通道句柄
 */
constructor(
  declaration: CollectorDeclaration,
  state: SystemState,
  channel: OutputChannelHandle,
)

/**
 * 开始采集
 *
 * 立即采样首帧，并按周期向真实时间定时器安排下一次唤醒。
 */
start(): void

/**
 * 停止采集
 *
 * 取消已安排的唤醒；通道由宿主释放。
 */
stop(): void

/**
 * 采集诊断
 *
 * @returns 采样次数、写出耗时、容量使用与失败计数
 */
getStats(): ObserverStats
```

### 声明

```typescript
interface CollectorDeclaration {
  /** 从状态对象检出的字段路径。 */
  readonly selection: readonly StateFieldPath[];

  /** 采样周期，毫秒，由宿主时钟计量。 */
  readonly periodMs: number;

  /** 通道容量。 */
  readonly capacity: number;

  /** 容量耗尽时的策略：覆盖最旧样本或显形失败。 */
  readonly overflowPolicy: "overwrite" | "fail";
}
```

字段路径引用状态对象已有的结构，字段与值的类型由状态对象的类型定义约束；消费者只声明选择。

### 输出通道

宿主输出通道负责缓冲分配、布局派生与校验、发布号与跨线程传递。采集器只提交投影后的样本和它的逻辑时刻。

```typescript
interface OutputChannelHandle {
  /**
   * 写出一份样本
   *
   * @param sample 投影后的样本
   * @param time 样本对应的逻辑时刻
   */
  write(sample: Sample, time: SimulationTime): void;

  /** 释放通道与缓冲。 */
  close(): void;
}
```

## 关键设计决策

### 1. 观察不参与因果链
