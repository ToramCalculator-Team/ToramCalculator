# 行为运行时

## 模块职责

行为运行时管理 GameReactor 可调用的行为定义及其执行状态，负责定义编译、动态修改、调用、推进、取消和完成通知。

## 理想结构

```typescript
class BehaviorRuntime {
  constructor(deps: BehaviorRuntimeDeps);

  /**
   * 注册并编译行为定义。
   *
   * 同一 behaviorId 重复注册失败；编译失败时已有定义和活动执行保持不变。
   *
   * @param behaviorId 行为标识
   * @param source MDSL 或结构化根节点定义
   * @param options 定义元数据
   * @returns 已提交的定义版本
   */
  registerDefinition(
    behaviorId: BehaviorId,
    source: BehaviorDefinitionSource,
    options?: BehaviorDefinitionOptions,
  ): BehaviorDefinitionRef;

  /**
   * 提交行为定义的新版本。
   *
   * 先编译校验，成功后新调用使用新版本。可编辑定义的活动执行按更新契约取消；
   * 不可编辑定义拒绝更新。
   *
   * @param behaviorId 行为标识
   * @param source 新行为定义
   * @returns 已提交的定义版本
   */
  updateDefinition(behaviorId: BehaviorId, source: BehaviorDefinitionSource): BehaviorDefinitionRef;

  /**
   * 启动一次行为执行，并推进一次。
   *
   * 执行可能停在运行中等待事件或 Wait，也可能直接进入终态。
   *
   * @param behaviorId 行为标识
   * @param input 本次调用输入，作为 blackboard 的初始值
   * @returns 行为句柄；同步完成时句柄已处于终态
   */
  exec(behaviorId: BehaviorId, input?: BehaviorInput): BehaviorHandle;

  /**
   * 推进指定执行一次。
   *
   * 事件推进、Wait 到期和显式单步都走同一入口；终态执行重复调用保持幂等。
   *
   * @param handle 行为句柄
   * @returns 推进后的状态
   */
  step(handle: BehaviorHandle): BehaviorStatus;

  /**
   * 把领域事件交给匹配的执行，并在当前逻辑调用内推进。
   *
   * 按活动执行声明的事件订阅选择目标；多个执行按创建顺序推进。
   *
   * @param event 领域事件
   */
  dispatchEvent(event: BehaviorEvent): void;

  /**
   * 取消执行。取消属于完成通知的一种，状态为 cancelled。
   *
   * @param handle 行为句柄
   */
  cancel(handle: BehaviorHandle): void;

  /**
   * 捕获全部活动执行的标识、定义版本和后端状态。
   *
   * @returns 行为运行时检查点
   */
  captureCheckpoint(): BehaviorRuntimeCheckpoint;

  /**
   * 恢复检查点。
   *
   * 调用前必须已注册对应版本的定义；版本或执行契约不匹配时抛错，不修改当前状态。
   *
   * @param checkpoint 行为运行时检查点
   * @returns 恢复后的活动执行句柄
   */
  restoreCheckpoint(checkpoint: BehaviorRuntimeCheckpoint): readonly BehaviorHandle[];

  /**
   * 终止全部执行并释放编译产物。
   */
  dispose(): void;
}
```

### 句柄与值类型

```typescript
type BehaviorId = string;
type BehaviorExecutionId = string;
type BehaviorVersion = number;

type BehaviorDefinitionSource = string | RootNodeDefinition | RootNodeDefinition[];

/** 本次调用的初始 blackboard。 */
type BehaviorInput = Record<string, unknown>;

interface BehaviorDefinitionOptions {
  /**
   * 是否允许运行期提交新版本。
   *
   * 可编辑定义在更新时取消该行为的活动执行；不可编辑定义拒绝更新。
   * 默认 false。
   */
  editable?: boolean;
}

interface BehaviorDefinitionRef {
  behaviorId: BehaviorId;
  version: BehaviorVersion;
  editable: boolean;
}

type BehaviorStatus = "running" | "succeeded" | "failed" | "cancelled";

interface BehaviorHandle {
  readonly executionId: BehaviorExecutionId;
  readonly behaviorId: BehaviorId;
  readonly definitionVersion: BehaviorVersion;

  /** 当前状态；终态后保持不变。 */
  getStatus(): BehaviorStatus;

  /** 注册完成通知；已结束时同步补发。返回取消订阅的函数。 */
  onComplete(listener: (result: BehaviorResult) => void): () => void;

  /** 等价于 BehaviorRuntime.cancel(handle)。 */
  cancel(): void;
}

interface BehaviorResult {
  executionId: BehaviorExecutionId;
  behaviorId: BehaviorId;
  status: "succeeded" | "failed" | "cancelled";
  output?: unknown;
}

interface BehaviorEvent {
  name: string;
  payload?: unknown;
}

interface BehaviorRuntimeCheckpoint {
  executions: Array<{
    executionId: BehaviorExecutionId;
    behaviorId: BehaviorId;
    definitionVersion: BehaviorVersion;
    state: unknown;
  }>;
}

interface BehaviorRuntimeDeps {
  /** 当前逻辑时刻，供 Wait 与节点观测使用。 */
  getCurrentTimeMs: () => number;
  /** 当前逻辑调用内的推进步长。 */
  getDeltaTimeMs: () => number;
  /** 节点读取成员属性的入口。 */
  resolveProperty: (path: string) => unknown;
  /** 注册 Wait 到期；到期后由 Reactor Action 调用 step。 */
  scheduleWake: (executionId: BehaviorExecutionId, atMs: number) => void;
}
```

