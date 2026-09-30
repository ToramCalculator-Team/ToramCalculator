# 0057 - Member 编排模块与行为树节点方法边界

- **状态**: Accepted
- **日期**: 2026-08-17
- **决策层**: 编排层 / 跨层
- **相关代码**: `src/engine/core/World/Member/`
- **相关 ADR**: Depends on 0054；Refines 0056

## 决策问题

Member 同时承载成员控制行为树、成员状态机和技能/ buff / passive 效果行为树。原有 `runtime/Agent` 同时包含两类行为树的动作、条件、绑定和类型工具，调用能力边界不清晰。需要确定成员编排模块的组织方式，以及两类行为树节点方法的归属。

## 决策驱动

- 控制行为树只能产生成员控制输入，不能直接执行成员效果。
- 效果行为树需要访问属性、伤害、状态效果、成员内响应机制和效果树生命周期能力。
- Player、Mob 等成员类型需要在公共节点方法之上扩展各自节点方法。
- 节点方法的目录位置应能直接表达其所属行为树和能力面。
- 效果行为树可以有多个激活来源；当前不要求所有效果树都必须由 FSM 激活。

## 候选方案

### A. 所有行为树共用一套 Agent 节点方法和绑定

- 优点：实现简单，公共代码集中。
- 缺点：控制行为树获得不必要的效果能力；目录不能表达调用边界，后续只能依赖约定限制。

### B. 按行为树职责拆分节点方法和绑定

- 优点：控制行为树与效果行为树的能力边界可以由类型和目录共同表达；Player/Mob 扩展可以分别挂在对应模块下。
- 缺点：公共条件、类型工具和绑定组装需要重新划分，部分通用逻辑可能需要在两类模块之间复用。

## 决议

选择 B：**Member 直属持有 `Behavior`、`StateMachine` 和 `EffectBehavior` 三个编排模块；控制行为树与效果行为树分别维护自己的 `NodeMethods` 和 `Bindings`，成员类型在各自的 `Behavior/NodeMethods` 与 `EffectBehavior/NodeMethods` 下提供专用扩展。**

确立以下不变量：

1. `Behavior` 表示 AI 和成员行为序列，节点方法只提交控制输入或读取控制决策所需事实。
2. `EffectBehavior` 表示技能、buff 和 passive 行为树，节点方法可以使用成员效果运行时能力。
3. `StateMachine` 负责成员生命周期和输入裁决；它可以激活或中断 active effect BT，但不是所有效果 BT 的唯一激活来源。
4. 效果行为树管理器负责推进 active effect 和 parallel effect BT；parallel effect 可以由成员装配或效果行为树等多个来源注册。
5. 公共节点方法使用 `NodeMethods/ActionMethods.ts` 和 `NodeMethods/ConditionMethods.ts` 命名，不使用含义更宽的 `Agent` 或 `Nodes` 作为归属名称。
6. `runtime/` 只承载成员运行时状态、属性容器、状态效果和两类编排模块使用的基础机制，不再承载两类行为树混合的 `Agent` 模块。

## 代价

- 两类行为树需要维护不同的能力接口和绑定工厂。
- 某些公共条件或类型转换工具需要放在明确的共享位置，不能通过一份全能力绑定隐式共享。
- 多源效果行为树仍然存在，效果生命周期需要继续由注册入口和效果管理器共同维护。

## 重新评估条件

- 控制行为树需要直接产生成员效果，而不再通过控制输入和 FSM 裁决。
- 效果行为树的激活来源收敛为单一来源，且该来源稳定覆盖全部技能、buff 和 passive 场景。
- 两类行为树的上下文契约长期完全一致，独立能力面不再提供实际隔离价值。

## 参考

- [0054：成员控制模式与行为序列](./0054-member-control-mode-and-behavior-sequence.md)
- [0056：技能行为树分离状态声明与生命周期等待](./0056-skill-behavior-state-and-wait-separation.md)
- `docs/plans/member-control-mode-behavior-sequence-migration.md`
- `src/engine/document/架构设计说明概要.md`
