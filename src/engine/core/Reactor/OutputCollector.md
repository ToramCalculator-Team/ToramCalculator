# OutputCollector

## 模块职责

1. **选择**：消费者声明数据集、实体选择器和字段路径，未声明的字段不产生样本。
2. **节奏**：按自己的周期判断采样期限，不要求网络按相同频率推进。
3. **读取**：期限到达后，在第一个 tag 完成边界读取数据视图，得到一致快照。
4. **写出**：把选定的连续值写入自己的输出缓冲，单写者、单提交号。
5. **容量与失败**：连续样本按配置覆盖或保留，容量与失败策略由采集协议定义。

`OutputCollector` 只采集可寻址的连续状态视图，不消费 GameReactor EventBus 的离散事件；事件输出由 [EventOutputFilter](../Event/EventOutputFilter.md) 按事件订阅驱动。OutputCollector 不产生事件，不推进模拟，不改变网络状态。

---

## 理想结构

### 核心依赖

```typescript
class OutputCollector {
  // 数据集、实体选择器、字段路径、周期、容量与溢出策略
  private config: CollectorConfig;

  // 游戏系统运行时提供的只读状态视图
  private view: ObservationView;

  // 输出缓冲：一个采集器一个
  private writer: OutputBufferWriter;

  // 诊断
  private stats: CollectorStats;
}
```

### 构造

```typescript
/**
 * 构造采集器
 *
 * @param config 数据选择、周期、容量与溢出策略
 * @param view 游戏系统运行时提供的只读状态视图
 * @param writer 输出缓冲写入器
 */
constructor(config: CollectorConfig, view: ObservationView, writer: OutputBufferWriter)
```

### 采样

```typescript
/**
 * tag 完成回调
 *
 * GameSystem 在逻辑时间的全部微步结束后调用。采集器比较当前物理时间与
 * 下一个采样期限；期限已到时，在当前边界读取并写出一次快照。
 * 若一次推进跨过多个期限，不补写重复的历史快照，只采当前状态，并将期限
 * 推进到第一个晚于当前物理时间的周期点。
 *
 * @param tag 已完成的逻辑时间
 */
onTagComplete(tag: Tag): void
```

```typescript
/**
 * 是否到达采样期限
 *
 * 周期按物理时间推进。期限到达时不直接读取；采样发生在到期后的第一个
 * tag 完成边界，因此实际样本时刻可能晚于期限。
 *
 * @param tag 当前逻辑时间
 * @returns 是否应在当前完成边界采样
 */
private shouldSample(tag: Tag): boolean
```

### 参数视图

```typescript
/**
 * 只读状态视图
 *
 * 运行时按稳定的数据集、实体 ID 和字段路径读取已声明的连续状态。
 * 读取只在 tag 完成边界发生，返回该逻辑时间的一致快照。
 */
interface ObservationView {
  read(selection: ObservationSelection, tag: Tag): ObservationSample;
}

interface ObservationSelection {
  dataset: string;
  entities: { kind: "ids"; ids: readonly string[] } | { kind: "all"; entityType: string };
  fields: readonly string[];
}

/** 消费者声明的采集投影示例。字段路径须来自运行时公布的数据集 schema。 */
const memberPanel: ObservationSelection = {
  dataset: "member",
  entities: { kind: "ids", ids: ["member-42"] },
  fields: ["position.x", "position.y", "attributes.hp.current", "attributes.mp.current"],
};
```

### 缓冲

```typescript
/**
 * 连续参数样本写入器
 *
 * 只写参数采样结果。离散事件由 EventOutputFilter 使用独立事件写入接口。
 */
interface OutputBufferWriter {
  /**
   * 写入连续量
   *
   * @param sample 参数样本
   * @param tag 样本对应的逻辑时间
   */
  writeContinuous(sample: ObservationSample, tag: Tag): void;

  /**
   * 发布样本提交号
   *
   * @param tag 样本对应的逻辑时间
   */
  commit(tag: Tag): void;
}
```

### 诊断

```typescript
/**
 * 采集器诊断
 *
 * @returns 采样次数、写入耗时、容量使用与丢弃计数
 */
getStats(): CollectorStats
```

---

## 关键设计决策

### 1. 采集器在网络外

**设计理念**：观察不参与因果链。

采集器不注册为 reaction，不产生事件，不推进模拟。它只在 tag 完成时读取参数。因此改变采集器配置不影响模拟结果；没有采集器时网络照常运行。

### 2. 读点是 tag 完成

**设计理念**：观察者读取的是一致快照。

网络在同一个逻辑时间上可能有多个微步；采集器只在所有微步结束后读取。这样不会出现「上游成员处理完、下游成员还没处理完」的中间状态。

### 3. 一个采集器一个提交号

**设计理念**：不同采集频率不能共用提交号。

10 秒状态历史与 60Hz 呈现共用一个提交号时，必然有一个被迫降频。每个采集器独立提交，消费端各自读取。

### 4. 连续量与离散事实的发布规则不同

**设计理念**：两类数据的消费语义不同。

OutputCollector 的样本是周期性连续量快照，可按配置覆盖或跳过中间提交。若推进跨过采样期限，采集器在第一个后续 tag 完成边界读取一次当前快照，不伪造错过期限时的历史值。离散事件由 EventOutputFilter 逐条接收和追加，不能套用连续样本的覆盖语义。

### 5. 采集内容是声明式投影

消费者以 `dataset + entities + fields` 声明采集内容。`dataset` 和字段路径来自运行时公布的 schema；实体选择使用稳定 ID 或实体类型。运行时校验选择器并建立对应布局，采集器只读取所选字段。

消费者不传任意函数、对象引用或表达式。需要组合字段时，由数据集 schema 提供具名的派生字段，确保采集语义可校验、可版本化，并能映射到共享缓冲布局。

### 6. 采集器不定义业务求值

属性值和其他派生数据由其权威领域模型计算。采集器读取已求值的数据视图并写入缓冲；消费端负责展示，不重复实现游戏状态方程。
