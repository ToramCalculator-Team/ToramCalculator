# 引擎决策候选清单

- **状态**: Backlog
- **日期**: 2026-07-13
- **来源**: `src/lib/engine/document/hook与触发层设计讨论结论.md`

本清单保存尚未进入架构决策治理流程的候选问题。每一项都必须在实际需要决定时重新核对当前代码，并通过文档分类、架构显著性和独立演化检查；这里的条目不预先占用 ADR 编号。

## 待评估

- `DamageDispatchPayload` 字段扩展与 bitfield 位索引，来源 §2.1.3。
- 跨 actor 数据使用随事件快照并撤回 `peerStats`，来源 §2.1.4。
- Pipeline 与 overlay 是否继续作为 hook 主通路，来源 §2.2.1。
- Pipeline `emit` 算子是否作为计算层到编排层的主动通知通路，来源 §2.2.2。
- `EventCatalog` 是否作为编排层扁平注册表，来源 §2.3.5。

## 已收敛

- StatusInstance 边界与结构化 Modifier 来源：ADR 0001、0022。
- AttributeWatcher 与 ProcBus 的关系：ADR 0010。
- 成员事实的内部响应与外部投影：ADR 0011。
