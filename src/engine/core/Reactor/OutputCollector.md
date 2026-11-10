# OutputCollector

## 模块职责

1. **选择**：声明采集哪些参数路径，未声明的路径不产生数据。
2. **节奏**：按自己的周期决定何时采样，与网络推进频率无关。
3. **读取**：在 tag 完成边界读取参数视图，得到一致快照。
4. **写出**：把求值后的结果写入自己的输出缓冲，单写者、单提交号。
5. **容量与失败**：连续量允许覆盖，离散事实必须逐次消费，容量不足显形失败。

OutputCollector 不产生事件，不推进模拟，不改变网络状态。

---

## 理想结构

### 核心依赖

```typescript
class OutputCollector {
  // 选择字段、周期、容量、溢出策略
  private config: CollectorConfig;

  // 参数视图：网络在 tag 完成时发布
  private view: ParameterView;

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
 * @param config 选择、周期、容量与溢出策略
 * @param view 参数视图
 * @param writer 输出缓冲写入器
 */
constructor(config: CollectorConfig, view: ParameterView, writer: OutputBufferWriter)
```

### 采样

```typescript
/**
 * tag 完成回调
 *
 * 由 GameSystem 在逻辑时间的全部微步结束后调用。采集器按自己的周期判断
 * 是否采样；到点时读取参数视图并写入输出缓冲。
 *
 * @param tag 已完成的逻辑时间
 */
onTagComplete(tag: Tag): void
// TODO:
// - 判断周期是否到期
// - 读取参数视图
// - 求值并写入输出缓冲
// - 更新诊断
```

```typescript
/**
 * 是否到达采样点
 *
 * clocked 模式按物理时间判断，unclocked 模式按逻辑时间判断。
 *
 * @param tag 当前逻辑时间
 * @returns 是否采样
 */
private shouldSample(tag: Tag): boolean
```

### 参数视图

```typescript
/**
 * 参数视图
 *
 * 网络发布的连续量参数。读取只在 tag 完成边界发生，返回该逻辑时间的一致快照。
 */
interface ParameterView {
  /**
   * 读取选中字段
   *
   * @param paths 字段路径
   * @param tag 读取时刻
   * @returns 字段值
   */
  read(paths: string[], tag: Tag): ParameterSample;
}
```

### 缓冲

```typescript
/**
 * 输出缓冲写入器
 *
 * 连续量写最新值槽，离散事实追加到事件区。写入完成后发布提交号。
 */
interface OutputBufferWriter {
  /**
   * 写入连续量
   *
   * @param sample 参数样本
   * @param tag 样本对应的逻辑时间
   */
  writeContinuous(sample: ParameterSample, tag: Tag): void;

  /**
   * 追加离散事实
   *
   * @param facts 事实列表
   * @param tag 事实对应的逻辑时间
   */
  appendFacts(facts: DomainFact[], tag: Tag): void;

  /**
   * 发布提交号
   *
   * @param tag 本次提交的逻辑时间
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

连续量允许读取方跳过中间提交，只取最新值；离散事实必须逐次消费。容量不足时显形失败，不静默覆盖。

### 5. 采集器持有求值逻辑

**设计理念**：状态方程只有一份实现。

采集器读取参数后按状态方程求值，把结果写入缓冲。消费端只做展示，不持有求值代码。
