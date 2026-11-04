# ReactorGameSystem

## 模块职责

1. **网络根**：作为 `App` 的子类，持有游戏层构建的反应器网络。
2. **运行控制**：推进 tag、暂停与恢复、单步。
3. **tag 完成通知**：逻辑时间的全部微步结束后，通知采集器与记录器。
4. **输入接入**：持有输入采样器，把输入缓冲接到网络。
5. **状态捕获**：输出 tag、节点状态与待处理事件。

ReactorGameSystem 是 [GameSystem](GameSystem.md) 的 Reactor 实现；线程、共享缓冲、协议与检查点序列化归 GameEngine。

---

## 理想结构

### 核心依赖

```typescript
class ReactorGameSystem extends App implements GameSystem {
  // 输入采样器：网络内的源反应器
  private inputSampler: InputSampler;

  // 采集器：网络外，按各自周期读取参数
  private collectors: OutputCollector[];

  // 逻辑时间完成观察者
  private advanceListeners: AdvanceListener[];
}
```

### 装配

```typescript
/**
 * 初始化
 *
 * 由 GameEngine 在加载时调用一次。子类在这里建立网络、输入采样器与采集器。
 */
initialize(): void
// TODO:
// - 调用 createNetwork 建立网络根与输入采样器
// - 调用 createCollectors 建立采集器
// - 注册完成观察者

/**
 * 建立网络根与输入采样器
 *
 * @returns 网络根与输入采样器
 */
protected abstract createNetwork(): {
  root: Reactor;
  inputSampler: InputSampler;
};

/**
 * 建立采集器
 *
 * @returns 采集器集合
 */
protected abstract createCollectors(): OutputCollector[];
```

### 运行控制

```typescript
/**
 * 推进一次逻辑时间
 *
 * 同步推进当前 tag，排空同一逻辑时间的全部微步。
 *
 * @returns 推进后的时刻；没有待处理事件时返回 null
 */
stepToNext(): SimulationTime | null

/**
 * 当前逻辑时刻
 *
 * @returns timeMs 与 tag/cursor
 */
getTime(): SimulationTime
```

### tag 完成

```typescript
/**
 * 注册逻辑时间完成观察者
 *
 * @param listener 完成回调
 * @returns 取消注册的函数
 */
onAdvance(listener: (time: SimulationTime) => void): () => void
```

### 检查点

```typescript
/**
 * 捕获状态
 *
 * @returns 当前 tag、节点状态与待处理事件
 */
captureCheckpoint(): GameSystemCheckpoint

/**
 * 恢复状态
 *
 * @param checkpoint 检查点
 */
restoreCheckpoint(checkpoint: GameSystemCheckpoint): void
```

---

## 与 App 的关系

`App` 已经提供事件队列、反应队列、tag 与微步、Timer、Action 和 alarm。ReactorGameSystem 不重写调度器，四项能力全部写在 `App` 内（`lib/Reactor/core/reactor.ts`），而不是写在子类里：`_next()`、`_popEvents()`、`_eventQ`、`_currentTag`、`_timersToSchedule` 都是 private，子类无法访问。子类只拿到 `protected` 方法。

- `_stepToNextTag()`（`protected`）：单步包装，内部同步调用 `_next()`，直到逻辑时间推进或队列为空。
- `peekNextTag()`（`protected`）：返回队首事件的 tag；队列为空时返回 `null`。
- `captureEventQueue()` / `restoreEventQueue()`（`protected`）：待处理事件的导出与重建。
- `_startFrom({ startTime, tag, pendingEvents })`（`protected`）：从检查点启动。

不需要 snooze 访问器：`_next()` 不被唤醒就不会重排 snooze，暂停清掉 `_alarm` 与 `_immediateRef` 即可。两者都是 `protected`。

不需要 `_startOfExecution` 访问器：`_determineStartAndEndOfExecution(startTime)` 是受保护方法，已经能同时设定起始时间、当前 tag 与 active 状态。

### 恢复顺序

`_startFrom` 在 `App` 内实现，因为 `_analyzeDependencies()`、`_eventQ`、`_currentTag` 都是 private。顺序固定：

