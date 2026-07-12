# 0011 - 成员事实在结算点成对派发到两条总线

- **状态**: Accepted
- **日期**: 2026-06-05
- **决策层**: 编排层 / 通信
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StateMachine/DamageResolution.ts`、`src/lib/engine/core/DomainEvents/DomainEventBus.ts`、`src/lib/engine/core/World/Member/runtime/ProcBus/ProcBus.ts`
- **相关 ADR**: Depends on 0010；Related to 0008

## 背景

成员事实有两类消费方：成员内 passive/buff 通过 ProcBus 响应，成员外 UI/控制器通过 DomainEventBus 观察。两条总线职责不同，但部分结算点只派发了对外事件，导致已注册的成员内事件没有来源。

## 候选方案

### A. DomainEventBus 作为 ProcBus 下游

- 优点：表面上只有一个 emit 点。
- 缺点：引擎级 UI 投影会耦合每成员的内部事件；两类消费者需要的 payload 也不相同。

### B. 权威结算点成对派发

- 优点：维持 ProcBus 对内、DomainEventBus 对外的边界；各自 payload 可按消费者裁剪。
- 缺点：同一事实有两个 emit，需要防止后续只补一条而造成不一致。

## 决议

选 B：**成员事实在唯一权威结算点同时派发到成员内 ProcBus 和引擎级 DomainEventBus。**

这不是冗余广播：两条总线服务不同生命周期和 payload。受击、状态进入/离开等事实都必须在同一结算位置完成配对派发；若此类事实持续增加，再考虑提取统一 helper，但不改变两条总线的职责。

## 代价

- 配对一致性主要依赖结算点约束，缺少类型级强制。
- 接通成员内事件后会增加 ProcBus 的真实订阅扇出。
- 如果未来两条总线的 payload 和消费者完全趋同，当前双发可能成为可合并的冗余。

## 影响范围

- 受击和状态结算点必须同时发布内部响应事实和外部观察事实。
- ProcBus 与 DomainEventBus 不互相作为下游，继续各司其职。
- 新增成员事实时必须检查两类消费者是否都需要事件。

## 参考

- ADR 0008：世界可观测属性作为空间介质
- ADR 0010：ProcBus 作为成员内唯一响应总线
