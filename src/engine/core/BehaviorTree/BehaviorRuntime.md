# 行为运行时

## 模块职责

行为运行时管理演员的行为链定义与活动执行，依赖演员提供的执行上下文、内部事件订阅、事件发布和逻辑唤醒调度。

演员处理逻辑事件，FSM 是演员内部的状态组件。FSM 产生启动或停止意图时直接调用行为运行时；行为链进入终态后向 EventBus 发布完成事实，由 FSM 等内部订阅者接收。

1. 定义管理：编译、新增和替换行为链定义。
2. 执行管理：按名称启动、推进、取消和查询活动行为链。
3. 事件路由：按活动执行声明的事件订阅分发演员内部事实。
4. 生命周期：进入终态时通过 EventBus 发布完成事实，并保存和恢复活动执行状态。

## 理想结构

```typescript
class BehaviorRuntime {
  /**
   * 创建行为运行时并编译全部行为链定义。
   * 实现步骤：
   * 1. 保存演员提供的依赖。
   * 2. 逐条校验并编译定义。
   * 3. 订阅定义声明的事件。
   *
   * @param definitions 行为链定义清单
   * @param deps 演员提供的时间、事件和唤醒调度依赖
   * @returns 行为运行时
   */
  constructor(
    definitions: ReadonlyMap<BehaviorName, BehaviorDefinitionInput>,
    deps: BehaviorRuntimeDeps,
  );

  /**
   * 动态新增一条行为链。
   * 实现步骤：
   * 1. 校验名称未被占用。
   * 2. 编译定义并写入定义表。
   * 3. 补充事件订阅。
   *
   * @param name 行为链名称
   * @param definition 行为链定义与事件订阅
   * @returns 无
   */
  add(name: BehaviorName, definition: BehaviorDefinitionInput): void;

  /**
   * 替换已有行为链的定义。
   * 实现步骤：
   * 1. 查找当前定义版本。
   * 2. 编译新版本。
   * 3. 替换定义并更新事件订阅。
   *
   * 活动实例继续使用启动时编译的树，后续启动使用新定义。运行中更新后，
   * 旧活动实例的检查点需要旧版本定义才能恢复。
   *
   * @param name 行为链名称
   * @param definition 新的行为链定义与事件订阅
   * @returns 无
   */
  update(name: BehaviorName, definition: BehaviorDefinitionInput): void;

  /**
   * 启动一次行为链执行，并在当前逻辑调用内推进一次。
   * 实现步骤：
   * 1. 查找定义，确认该名称没有活动实例。
   * 2. 用演员提供的上下文创建编译后的行为树。
   * 3. 写入活动表并补充事件订阅。
   * 4. 推进一次；同步完成时先移除活动实例，再发布完成事件。
   *
   * @param name 行为链名称
   * @param context 演员为本次执行创建的上下文
   * @returns 无
   */
  exec(name: BehaviorName, context: BehaviorContext): void;

  /**
   * 取消指定行为链的活动实例。
   * 实现步骤：
   * 1. 查找活动实例，不存在时结束。
   * 2. 从活动表移除并更新事件订阅。
   * 3. 发布完成状态 cancelled。
   *
   * @param name 行为链名称
   * @returns 无
   */
  cancel(name: BehaviorName): void;

  /**
   * 把演员内部事件交给订阅它的活动实例。
   * 实现步骤：
   * 1. 取活动表当前顺序的快照。
   * 2. 筛选声明了该事件的行为链。
   * 3. 逐个推进；终态实例先移除再发布完成事件。
   *
   * @param event 演员内部事实
   * @returns 无
   */
  dispatchEvent(event: BehaviorEvent): void;

  /**
   * 逻辑时刻到达时推进到期行为链。
   * 实现步骤：
   * 1. 从各活动执行的上下文读取当前逻辑时刻。
   * 2. 对最早等待目标不晚于该时刻的执行推进一次。
   * 3. 向演员请求下一个最早等待目标。
   *
   * 演员在该 tag 处理事件前已经更新上下文中的当前逻辑时刻。
   *
   * @returns 无
   */
  wake(): void;

  /**
   * 捕获全部活动执行的名称、定义版本和行为树状态。
   * 实现步骤：
   * 1. 遍历活动表。
   * 2. 保存名称、定义版本和行为树检查点。
   *
   * 一次 tag 的全部微步结束后调用。
   *
   * @returns 行为运行时检查点
   */
  captureCheckpoint(): BehaviorRuntimeCheckpoint;

  /**
   * 从检查点恢复活动执行。
   * 实现步骤：
   * 1. 确认当前没有活动实例。
   * 2. 校验检查点中的定义版本。
   * 3. 用演员提供的上下文重建行为树并恢复后端状态。
   * 4. 提交活动表并重建事件订阅。
   * 5. 返回恢复后的行为链名称。
   *
   * 演员启动前调用。唤醒由演员恢复的事件队列负责，运行时不再保存唤醒时刻。
   *
   * @param checkpoint 行为运行时检查点
   * @param contexts 演员为各活动行为链提供的上下文
   * @returns 恢复后的活动行为链名称
   */
  restoreCheckpoint(
    checkpoint: BehaviorRuntimeCheckpoint,
    contexts: ReadonlyMap<BehaviorName, BehaviorContext>,
  ): readonly BehaviorName[];

  /**
   * 终止全部活动执行并释放定义与事件订阅。
   * 实现步骤：
   * 1. 清空活动表。
   * 2. 退订事件并清空定义表。
   *
   * 演员卸载时调用。
   *
   * @returns 无
   */
  dispose(): void;
}

type BehaviorName = string;

type BehaviorDefinitionSource = string | RootNodeDefinition | RootNodeDefinition[];

/** 演员为一次执行创建的上下文；当前逻辑时刻由演员在每个 tag 更新。 */
type BehaviorContext = Agent & { currentTimeMs: number };

/** 演员内部事实。 */
interface BehaviorEvent {
  name: string;
  payload?: unknown;
}

/** 一条行为链的定义及其事件订阅。 */
interface BehaviorDefinitionInput {
  source: BehaviorDefinitionSource;
  events?: readonly string[];
}

/** 完成事件负载。 */
interface BehaviorCompleteResult {
  name: BehaviorName;
  status: "succeeded" | "failed" | "cancelled";
}

interface BehaviorRuntimeCheckpoint {
  formatVersion: 1;
  executions: Array<{
    name: BehaviorName;
    definitionVersion: number;
    tree: BehaviourTreeCheckpoint;
  }>;
}

interface BehaviorRuntimeDeps {
  /** 行为树其余运行选项；时间由执行上下文提供，不放在选项里。 */
  treeOptions?: Omit<BehaviourTreeOptions, "getCurrentTimeMs" | "getDeltaTimeMs">;
  /** 请求演员在当前逻辑时刻之后 delayMs 安排一次唤醒。 */
  scheduleWake(delayMs: number): void;
  /** 订阅演员内部事件；返回取消订阅函数。 */
  subscribeEvent(name: string, listener: (event: BehaviorEvent) => void): () => void;
  /** 向演员 EventBus 发布内部事实。 */
  publishEvent(event: BehaviorEvent): void;
}
```