`BehaviorRuntime`、`BehaviorHandle` 和定义类型是职责示意，最终 API 由执行模型定稿。当前 BT 后端把 MDSL 或类型化定义转换为 mistreevous 结构化定义；校验和编译针对结构化定义进行。运行时可替换 BT 后端，不改变行为调用方的职责边界。

`exec` 在返回前推进一次：行为可能已经成功、失败，也可能停在运行中等待事件或 Wait。同步完成时，调用方首次通过 `onComplete` 订阅会立即收到结果。

事件到达时，事件总线把事件交给 `dispatchEvent`，运行时按活动执行的事件订阅选择目标，并在当前逻辑调用内调用 `step()` 推进。多个执行按创建顺序推进，保证同一事件下的行为顺序可复现。mistreevous 的 Wait 不安排未来唤醒；等待到期由 Reactor Action 调用 `step()` 恢复对应执行。执行期间的节点观测由 BT 后端生成，不与游戏事件混为一类。

`updateDefinition` 先编译校验，成功后才递增版本并提交。可编辑定义的活动执行在提交点取消，并通过 `onComplete` 收到 `cancelled`；不可编辑定义拒绝更新。新调用使用新版本，已有调用保留其 `definitionVersion`。

完成状态在触发终态的同一逻辑调用内确定，已订阅的监听器会在该调用内同步收到通知，不进入异步任务；`exec` 同步完成时，调用方首次订阅 `onComplete` 会立即收到补发结果。取消同样走完成通知，状态为 `cancelled`。

检查点保存活动执行的标识、定义版本和后端状态。当前 mistreevous 后端通过 `BehaviourTree.captureCheckpoint` 与 `BehaviourTree.restoreCheckpoint` 保存等待时长、Repeat 迭代计数和 Retry 尝试计数。恢复前必须已注册对应版本的定义；恢复时校验定义版本与后端状态签名，不匹配则抛错且不修改当前状态。`restoreCheckpoint` 返回恢复后的句柄，调用方重新注册完成通知后继续接收结果。

## 关键设计决策

### 行为调用与状态转换分离

**设计理念**：状态许可和行为流程由各自职责管理。

FSM 决定当前允许启动哪些行为及其启动、停止时机；行为运行时负责执行行为定义。

### 动态定义由行为运行时管理

**设计理念**：逻辑作者可以在运行期间修改行为流程。

注册为可编辑的行为定义可以提交新版本；不可编辑定义拒绝更新。更新先编译校验，再在明确的提交点替换版本并取消旧执行，不通过重建 GameReactor 生效。

### 完成通知是逻辑推进的一部分

**设计理念**：完成状态必须和产生它的逻辑调用处于同一因果位置。

完成状态在 `step`、`dispatchEvent` 或 `updateDefinition` 的调用内确定，已订阅的监听器在同一调用内收到通知，不进入 Promise 微任务；`exec` 同步完成时由首次订阅补发。这样同一 tag 内的行为完成顺序与推进顺序一致，检查点恢复后也不会出现迟到的异步回调。

### BT 是当前执行后端

**设计理念**：行为概念不绑定单一流程表示。

mistreevous `BehaviourTree` 承担当前的流程执行、等待和 checkpoint；调用方使用行为运行时提供的行为调用能力。
