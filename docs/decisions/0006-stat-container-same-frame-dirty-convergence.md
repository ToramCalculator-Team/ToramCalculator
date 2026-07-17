# 0006 - StatContainer 同帧脏值定点收敛

- **状态**: Withdrawn
- **日期**: 2026-06-01
- **决策层**: 计算层
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`、`src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.test.ts`

## 决策问题

本记录把 `StatContainer` 内部的脏值调度算法误分类为架构决策。位图去重、dirty list、拓扑排序、批次通知、重入处理和收敛轮次上限都属于单一模块内部的实现与正确性约束；它们可以由代码、类型、测试和关键注释完整表达，替换算法也不要求迁移跨模块协议、持久语义或多个独立演化边界。

## 决议

因此，本记录不再作为当前架构决策，也不再细化 ADR 0001。原编号保留，用于说明这次分类修正。

## 原问题去向

- 同帧刷新、通知批次和重入读取的行为由 `StatContainer` 代码与测试约束。
- 振荡诊断和性能边界由实现注释、测试及性能测量维护。
- 如果未来该机制形成跨引擎模块协议、持久格式或可独立取代的运行时边界，再重新进行架构显著性评估。

## 代价

当前决策视图不再提供该算法的架构入口；维护者需要直接阅读代码、测试和实现注释。历史编号继续保留，避免既有讨论失去出处。
