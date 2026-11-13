# BT 执行链运行时

## 模块职责

`BTRuntime` 是 Reactor 内部的执行链运行时。每个 GameReactor 持有自己的实例；FSM 或 Reaction 管理状态，并通过 `btRuntime.exec(chainId)` 请求执行一条链。运行时负责把该 GameReactor 配置的执行链定义、修饰器与节点实现组装为 mistreevous 树，并管理执行状态、完成通知和 checkpoint。

执行链是不可变基础定义经过修饰器组合后的结果。基础定义和修饰器属于 Reactor 的逻辑配置；装配完成后，运行中的树不因规则更新而热替换。规则变更通过创建新配置并重建 Reactor 生效。

## 核心概念

```typescript
class Reactor {
  readonly btRuntime: BTRuntime;
}

class BTRuntime {
  private readonly chains: Map<ChainId, ChainRuntime>;

  exec(chainId: ChainId, input?: unknown): State;
  captureCheckpoint(): BTRuntimeCheckpoint;
  restoreCheckpoint(checkpoint: BTRuntimeCheckpoint): void;
}

interface ChainDefinition {
  readonly id: ChainId;
  readonly base: RootNodeDefinition;
  readonly decorators: readonly ChainDecorator[];
}

interface ChainRuntime {
  readonly definition: RootNodeDefinition;
  readonly requiredImpls: RequiredNodeImpls;
  readonly tree: BehaviourTree;
}

interface RequiredNodeImpls {
  readonly actions: ReadonlySet<string>;
  readonly conditions: ReadonlySet<string>;
}
```

以上是职责示意，具体类型由 Reactor 能力配置定稿。

- `ChainDefinition` 是不可变的基础定义与有序修饰器配置。
- 修饰器接收定义树并返回派生定义树，不修改基础定义。装配产物独立于基础定义，可供 mistreevous 构树。
- `requiredImpls` 从最终派生定义树提取，因为修饰器可能改变节点依赖；它用于验证 Reactor 提供的实现是否齐全。
- `BTRuntime` 只管理本 Reactor 配置的执行链，不是全局流程目录。编译缓存若有需要，应是实现优化，不决定执行链归属或组合。

## 定义与节点类型

执行链定义可来自 MDSL，也可来自具备 TypeScript 类型的定义构造器。两种入口应汇合为 mistreevous 的 `RootNodeDefinition`，后续修饰、依赖提取和构树基于结构化定义树完成，不对 MDSL 文本做字符串替换。

MDSL parser 提供运行时的结构化类型信息：每个节点都有 `type`；action 和 condition 的业务节点名位于 `call`；结构节点以 `type` 表示其类别，通常没有单独的业务名称。parser 能将字符串解析成类型化 AST，但不能让 TypeScript 根据任意字符串内容静态推导出其中的节点调用和参数类型。需要静态类型体验时，应使用 typed builder/对象定义；MDSL 适合外部编辑后解析和校验。

```typescript
const definitions = convertMDSLToJSON(source);
const root: RootNodeDefinition = definitions[0];
const nodes = flattenDefinition(root);

for (const node of nodes) {
  // node.type 是结构节点类型；action/condition 的节点名是 node.call。
}
```

节点类型和名称的具体提取由解析测试覆盖。带引用子树（branch）的依赖提取还需解析被引用定义，避免遗漏其 action/condition。

## 执行与状态管理

FSM 和 Reaction 独立于 `BTRuntime`。它们管理自己的状态与转换，并在适当时机调用执行链：

```typescript
this.btRuntime.exec("hitCheck", input);
```

`exec` 的调度策略、同一条链重复调用时的行为及并行链属于运行时契约，需在执行模型定稿时明确。FSM 不作为 BT Host 的活动表，也不由 `BTRuntime` 管理状态转换。

执行链是否允许 `RUNNING` 由调用方式或链配置约束。允许跨次推进的链必须保留 mistreevous 树状态；要求一次调用内完成的链应在返回后断言结果不是 `RUNNING`。具体调用与推进边界需与 Reactor reaction 的调度模型一致。