完成事实使用标准事件名 `behavior.completed`，负载为 `BehaviorCompleteResult`。行为链自己的领域完成事件由行为树节点发布，不作为运行时定义字段。

## 关键设计决策

### FSM 直接调用行为运行时

**设计理念**：演员是事件处理者，FSM 是演员内部的状态组件。

演员处理逻辑事件；FSM 产生启动或停止意图时直接调用 `self.BehaviorRuntime.exec` / `cancel`，不经过演员二次分派。行为链进入终态后向 EventBus 发布标准完成事实，FSM 作为内部订阅者接收。

### 行为链名称是公开身份

**设计理念**：演员只描述行为链语义，不管理执行实例。

同一名称同时最多一个活动实例；活动表、事件订阅和检查点都按名称组织。同名重复启动显形失败，刷新场景先取消再启动。

### 定义与执行实例分离

**设计理念**：已编译的树不在运行中被改写。

执行实例持有启动时编译的树；更新只替换定义表，活动实例继续使用原树，后续启动使用新定义。运行中更新后，旧活动实例的检查点需要旧版本定义；确定性运行应在边界固定定义。

### 执行上下文归演员

**设计理念**：上下文结构属于演员，行为运行时不解释其中的成员。

演员在启动前创建上下文并交给行为运行时；运行时只把上下文作为行为树 agent 使用。检查点恢复时，演员按行为链名称重新提供上下文。

### 时间只在演员上下文

**设计理念**：逻辑时间只有一个来源，组件不持有自己的时钟。

演员在每个 tag 处理事件前先更新上下文中的当前逻辑时刻。行为运行时把 `treeOptions.getCurrentTimeMs` 绑定到该上下文字段，用 `nextWakeTimeMs - currentTimeMs` 计算相对延迟交给演员调度；到期后 `wake()` 直接读取上下文中的当前时刻，不接收时间参数。

行为链的等待状态保存在行为树检查点中；运行时检查点不保存当前时刻、已等待时长或剩余时长。恢复时演员恢复事件队列，时间仍从上下文进入。

### 内部事件与外部输入分离

**设计理念**：通信角色不混用。

行为运行时只接收演员 EventBus 的内部事实；端口输入由演员处理后再启动行为链或发布内部事件。延迟唤醒是已存在行为的继续，不包装成事件。
