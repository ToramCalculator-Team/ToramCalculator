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
 * 排空当前逻辑时间的全部微步后返回。
 *
 * @returns 推进后的时刻；没有待处理事件时返回 null
 */
stepToNext(): SimulationTime | null

/** 当前逻辑时刻。 */
getTime(): SimulationTime

/** 暂停推进：清闹钟与即时调用。 */
pause(): void

/** 恢复推进：按队首事件重排闹钟。 */
resume(): void

/** 启动推进。 */
start(): void

/** 停止推进。 */
stop(): void
```

`SimulationTime.cursor` 放微步：引擎按 `timeMs` 排序，需要精确定位时用 `cursor`。

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

## 关键设计决策

### 1. 实现是 App，壳不是

**设计理念**：GameSystem 接口不依赖 Reactor，ReactorGameSystem 才继承 App。

这样 ECS 实现可以接同一个壳，GameEngine 也不需要知道 App 的存在。