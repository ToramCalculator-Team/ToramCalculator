# 0013 - 注意力机作为阶段无关的根级 actor

- **状态**: Proposed
- **日期**: 2026-06-09
- **决策层**: 跨层（应用层状态架构）
- **相关代码**: `src/machines/`（规划落点：`appMachine.ts`、`visualIntentMachine.ts`）
- **相关 ADR**: 0012

## 背景

应用的根源需求是降低玩家的验证成本，核心循环是 设计 → 验证 → 分析 → 再设计。三个阶段持续时间长、上下文自成一体，适合作为应用的顶层状态：

```
designing ──产物: Build──▶ simulating ──产物: SimResult──▶ analyzing
    ▲                                                          │
    └──────────────── 产物: Insight（回流改设计）────────────────┘
```

ADR 0012 确立了视觉意图机（注意力机）作为 UI 与场景的单一事实源。但注意力机与三个顶层阶段存在交叉：同一套视觉意图管理在设计与验证（乃至分析）中都要工作，而各阶段允许的意图词汇表不同（如分析态不允许编辑装备）。

必须决定：注意力状态在状态架构中的位置——与阶段同机并行？嵌入各阶段子状态？还是独立 actor？

## 候选方案

### A. 并行状态（同一机器内两个 region：阶段 × 注意力）

- 优点：单机器，快照原子（一次订阅拿到全部状态）；statechart 可视化工具能完整呈现；无跨机器协议。
- 缺点：并行区域的前提是正交，但阶段恰恰要约束注意力的合法词汇——region 间互相约束必须用 `in` guard 互窥兄弟区域，耦合以最隐蔽的方式回归；约束逻辑散落在各转移的 guard 上，没有单一落点；机器随功能增长不可分割地膨胀。

### B. 阶段子状态内嵌（designing 与 simulating 各嵌一份注意力子机）

- 优点：约束天然成立——某阶段不合法的意图在该阶段的子状态里根本无定义，无需 guard；离开阶段自动清理注意力状态，无泄漏。
- 缺点：结构重复（同一注意力生命周期写两份，或抽共享配置后 history/context 交接依然别扭）；**阶段切换强制销毁注意力**——"盯着这把武器设计完，切到验证还想看着它"无法表达，而设计↔验证的无缝循环正是产品核心体验；跨阶段共享的修复永远是补丁式的。

### C. 独立根级 actor + capability 纯函数

AppMachine（阶段机）在根级 invoke 注意力机（XState v5 根级 invoke 的 actor 生命周期 = 机器生命周期），以 `systemId` 注册供任意层获取。阶段切换时 AppMachine 向注意力机发 `PHASE_CHANGED`；阶段对意图的约束收敛为一个纯函数：

```ts
// 全系统 phase → 合法意图 的映射只存在于这一个函数
capability(phase: Phase, target: Target, op: Operation): boolean
```

- 优点：actor 生命周期精确等于注意力需要存活的时长（跨阶段）；架构镜像用户认知的连续性；约束有唯一落点，新阶段/新意图只改一处；与引擎已有 actor 范式（Member、GameEngineSM）同构。
- 缺点：跨机器事件协议需要维护和演进；全应用状态不再是单一原子快照（两个 actor 各自快照，调试需跨 actor 追踪）；XState 可视化工具无法在一张图上呈现全貌。

## 决议

选 C。

理由：

1. **判据：actor 的生命周期应等于其状态需要存活的时长。** 注意力需要跨越 designing↔simulating 存活（用户的注意力在阶段切换时是连续的），所以它必须活在阶段之上。方案 B 在根上违背此判据，方案 A 用结构并列回避了生命周期问题但引入区域互窥。
2. **阶段不改变"谁管理注意力"，只改变"哪些意图合法"。** 这天然是数据约束（capability 函数 + guard）而非结构差异（子状态重复）。约束建模为输入，结构只写一份。
3. `PHASE_CHANGED` 时若当前注意力在新阶段不合法，**降级而非清空**（engaging → attending → atRest，逐级回退到第一个合法层级），最大限度保住认知连续性。
4. AppMachine 的 context 即产物链（`build` / `simResult`），阶段间传递的是产物引用，与注意力状态彻底分离——两机各自单一职责。
5. 路由是阶段机的输入/输出之一而非被接管对象：路由变化 → `ROUTE_CHANGED` 事件；机器主动转阶段 → deps 注入的 `navigate()`（仿 `sceneStateMachine` 范式）。

## 代价

- **协议维护成本**：AppMachine 与注意力机之间的事件协议是一条新的内部 API，演进需要两端同步；单机器方案没有这条边。
- **可观测性碎片化**：调试一个"切阶段后相机行为异常"的问题需要同时看两个 actor 的事件日志；需要尽早建立统一的 actor 事件日志习惯。
- **押注阶段间相似性**：capability 纯函数的前提是各阶段的意图结构基本同构、只是词汇表收窄。如果未来发现各阶段的意图结构根本不同（例如分析阶段需要完全异质的"时间轴刷取"交互，与注意力生命周期无法共用），capability 函数会膨胀成 switch 地狱——那时应重新评估方案 B（各阶段专属子机）并 Supersede 本 ADR。

## 影响范围

- 代码层面：新增 `src/machines/appMachine.ts`（阶段机，根级 invoke 注意力机，`systemId: "visualIntent"`）；app 入口以 SolidJS context provider 创建一次 `createActor`；UI 经 `@xstate/solid` 的 `useSelector` 订阅，场景经 `actor.system.get()` 获取。
- 文档层面：与 ADR 0012 共同构成应用层状态架构基准。
- 迁移：不迁移 `store.ts`（数据型状态保留）；不收编 dialog/sheet 管理器；worker 中的模拟引擎不感知这两个 actor。

## 参考

- 与用户的架构讨论（2026-06-09）：并行状态 vs 子状态 vs 独立 actor 的取舍。
- Statecharts（Harel）中并行区域的正交性前提；XState v5 根级 invoke 与 actor system 文档。
- 项目内同构范式：`Member.ts` 的 actor 化、`GameEngineSM.ts` 的角色化机器、`sceneStateMachine.ts` 的 deps 注入。
