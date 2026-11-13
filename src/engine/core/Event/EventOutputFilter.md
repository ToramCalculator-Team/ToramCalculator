# EventOutputFilter

> 本模块遵循 [ADR 0059](../../../../docs/decisions/0059-facts-published-on-subscription-driven-single-bus.md) 的当前修订。

## 模块职责

`EventOutputFilter` 是网络外的事件观察订阅者，连接 GameReactor 内部 EventBus 与外部事件输出缓冲。

1. 按消费者配置订阅指定 GameReactor 的事件。
2. 在事件发布时同步接收事件，并按事件名、主体或其他订阅条件筛选。
3. 将匹配事件按发生顺序暂存，保留事件负载和模拟时刻。
4. 在约定的输出提交边界将事件批次交给 SAB 写入器。
5. 显式处理容量不足和写出失败，不静默丢弃已接受的事件。

过滤器不参与 Reactor 网络调度，不执行模拟逻辑，不保存未被任何订阅者接收的事件，也不扫描模拟状态来推导事件。

## 理想结构

```typescript
interface EventOutputSubscription {
  readonly eventNames: ReadonlySet<string>;
  readonly predicate?: (event: DomainEvent) => boolean;
}

class EventOutputFilter {
  subscribe(bus: EventBus, config: EventOutputSubscription): () => void;
  onTagComplete(tag: Tag): void;
  dispose(): void;
}
```

以上表达职责边界，不规定最终 API。事件订阅按消费者需求声明；未声明外部事件输出时，不创建过滤器或订阅句柄。

## 事件流

```text
GameReactor 内事实成立
  → EventBus.publish(event)
  → 同步调用内部逻辑订阅者与 EventOutputFilter
  → 过滤器按订阅配置筛选并暂存
  → 提交边界将事件批次写入 SAB
```

动态创建的 GameReactor 在创建时由其生命周期管理者将 EventOutputFilter 注册到本地 EventBus；销毁时取消该订阅。该订阅关系不改变 Reactor DAG，也不要求为每个成员动态增加端口连接。

## 提交与顺序

事件在事实发生时进入过滤器，不通过固定周期扫描发现。SAB 写入可在事件到达时立即提交，也可在 tag 完成时批量提交。批量提交只决定跨线程发布边界，不改变事件的发生时间和顺序。

过滤器至少保留事件的逻辑时刻、同一时刻内的确定顺序、事件名称与负载。若需要多个 GameReactor 的全序，顺序规则必须由网络因果顺序或稳定主体顺序明确给出，不能依赖不稳定的容器遍历顺序。

## 与 OutputCollector 的关系

两者都是网络外、按消费者声明创建的输出设施，由 GameSystem 负责装配、缓冲绑定、提交边界与销毁。

| 维度 | OutputCollector | EventOutputFilter |
|---|---|---|
| 输入 | 网络发布的连续参数视图 | GameReactor EventBus 发布的离散事件 |
| 触发 | 按配置周期采样 | 事件发布时同步触发 |
| 处理 | 求值或外推参数并写出样本 | 按订阅筛选并保留逐条事件 |
| 提交 | 每个采集器按自己的采样节奏提交 | 可逐事件提交或在 tag 完成时批量提交 |
| 丢失语义 | 连续样本允许按配置覆盖 | 已接受事件不得静默覆盖或丢弃 |

它们共享输出缓冲写入协议、诊断和生命周期管理的基础设施，但不合并成一种采集器抽象；采样节奏和事件订阅语义分别保持明确。

## 生命周期

过滤机制和写入器接口属于引擎提供的基础设施。具体过滤器实例由消费者的输出配置启用后创建；订阅建立在网络与 GameReactor 装配完成时，运行结束、消费者卸载或目标 GameReactor 销毁时清理。没有消费者配置时，不注册外部事件订阅。

消费者配置的更新方式、运行期间热增删订阅的同步边界、事件批次容量与失败恢复策略需由 GameSystem 与 SAB 协议定稿。
