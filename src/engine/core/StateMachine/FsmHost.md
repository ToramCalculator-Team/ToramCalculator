# FsmHost

> 状态：已由 [ADR 0059](../../../../docs/decisions/0059-facts-published-on-subscription-driven-single-bus.md) 取代。本文仅保留旧端口适配方案的迁移说明。

## 历史设计

旧方案把 xstate actor 封装为继承 Reactor 的 FsmHost，通过输入端口接收事件、输出端口发布效果，并在宿主中管理状态活动、定时器与检查点。

当前方案由 GameReactor 直接持有同步 xstate actor。actor 接收 Reactor 内 EventBus 派发的事件并提交意图；需要进入 Reactor 网络的输出由 Reaction 写入端口。未来时刻的操作由 Reactor `Action.schedule` 调度。

当前设计见 [GameReactor](../../../../src/game/toramOnline/World/actors/Member/GameReactor.md) 与 [引擎架构设计](../../document/引擎架构设计.md)。
