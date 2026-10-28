# EventBus

## 模块职责

1. **发布点**：各过程在产生事实的那一刻调用 `publish`，一次发布同时满足引擎内响应与对外缓冲。
2. **引擎内派发**：将事实同步派发给匹配作用域与 topic 前缀的引擎内订阅者（passive、buff、registlet），本 Tick 内生效。
3. **对外事实缓冲**：命中对外订阅的事实追加到本 Tick 的对外缓冲，Tick 末由引擎 drain 写入输出端口事件区。无对外订阅时不产生任何对外数据。
4. **订阅表生命周期**：引擎内订阅按 sourceId 建立索引，成员移除时按 scope 整体清理。

取代 `EventRecorder`（空壳）与 `ProcBus`（成员私有总线）。

---

## 理想结构

```typescript
class EventBus {
  // 引擎内订阅表
  private readonly inEngine: InEngineSubscription[];

  // 对外订阅前缀列表（由外部消费端在场景装配时注册，运行中只读）
  private readonly outboundPrefixes: string[];

  // 本 Tick 对外事实缓冲，Tick 末 drain 后清空
  private outboundBuffer: BusEvent[];
}
```

---

### 构造

```typescript
constructor(outboundPrefixes: string[]): void
// 接收对外订阅前缀列表，运行中不变
// 实例归 World，随 World 一起创建与销毁
```

---

### 订阅管理

```typescript
/**
 * 引擎内订阅：在指定作用域内订阅 topic 前缀
 * @param scope  作用域，通常为 member:<id>
 * @param sourceId  passive / buff / registlet id，按来源批量清理时使用
 * @param topicPrefix  topic 前缀，前缀匹配
 * @param handler  同步回调
 */
subscribeInEngine(scope: string, sourceId: string, topicPrefix: string, handler: (event: BusEvent) => void): void

/**
 * 按来源取消引擎内订阅（passive / buff 卸载时）
 */
unsubscribeBySource(sourceId: string): void

/**
 * 清空指定作用域的全部引擎内订阅（成员销毁时）
 */
clearScope(scope: string): void
```

---

### 发布与派发

```typescript
/**
 * 发布事实
 * @param scope  事实所属作用域
 * @param topic  完整树路径，如 "受击流程.命中判定:succeeded"
 * @param payload  发布时刻的不可变值拷贝
 * @param timeMs  派发模拟时间（毫秒）
 */
publish(scope: string, topic: string, payload: unknown, timeMs: number): void
// 1. 同步派发给 scope 与 topicPrefix 均匹配的引擎内订阅者
// 2. 若 topic 命中任意对外前缀，追加到 outboundBuffer
```

---

### 对外交付

```typescript
/**
 * Tick 末取走本 Tick 的对外事实批，同时清空缓冲
 * 无对外订阅或本 Tick 无命中时返回空数组
 */
drainOutbound(): readonly BusEvent[]
```

---

### 检查点

```typescript
captureCheckpoint(): EventBusCheckpoint
// 只存 nextSubscriptionId 与 sourceId 索引，handler 不可序列化
// outboundBuffer 不进 checkpoint（Tick 内产物，回滚后重新产生）

restoreCheckpoint(checkpoint: EventBusCheckpoint): void
// 清空订阅表与缓冲，恢复 nextId；订阅由安装逻辑重放
```

---

## 关键设计决策

### 1. 机制引擎级，实例归 World

机制（类定义、分桶逻辑）由引擎基础设施层提供，跨 `reset` 存活。实例与订阅表归 World，进 checkpoint，随回滚丢弃。若订阅表挂在引擎上，`reset` 后残留的 handler 闭包仍持有上一个 World 的成员引用，会污染下一次模拟。

### 2. 发布点唯一，在过程本身

各过程发布一次，同时触发引擎内响应与对外缓冲追加。`EventRecorder.record` 的"先全量记录，Tick 末再筛"模式等价于成对派发，一旦一侧漏写另一侧无从发现。合并后不存在第二个发布点。

### 3. 对外前缀在场景装配时固定

运行中对外订阅集合不变。`publish` 只做前缀匹配，不维护 SubscriptionId，无需运行时增删对外订阅。场景切换时重建 EventBus 实例即可换一批前缀。

### 4. 无对外订阅不收集

topic 未命中任何对外前缀时，`publish` 不追加缓冲，对外数据量为零。有无对外订阅时模拟结果逐 Tick 一致（ADR 0059）。

### 5. payload 是发布时刻的不可变值拷贝

payload 在 `publish` 时生成并冻结，不做引用传递。topic 的 payload 形状由规则包的 `defineFlow` 静态声明，与 blackboard 内部字段解耦；外部消费端通过 `topicsOf(flow)` 拿到路径联合类型，写错路径是编译错误（声明式系统建立后生效）。

### 6. topic 命名空间由 BT 树路径承担

topic 形如 `受击流程.命中判定:succeeded`，由节点 wrapper 在执行时自动生成，节点实现层无感。订阅端按前缀匹配选择粒度（ADR 0059）。
