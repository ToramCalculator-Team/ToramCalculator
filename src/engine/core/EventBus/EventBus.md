# EventBus

## 模块职责

1. **发布**：各过程调用 `publish(topic, payload, timeMs)`，一次发布同时满足引擎内响应与对外缓冲。
2. **引擎内派发**：同步派发给 topic 前缀匹配的引擎内订阅者（passive、buff、registlet），本 Tick 内生效。成员身份由 payload 携带，handler 自行过滤。
3. **对外事实缓冲**：命中对外前缀的事实追加到本 Tick 缓冲，Tick 末由引擎 drain 写入输出端口事件区。无命中时不产生任何对外数据（ADR 0059）。
4. **订阅表生命周期**：引擎内订阅按 sourceId 建立索引，passive / buff 卸载时按 sourceId 批量清理。

取代 `EventRecorder` 与 `ProcBus`。机制（类定义）归引擎基础设施，实例归 World，随 World 创建与销毁。

---

## 核心结构

```typescript
class EventBus {
  // 引擎内订阅表
  private subscriptions: InEngineSubscription[];

  // 对外订阅前缀，场景装配时传入构造函数，运行中只读
  private readonly outboundPrefixes: readonly string[];

  // 本 Tick 对外事实缓冲，Tick 末 drain 后清空
  private outboundBuffer: BusEvent[];
}
```

---

## API

```typescript
/** 构造：传入对外订阅前缀列表，运行中不变 */
constructor(outboundPrefixes: string[])

/** 引擎内订阅，topicPrefix 前缀匹配 */
subscribeInEngine(sourceId: string, topicPrefix: string, handler: (event: BusEvent) => void): void

/** 按来源批量取消引擎内订阅（passive / buff 卸载时） */
unsubscribeBySource(sourceId: string): void

/** 发布事实 */
publish(topic: string, payload: unknown, timeMs: number): void

/** Tick 末取走对外事实批并清空缓冲 */
drainOutbound(): readonly BusEvent[]

captureCheckpoint(): EventBusCheckpoint
restoreCheckpoint(checkpoint: EventBusCheckpoint): void
```

---

## 关键设计决策

### 发布点唯一，在过程本身

`publish` 一次调用同时派发引擎内订阅者并写对外缓冲，不存在第二个发布点。`EventRecorder` 的"全量记录 Tick 末筛"等价于成对派发，合并后消除。

### 无 scope，成员身份在 payload

引擎内成员数是个位数，所有订阅共享一张表，prefix 过滤后 handler 按 `payload.targetMemberId` 自判即可。引入 scope 分桶在此规模下没有收益（YAGNI）。

### 对外清单静态，引擎内清单动态

对外前缀在构造时固定，场景切换时重建实例即换一批前缀，不需要取消订阅 API。引擎内订阅随 passive / buff 安装卸载动态增删，只需 `unsubscribeBySource`。

### checkpoint 只存 nextId

handler 不可序列化；subscriptions 由 passive / skill 安装逻辑在 restore 后重放。outboundBuffer 不进 checkpoint，回滚后本 Tick 从空重新产生。