1. `_analyzeDependencies()`。
2. `_determineStartAndEndOfExecution(checkpoint.startTime)`；它遍历 `_timersToSchedule`，把每个 Timer 排到起始时间加 offset，并在 `_executionTimeout` 存在时排一个 shutdown 事件。
3. 清空事件队列，丢掉第 2 步产生的全部 Timer 事件。`_timersToSchedule` 不需要清：第 2 步只遍历它、不消费它，此后也没有路径再读取它。
4. 若 `_endOfExecution != null`，按 `_endOfExecution` 重排 shutdown 事件。第 3 步把它一并清掉了，而字段仍在；不重排则 `_next()` 的结束判断永不成立。
5. `_advanceTime(checkpoint.tag)`：设定当前 tag 并保留微步，与正常推进走同一入口。
6. 注入 `pendingEvents`。
7. `_startExecuting()`。

`startTime` 用检查点保存的**原始起点**，不用 `tag.time`；否则 `getElapsedLogicalTime()` 会从恢复点重新计时。

恢复路径下 `_reactionsAtStartup` 是空的（构造期没有反应调用 `stage()`），因此第 7 步的 `_react()` 不执行任何反应。startup 反应已在原运行里跑过，其结果存在于节点状态中，不重跑。

### 恢复的目标实例

`restoreCheckpoint` 只接受**已构造且未启动**的实例。违反时抛错，不做任何修补。

已启动过的实例不能作为恢复目标：`_timersToSchedule` 已被消费、`_reactionsAtStartup` 已装载、`_eventQ` 里可能有在飞事件，再走一遍 `_startFrom` 会双重排定时器。

用一个只读的 `isStarted()` 判定（`_active` 为真即已启动），`_startFrom` 入口用 `assert*` 风格抛错让问题显形，不默默修补。

### 事件序列化

`TaggedEvent` 需要三个字段：

| 字段 | 来源 | 说明 |
|---|---|---|
| `triggerName` | `trigger._getFullyQualifiedName()` | 重建时按名字查组件表 |
| `tag` | 逻辑时间的秒、纳秒与微步 | 恢复后保持同一 tag |
| `value` | `TaggedEvent.value` | Timer 事件是 Tag；Action 事件需要可检查点约束 |

装配期遍历网络树，建立“全限定名 → trigger”索引；运行期形状不变。恢复时按名字查回 trigger，直接写入事件队列，不走 `schedule`，避免再次触发 alarm 或结束时间过滤。

`__dummy` 事件在本地副本中没有联邦路径，忽略。

---

## 关键设计决策

### 1. 实现是 App，壳不是

**设计理念**：GameSystem 接口不依赖 Reactor，ReactorGameSystem 才继承 App。

这样 ECS 实现可以接同一个壳，GameEngine 也不需要知道 App 的存在。

### 2. 单步与恢复入口都在 App 内

**设计理念**：主循环与队列是 private，能力只能从内部开。

`_next()`、`_popEvents()`、`_eventQ`、`_currentTag` 都是 private，子类无法访问。四项能力（单步、peek、事件导出与重建、从检查点启动）因此统一实现为 `App` 的 `protected` 方法，子类只调用。外部只看到 `stepToNext()`，不需要管理 alarm 与即时调用。

### 3. 暂停只清唤醒源

**设计理念**：`_next()` 不被调用，snooze 就不会重排。

暂停清 `_alarm` 与 `_immediateRef`，冻结物理时钟；不需要访问 snooze。队列里已有的 snooze 事件在恢复后只是一次 keep-alive 唤醒，不影响 tag 序列。

### 4. 事件用全限定名重建

**设计理念**：组件的路径在装配期固定，是天然的稳定标识。

`_getFullyQualifiedName()` 不依赖对象引用；重建时按名字查回 trigger，事件队列可以跨实例搬运。

### 5. tag 完成用 peekNextTag 判断

**设计理念**：tag 完成是观察边界，不是新事件。

`_iterationComplete` 之后查看队首 tag：如果时间晚于当前逻辑时间或队列为空，说明当前逻辑时间已经排空，通知观察者。观察者不注册为 reaction，不参与因果链。
