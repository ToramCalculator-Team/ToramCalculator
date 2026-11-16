# GameReactor

> 本模块遵循 [ADR 0059](../../../../../../docs/decisions/0059-facts-published-on-subscription-driven-single-bus.md) 中的 Reactor 内部事件边界。当前成员实现逐步迁移到此组合模型。

## 模块职责

`GameReactor` 是游戏层实体能力的组合容器，基于 LF 风格的 Reactor 调度模型运行。

1. 持有一个基础 Reactor，并组合游戏实体所需的运行时能力。
2. 为 FSM、BTRuntime、AttributeContainer、EventBus 与 PipelineRuntime 提供共享的成员上下文。
3. 将输入事件、BT 执行、属性写入和未来操作接入统一的逻辑时间与 Reactor Action 调度。
4. 由游戏包声明事件目录、属性 Schema、FSM、执行链、计算管线和实体能力配置。

## 理想结构

```typescript
class GameReactor extends Reactor {
  readonly eventBus: EventBus;
  readonly btRuntime: BTRuntime;
  readonly attributes: AttributeContainer;
  readonly pipelineRuntime: PipelineRuntime;
  readonly fsm: ActorRef<AnyStateMachine>;
}
```

实际能力由游戏包配置决定。常用成员可以提供包含完整能力集的组合配置；其他实体可以省略不需要的运行时。`GameReactor` 负责能力的装配和上下文连接，具体规则由游戏包提供。

游戏反应器内的事实通过 `EventBus` 同步发布和订阅。事件到达时，BTRuntime 将负载交给匹配的 BT 实例并推进该树；这次内部响应不进入 Reactor 网络调度。FSM actor 也直接订阅或接收内部事件，并提交意图。需要在未来逻辑时刻执行的行为使用 Reactor `Action` 调度；触发时执行效果，再按需发布已发生的事实。只有需要进入网络的输出才由 Reaction 写端口。

## 关键设计决策

### 1. 游戏能力组合不改变基础 Reactor 语义

**设计理念**：沿用 Reactor 的时间与因果模型。

`GameReactor` 组合运行时能力，但调度仍由 LF 风格的 Reactor、端口和 Action 承担。事件总线不创建第二套时钟或隐式调度器。

### 2. 基础设施与规则分层

**设计理念**：通用运行机制复用，游戏语义由游戏包拥有。

引擎提供 EventBus、BTRuntime、xstate actor 运行能力、AttributeContainer 和 PipelineRuntime 的通用机制。游戏包定义各项规则，并决定每类实体装配哪些能力。

### 3. 事件响应由订阅者安排

**设计理念**：事件发布与行为执行分离。

事件总线在当前调用中投递事实，BTRuntime 推进匹配的 BT 实例。BT 节点通过注入的能力修改属性或提交其他意图；需要网络调度的输出由 Reaction 和端口表达。
