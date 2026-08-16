# 0053 - 成员逻辑状态输出与渲染映射边界

- **状态**: Accepted
- **日期**: 2026-08-16
- **决策层**: 跨层（逻辑引擎 / Worker / 线程协议 / 渲染）
- **相关代码**: `src/engine/core/thread/worldStateBuffer.ts`、`src/engine/core/thread/Simulation.worker.ts`、`src/engine/core/World/Member/`、`src/platform/render/scene/`
- **相关 ADR**: Refines 0016；Depends on 0027；Depends on 0050；Refines 0052

## 决策问题

逻辑引擎需要向渲染层提供成员的当前动作状态。技能流程由 BT 动态编排，触发器可以插入新步骤，因此不能把技能阶段固化为 FSM 生命周期；同时逻辑引擎不应知道动画名称、时长或播放方式。需要决定逻辑状态如何产生、如何汇合，以及实时状态 SAB 只传输什么。

## 决策驱动

- 技能流程可变：active effect BT 是技能流程的执行者，步骤可以动态插入或中断。
- FSM 已经保证成员级动作互斥，并在离开技能状态时中断 active effect BT。
- 逻辑引擎与渲染层必须独立：动画映射、播放策略和逐帧表现属于渲染层。
- 实时状态是 latest-state 语义，渲染器只读取最新提交并允许跳过中间状态。
- 渲染器不接收离散视觉事件，所有当前表现必须能从一个一致的 SAB 提交重建。

## 候选方案

### A. FSM 作为唯一视觉状态来源

BT 把流程阶段变化发回 FSM，由 FSM 统一发布状态。

- 优点：渲染输入来源单一。
- 缺点：FSM 必须预定义任意动态技能步骤，或者退化为通用状态转发槽；BT 到 FSM 的反向依赖增加一层传递；动态插入步骤需要同步修改 FSM 事件面。

### B. FSM 与 BT 分别发布视觉状态到渲染层

渲染器同时接收两个来源并自行裁决。

- 优点：不改变现有逻辑控制关系。
- 缺点：渲染层知道逻辑内部结构；需要定义跨线程的冲突与优先级语义；与“渲染器只解释状态”的边界冲突。

### C. FSM 与 BT 在引擎内汇合为每帧单一状态输出

FSM 和 BT 都声明逻辑状态，由成员投影器按结构规则选择最终状态，Worker 把最终状态写入 SAB。

- 优点：BT 保持动态技能流程；FSM 保持成员生命周期；渲染器只消费一个状态帧；冲突由 FSM 既有互斥和中断规则消化。
- 缺点：引擎内新增状态投影器；需要约束只有 active effect 与 member-flow 两类行为流程 BT 能声明动作状态。

## 决议

选择 C：**逻辑引擎每 Tick 输出成员逻辑状态描述；FSM 与行为流程 BT 在成员内汇合为单一动作状态，渲染器只根据状态名和逻辑时间映射并推进动画。**

确立以下不变量：

1. 逻辑引擎不输出动画事实。SAB 不包含动画片段名、动画时长、progress、循环标志或播放倍率。
2. SAB 的成员动作状态槽只包含 `stateId`、`stateInstance`、`stateStartedAtLogicalTimeMs`。状态名通过稳定目录映射为 `stateId`，`stateInstance` 用于区分同一状态名的连续声明，起始时间使用与提交相同的逻辑时间。
3. 成员状态名使用稳定状态目录。首版状态颗粒度为通用语义状态，例如 `idle`、`dead`、`controlled`、`block`、`dodge`、`skill.busy`、`skill.chanting`、`skill.charging`、`skill.startup`、`skill.active`、`skill.recovery`。状态目录由引擎与渲染资源共同遵守。
4. FSM 状态直接使用 XState `snapshot.matches` 读取，不向状态定义注入 meta，也不自行遍历 `snapshot.value`。Player/Mob 只声明一个很小的投影方法，把当前 FSM 动作状态映射到状态目录。FSM 的动作状态保持互斥，`受控`、`死亡` 等状态转换必须同步退出技能执行状态并清空对应 BT 状态声明。
5. active effect BT 和 member-flow BT 可以声明动作状态。Player 技能阶段由 active effect BT 声明；Mob 不在 FSM 中建模技能阶段，改由 member-flow BT 声明。其他 passive/parallel BT 不发布成员动作状态。BT 发布状态使用语义状态叶子，不接收动画名称和时长参数；状态持续到下一次声明、BT 结束或 FSM 中断。
6. 最终状态选择不使用全局优先级表。FSM 的 `dead / controlled / block / dodge` 状态直接胜出；FSM 为 `skill.busy` 时由 active effect BT 细化技能阶段；FSM 为 `idle` 时由 member-flow BT 声明 AI 驱动动作；其余情况使用 FSM 状态，无状态声明时回退为 `idle`。
7. 同一状态名的连续声明视为新状态，`stateInstance` 递增并重置起始逻辑时间，不能因为状态名相同而跳过再入。
8. 位置、朝向、速度、移动和腾空是物理事实，继续由成员状态标志和位姿字段传输，不编码进动作状态名。
9. 渲染器静态资源保存 `状态名 -> 动画片段与播放策略` 映射。渲染器根据 `stateId + stateInstance + generation` 判断状态版本变化，用 `logicalTimeMs - stateStartedAtLogicalTimeMs` 和本地片段策略推进当前动画。
10. 状态帧是逐 Tick 派生的输出事实，不是独立持久化状态。checkpoint 恢复 FSM 与 BT 后，下一 Tick 由投影器重新生成状态帧。
11. 本 ADR 取代 0052 中「MemberStateTable 保存可重建动画时间线」的条款。0052 关于统一 SAB、布局协商、容量、区域表、modifier provenance 和通道生命周期的约束继续有效。
12. 渲染器不接收 `state` 之外的离散视觉状态事件。渲染器未读取期间已经结束的瞬时状态不补播。

## 代价

- 渲染器需要维护状态映射和本地播放策略；逻辑状态持续时间与本地动画片段长度可能不同，切换时表现为切断或保持末帧。
- BT 作者必须显式声明语义状态，存量 `animation` 动作数据需要迁移。
- 状态目录在首版是闭合的；新增状态名需要同步渲染资源映射，不能只靠 BT 数据即时生效。
- 单成员只输出一个动作状态。多部位并行动画或同时存在的叠加视觉状态不在本决策范围内。

## 重新评估条件

- 动态技能步骤需要超出通用状态目录的逐技能或逐步骤视觉状态。
- 出现必须同时呈现的多个动作状态层，例如上半身施法与下半身移动。
- FSM 与 BT 无法继续通过互斥和中断规则消解状态选择，需要引入显式冲突裁决。
- 渲染器必须依据逻辑结束时间而不是下一状态切换来推进动画。
- 需要跨进程、跨设备或持久化消费成员状态帧。

## 参考

- [ADR 0016：渲染层架构](./0016-render-layer-architecture.md)
- [ADR 0027：场景解析统一产出逻辑输入与静态世界资源](./0027-scene-resolution-for-logic-and-visual-inputs.md)
- [ADR 0050：实时状态的传输语义分类](./0050-realtime-state-transport-semantics.md)
- [ADR 0052：高频世界状态统一使用实时状态 SAB](./0052-realtime-world-state-uses-unified-sab.md)
- [实时世界状态 SAB 迁移计划](../plans/realtime-world-state-sab-migration.md)