### 事件唤醒与等待

长期激活的 BT 实例由 `BTRuntime` 持有树状态和订阅关系。所属 GameReactor 的 EventBus 同步投递匹配事件后，`BTRuntime` 将事件及负载交给对应实例，并在当前逻辑调用中推进一次 `step()`。`step()` 表示从根节点开始推进一轮树遍历，不表示固定周期，也不进入 Reactor 网络调度。

mistreevous 的 `wait` 节点在 `step()` 时读取模拟时刻并更新自身状态；它不会自行安排未来唤醒。运行时需要在等待节点开始时获知其目标时刻，并使用 Reactor `Action` 调度到期通知。到期通知直接交给 `BTRuntime`，使该树在到期 Action 的逻辑调用中继续推进。具体的节点等待注册接口仍需实现时确定。

## 节点实现与事件

节点实现随 Reactor 的逻辑配置提供，按 action/condition 名称匹配定义中的 `call`。装配时从最终定义提取所需名称并验证实现完整，再构造树。不同 Reactor 可以使用相同节点名但绑定到各自的实现和上下文。

```typescript
type NodeMethodImpl = (context: NodeContext, ...args: NodeArgument[]) => State;

interface NodeContext {
  blackboard: Blackboard;
  now: number;
  deltaTimeMs: number;
  capabilities: MemberCapabilities;
}
```

执行链达到 `SUCCESS` 或 `FAILED` 终态时，`BTRuntime` 向所属 GameReactor 的 EventBus 发布执行链完成事件及结果负载。该发布是同步的；EventBus 按当前订阅表分发且不存储事件。BTRuntime 不依赖外部事件过滤器或 SAB 写入器。

节点生命周期观测（entered、succeeded、failed）与领域事实分开。观测可由节点包装器产生，使用树路径标识节点，并在需要观测时携带事件时刻的 blackboard 快照。是否启用节点观测及是否输出到外部，由消费者订阅配置决定。事件输出过滤器作为 EventBus 外部观察订阅者接收匹配事件；没有订阅者的事件在同步分发后自然结束，不排队、不形成历史记录。

游戏领域事实由有权确认该事实的执行过程发布到所属 GameReactor 的 EventBus。`BTRuntime` 也可作为内部订阅者，将事实交给匹配的 BT 实例并在当前逻辑调用中推进；BT 节点实现通过注入的能力执行响应，例如向 AttributeContainer 添加带来源标识的 Modifier。

节点路径从根到当前节点构造。路径段优先使用节点业务名；结构节点使用稳定的结构标识或节点类型作为兜底。规则定义的路径稳定性及修饰器对路径的影响需要纳入装配约定。

## Checkpoint

每个 `BTRuntime` 捕获其管理的所有执行链状态，以及恢复所需的链标识和黑板数据。允许 `RUNNING` 的执行链使用 mistreevous 的 `captureCheckpoint` / `restoreCheckpoint`，恢复等待时长、Repeat 迭代计数和 Retry 尝试计数。

仅运行至 `SUCCESS` / `FAILED` 的同步链，如果确认树内部没有跨调用状态，则可只保存黑板；若执行树可能在 checkpoint 时处于 `RUNNING`，必须保存树 checkpoint。checkpoint 形状按链的恢复契约定义，不按“可编辑/固定”分类。

mistreevous 的 checkpoint 与定义签名绑定。恢复时应验证 checkpoint 对应的最终派生定义一致；基础定义或修饰器变化产生不同派生定义时，不应恢复旧树状态。

## 与 Reactor 和规则配置的关系

Reactor 骨架持有 `BTRuntime`，并在构造时将执行链定义、修饰器、节点实现和上下文配置交给它。FSM 或 Reaction 通过 Reactor 的 `btRuntime` 发起执行。规则配置在装配完成后保持不可变。

`BTRuntime` 不决定哪个 Reactor 拥有哪些链，也不负责 FSM 状态、Reaction 调度、规则热替换或外部订阅策略。它负责本 Reactor 执行链的装配和运行。