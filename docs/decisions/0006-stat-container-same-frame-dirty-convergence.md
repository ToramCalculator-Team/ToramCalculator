# 0006 - StatContainer 同帧脏值定点收敛

- **状态**: Accepted
- **日期**: 2026-06-01
- **决策层**: 数据层
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`、`src/lib/engine/core/World/Member/runtime/AttributeWatcher/AttributeWatcher.ts`
- **相关 ADR**: Refines 0001

## 背景

`StatContainer` 每帧刷新 modifier 造成的脏值。旧实现只按拓扑顺序处理一趟，再用线性扫描兜底；listener 在通知阶段写回属性时，新增脏值可能延迟到下一帧。listener 内调用 `getValue()` 还可能触发嵌套刷新，使计算、通知和写回交错。

## 候选方案

### A. 保留单趟拓扑刷新与线性兜底

- 优点：改动小。
- 缺点：listener 写回不能保证同帧按依赖顺序收敛，固定扫描成本与 schema 规模绑定。

### B. listener 写回留到下一帧

- 优点：单次刷新简单且有界。
- 缺点：引入一帧延迟，同一帧读取可能看见旧值。

### C. 同帧有界定点收敛

- 优点：按实际脏属性工作；listener 写回进入下一轮拓扑批次，同帧收敛；可显式处理重入。
- 缺点：长链或振荡会增加单帧成本，需要轮次上限和诊断。

## 决议

选 C：**脏值刷新采用同帧、有界的定点迭代，并分离计算阶段与通知阶段。**

核心约束：

1. 位图负责去重，显式 dirty list 负责迭代。
2. 每轮 dirty 按预计算拓扑 rank 排序。
3. 当前轮计算完成后再统一派发通知；listener 写回进入下一轮。
4. flush 中的按需读取只重算目标依赖链，不嵌套启动完整 drain。
5. 超过轮次上限时必须报告残留 dirty 和 notification，以定位振荡。

## 代价

- 长 listener 链会把更多计算集中到当前帧。
- 位图、dirty list、按需读取与批量刷新需要保持一致。
- 通知改为批次提交语义，依赖“计算后立即同栈回调”的代码不能继续成立。

如果真实场景频繁出现振荡或明显帧时间尖峰，应重新评估 listener 写回模型或改为跨帧收敛。

## 影响范围

- `StatContainer` 是 dirty 调度、定点迭代、通知批次和重入读取的唯一责任方。
- watcher 可以写回属性，但必须接受批次通知语义。
- `Member.tick()` 仍只调用统一刷新入口。
