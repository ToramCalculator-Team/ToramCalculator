# FsmHost

## 模块职责

1. **宿主状态机**：持有 xstate actor，把事件批次喂给机器，读取快照。
2. **意图分发**：把动作提交的意图分派到流程活动、效果出口和定时器。
3. **流程活动**：按状态的 `activity` 声明启动/停止 mistreevous 流程，把流程事件送回状态机。
4. **定时器**：把 `after` 声明编译成 Reactor `Action`，按状态 epoch 失效。
5. **检查点**：保存机器快照、活动流程、定时器 epoch 与上下文。

FsmHost 是引擎层的通用 Reactor 基类，不包含成员、区域、世界等游戏概念。

---

## 理想结构

### 核心依赖

```typescript
abstract class FsmHost<TMachine extends AnyStateMachine, TEffect> extends Reactor {
  // 事件入口与效果出口
  readonly events: InPort<readonly EventFromLogic<TMachine>[]>;
  readonly effects: OutPort<readonly TEffect[]>;

  // xstate 机器与快照
  private actor: Actor<TMachine>;

  // 本次推进收集的意图
  private pendingIntents: Intent<TEffect>[];

  // 状态活动：状态 → 流程
  private flows: Map<FlowId, FlowActivity>;

  // 定时器 epoch：状态切换后旧定时器失效
  private timerEpoch: number;
}
```

### 包

```typescript
/**
 * FSM 包
 *
 * 编辑器或代码生成器产出的可执行定义。引擎只消费这个包，不感知编辑器格式。
 */
interface FsmPackage<TMachine extends AnyStateMachine, TEffect> {
  /** xstate 机器 */
  readonly machine: TMachine;

  /** 状态活动表：进入状态时启动哪个流程 */
  readonly activities: ActivityTable<TMachine>;

  /** 定时器表：after 声明编译后的结果 */
  readonly timers: TimerTable<TMachine>;

  /** 意图到效果的映射 */
  readonly effects: EffectRegistry<TEffect>;
}
```

### 构造

```typescript
/**
 * 构造宿主
 *
 * @param container 所属 reactor
 * @param pkg 游戏层提供的 FSM 包
 */
constructor(container: Reactor, pkg: FsmPackage<TMachine, TEffect>)
```

### 事件处理

```typescript
/**
 * 处理事件批次
 *
 * 逐条送入 xstate 机器，收集动作提交的意图，按顺序分发。
 *
 * @param events 事件批次
 */
private handleEvents(events: readonly EventFromLogic<TMachine>[]): void
```

```typescript
/**
 * 分发意图
 *
 * @param intents 本次推进产生的意图
 */
private dispatchIntents(intents: readonly Intent<TEffect>[]): void
```

### 流程活动

```typescript
/**
 * 启动流程
 *
 * @param flowId 流程标识
 * @param input 流程输入
 */
private startFlow(flowId: FlowId, input: unknown): void

/**
 * 停止流程
 *
 * @param flowId 流程标识
 */
private stopFlow(flowId: FlowId): void
```

### 定时器

```typescript
/**
 * 调度 after 定时器
 *
 * @param timer 定时器声明
 */
private scheduleTimer(timer: TimerDeclaration<TMachine>): void
```

### 检查点

```typescript
/**
 * 捕获检查点
 *
 * @returns 机器快照、活动流程与定时器 epoch
 */
captureCheckpoint(): FsmCheckpoint

/**
 * 恢复检查点
 *
 * @param checkpoint 检查点
 */
restoreCheckpoint(checkpoint: FsmCheckpoint): void
```

---

## 关键设计决策

### 1. 第一版用 xstate v5 作为运行时

**设计理念**：生态和用户熟悉度优先。

xstate v5 提供成熟的机器定义、并行/历史状态、模拟与编辑生态。引擎不重复实现状态图运行时；FsmHost 负责把 xstate 接到 Reactor 的 tag、端口和 Action 上。

### 2. 状态机不是 Reactor

**设计理念**：状态机是实体反应器内部的纯状态推进。

每个实体反应器持有一个 FsmHost；状态机不产生 tag、不持有端口。事件通过 `events` 批次进入，效果通过 `effects` 出口离开。

### 3. 状态机动作只提交意图

**设计理念**：状态机不直接改世界。

动作向 `pendingIntents` 提交意图；宿主分派：启动/停止流程、写效果出口、调度定时器。意图是数据，可记录、可重放、可测试。

### 4. 行为流程是状态的活动

**设计理念**：状态机管互斥状态，行为树管状态内部的行为序列。

状态声明 `activity`，宿主在进入时启动流程、退出时停止。流程完成以事件回到状态机，不直接改状态。

### 5. after 编译成 Reactor Action

**设计理念**：时间只由 tag 承载。

xstate 的 `after` 由适配器抽取成定时器表，宿主用 `Action.schedule` 调度。状态切换后旧 epoch 的定时器事件被忽略，不做取消。

### 6. 类型从机器定义推导

**设计理念**：定义是单一来源。

内置规则用 `EventFromLogic`、`ContextFrom`、`SnapshotFrom`、`StateFrom` 生成端口、快照与状态类型；玩家规则用 schema 运行期校验。效果联合单独声明，因为 xstate 不表达效果。

### 7. 禁用 actor 的异步能力

**设计理念**：Reactor 是唯一的调度器。

`invoke`、`spawn`、`sendTo`、外部 `send` 禁用；`raise` 作为内部事件保留。actor 只作为同步状态容器使用，不启动异步任务。
