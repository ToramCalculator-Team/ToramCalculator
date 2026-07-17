# 0010 - 合并 ProcBus 与 AttributeWatcher 为单一成员内事件总线

- **状态**: Accepted
- **日期**: 2026-06-05
- **决策层**: 编排层 / 通信
- **相关代码**: `src/lib/engine/core/World/Member/runtime/ProcBus/ProcBus.ts`、`src/lib/engine/core/World/Member/runtime/AttributeWatcher/AttributeThresholdSource.ts`、`src/lib/engine/core/Event/BuiltInEvents.ts`

## 背景

成员内部曾有两套“条件满足后唤醒 handler”的系统：ProcBus 处理离散事件，AttributeWatcher 处理属性跨阈值。两者都有来源注册、批量卸载、checkpoint 元数据和 installer 分支，差别只在事件产生方式。继续并存会形成两套订阅模型和持续的人脑路由。

## 候选方案

### A. 保留两套系统

- 优点：零迁移，阈值判断路径最短。
- 缺点：注册表、能力接口和恢复逻辑重复，成员内响应没有唯一入口。

### B. 阈值穿越降格为 ProcBus 事件源

- 优点：只有一套订阅、卸载和 checkpoint 语义；新触发类型可以作为事件源扩展。
- 缺点：增加一次事件派发；单一 `attr.crossed` 事件可能产生 predicate 扇出。

### C. 单一注册表内保留两种 trigger

- 优点：迁移较小，阈值仍直接挂在属性变化上。
- 缺点：总线内部继续按 trigger 类型分支，新增触发类型会继续扩张第二套机制。

## 决议

选 B：**ProcBus 是成员内唯一响应总线；属性阈值检测降格为向 ProcBus 发布事实的事件源。**

核心约束：

1. `AttributeThresholdSource` 只检测跨越并发布 `attr.crossed`，不保存 handler，也不是订阅终点。
2. handler、按来源卸载和 checkpoint 元数据统一由 ProcBus 管理。
3. 方向、上次值等连续信号状态属于阈值源；订阅者私有冷却属于 handler。
4. 起步使用单一 `attr.crossed` 事件，订阅 predicate 按语义字段过滤；只有实测扇出成为热点时，才考虑按 path 分配事件位。
5. 每条阈值注册必须有稳定 `registrationId`。事件携带该身份，订阅者只认领自己的注册，避免同一阈值的多来源订阅产生重复或错向触发。

最后一条是落地复盘后的正确性补充，不改变“阈值是 ProcBus 事件源”的决议方向。

## 代价

- 阈值响应从直接回调变为“检测 → emit → predicate → handler”，增加间接性。
- 单一事件位会唤醒所有阈值订阅者；当前基数较小时接受该扇出。
- 若阈值监控成为高频、稠密的主流需求，ProcBus mask 可能不再合适，需要重新评估专用 trigger。
- 按 path 分配事件位会要求重新决定 EventCatalog 的冻结时机；在升级路径真正触发前不解决。

## 影响范围

- 成员内响应只暴露 ProcBus 的订阅和卸载能力。
- 阈值系统是事件源适配器，不拥有独立 handler 注册表或 checkpoint。
- attachment、BT action 和预览运行时必须遵守同一订阅语义。

## 参考

- ADR 0008：世界可观测属性作为空间介质
- Unreal GAS `OnGameplayAttributeValueChange`
