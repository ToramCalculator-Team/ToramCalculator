# 声明式逻辑系统改造计划

**状态**: 待执行  
**预计工作量**: 待估  
**核心决策**: 游戏逻辑从硬编码节点方法迁移到 mistreevous 声明式定义；可外部编辑的 BT 同步运行，不可编辑的 BT 允许异步；事件由树路径自动发射，payload 是 blackboard 快照

## 目标与边界

引擎只保留基础设施：跨线程通信、IO、tick 调度、生命周期管理、事件订阅系统、BT/FSM/Pipeline 运行时。所有游戏规则（Member 类型、阵营、技能效果、伤害公式、FSM 定义、节点方法实现、属性 Schema）声明在引擎外部并向下注入。

本计划是 `engine-blackboard-communication-refactor.md` Phase 5（事实发布对齐）的前置依赖：通信重构的输出端口事件区内容由"节点自己发事件"决定，而"节点自己发事件"只有声明式系统建立后才能定义清楚。

两份计划的关系：

| 通信重构阶段 | 依赖 |
|---|---|
| Phase 1（拆分 protocol） | 无 |
| Phase 2（输入快照） | 无 |
| Phase 3（输出快照数据结构） | 无 |
| Phase 3 事件区具体内容 | 本计划完成后 |
| Phase 4（World 接手调度） | 无 |
| Phase 5（事实发布对齐） | 本计划完成 |

通信重构 Phase 1–4 可与本计划并行推进。Phase 5 必须等本计划落地。

## 依赖链

```
BT 节点能发事件（wrapper 自动发射，节点实现无感）
  → BT 定义声明化（规则用 mdsl，节点实现可注入）
    → 事件订阅/收集系统（订阅者决定收哪些事件）
      → 输出端口事件区内容定稿
        → 通信重构 Phase 5
```

## 核心设计决策

### 决策 1：事件命名空间由树路径承担

事件不约定固定表。事件身份由节点在树中的层级路径决定，形如 `受击流程.命中判定.基础命中值计算:succeeded`。订阅端按前缀匹配选择粒度。

理由：树结构本身就是规则结构，命名空间与规则不会漂移；维护独立事件表必然与树结构产生第二处真相源。

### 决策 2：事件 payload 是 blackboard 快照

触发时刻对 BT 实例的 blackboard 做整体快照，连同成员身份与树路径一起作为 payload。不做引用传递，因为 payload 要写跨线程的输出端口事件区，必须自包含。

理由：blackboard 是可变共享状态，"命中"事件在 Tick 中途触发时 damage 已写入，后续节点可能覆盖；Tick 末取到的是最终值，不是事件发生时的值。快照必须在节点生命周期时刻生成。

容量控制：只有匹配外部订阅的路径才做快照并写入事件区，无外部订阅的路径只在 worker 内 EventBus 派发，不进入 SAB。本领域每个成员的 blackboard 不大（目标、位置、伤害值、几个技能状态），按 tick 内对外事件量估算应在容量内。超容量时收窄到节点声明输出字段 + 选择性快照。

### 决策 3：BT 运行时结构分定义与实例两层

```
BTFlowRegistry（引擎层，跨 reset 存活）
  flowId → { version, compiledTree, impls }
     ↑ 版本变更时重编译，编译产物缓存

BTFlowHost（每实体每流程一个，归 World）
  { flowId, version, blackboard }
     ↑ 每 tick 检查 version，变化则重建树（保留 blackboard）
```

`compiledTree` 是 mdsl 解析产物，只在版本变更时生成一次，运行时复用。版本号由规则包提供，引擎只比较，不每 tick 算 hash 或读 mtime。

重建时机在 tick 开头、模拟推进之前，保证本 tick 内无重建，事件顺序轴不受重建耗时影响。

### 决策 4：同步判据是"可外部编辑"

| | 可外部编辑（EditableBTHost） | 不可编辑（FixedBTHost） |
|---|---|---|
| 版本变更时 | 必须丢弃旧树状态 | 无版本变更 |
| 允许的状态 | 仅 SUCCESS / FAILED | RUNNING 允许 |
| Checkpoint | 只存 blackboard | 用 mistreevous checkpoint 机制 |
| 典型场景 | 控制行为树、效果行为树 | 技能 BT |

判据是物理约束：热替换时旧树的 RUNNING 状态无处映射。这条规则写进 EditableBTHost 的接口契约，作为运行时断言：

```typescript
class EditableBTHost {
  tick(now: number) {
    if (this.version !== registry.version) {
      this.rebuild()  // 保留 blackboard，丢弃一切 RUNNING 状态
    }
    const result = this.tree.step()
    assert(result !== State.RUNNING, `EditableBT must not return RUNNING: ${this.flowId}`)
  }
}
```

### 决策 5：checkpoint 双路径

- **可编辑 BT**：checkpoint 只存 blackboard。重建树后从 blackboard 恢复，无树内部状态。
- **不可编辑 BT**：用 mistreevous 现有的 `captureCheckpoint` / `restoreCheckpoint`，已覆盖 Wait 已等待时长、Repeat 迭代计数、Retry 尝试计数。

本地化 mistreevous 已经实现 checkpoint 机制，无需侵入第三方库。

### 决策 6：FSM 运行时沿用 xstate

现有 FSM 基于 xstate，引擎不额外封装。FSM 定义（machine config）作为游戏规则声明在引擎外部并注入。引擎只提供 xstate runner 与 guard/动作的注入接口。

## 引擎基础设施清单

留在 `src/engine/` 的模块：

**通信**
- 跨线程协议（`thread/protocol/`）
- SAB 编解码（`core/input/`、`core/output/`）
- Worker 池（`thread/SimulationWorkerPool`、`thread/EngineWorkerClient`）

**调度**
- tick 调度（`core/GameEngine`）
- 生命周期管理（`core/GameEngineSM`）
- Tick 内阶段缓冲机制

**运行时**
- BT runner（新建，基于 `src/lib/mistreevous`，含 BTFlowRegistry / EditableBTHost / FixedBTHost / 节点 wrapper）
- FSM runner（xstate，引擎只提供 runner，不封装）
- Pipeline 运行时（`core/World/Pipeline/PipelineService` 等）
- AttributeContainer 求值引擎（`Member/AttributeContainer/AttributeContainer.ts`、`DependencyGraph.ts`、`ModifierDslParser.ts`，不含具体 Schema 定义）
- ExpressionEvaluator / JSProcessor（`World/Expression/`、`World/JSProcessor/`）
- SpaceManager（空间索引机制）

**事件**
- EventBus 机制（`World/Event/`，不含词汇表）
- MessageQueue 机制（`World/MessageQueue/`，不含内容）

**产出**
- runOutput（`core/runOutput`）
- tickStateHistory（`core/tickStateHistory`）
- 快照编解码

**World 容器**
- World（存储结构 + tick 两相调度，不感知 Player/Mob 概念）
- MemberManager（管理实体实例，不感知具体类型）

## 游戏规则提取清单

移出到 `src/game/`，按领域关切（Bevy Plugin 风格）组织。组织单元是"一件游戏事物"，技术类型（BT 定义、FSM、Schema）是目录内的文件命名约定，不是目录结构的分类维度。

### 目标目录结构

```
src/game/
  combat/                      ← 战斗领域系统
    hitResolution.mdsl           ← 命中判定 BT 流程
    damageFormulas.ts            ← 伤害公式（纯函数，跨所有技能复用）
    damageResolution.ts          ← 伤害结算流程（来自 StateMachine/commonFunctions/）
    targetSelection.ts           ← 目标选择（来自 StateMachine/commonFunctions/）
    events.ts                    ← HitEvent、DeathEvent 等事件类型
  locomotion/                  ← 移动领域系统
    movementSystem.mdsl
    paceResolver.ts
  skills/                      ← 技能，每个技能是自包含的声明单元
    [skillId]/
      definition.ts              ← 元数据（名称、冷却、费用）
      effect.mdsl                ← 效果 BT，引用 combat/ 的节点名
      effect.agent.ts            ← 效果 BT 的局部 agent（可选）
  status-effects/              ← 状态效果
    [effectId]/
      definition.ts
      effect.mdsl
  characters/                  ← 角色类型
    player/
      attrSchema.ts              ← 来自 PlayerAttrSchema.ts + MemberBaseSchema.ts
      controlBt.mdsl             ← 来自 Player/ControlBehavior/ 的定义
      fsm.ts                     ← 来自 playerFSM.raw.ts + PlayerStateMachine.ts
      collectors.ts              ← 来自 collectors/ 目录
    mobs/
      [mobId]/
        attrSchema.ts            ← 来自 MobAttrSchema.ts
        controlBt.mdsl           ← 来自 Mob/ControlBehavior/ 的定义
        fsm.ts                   ← 来自 mobFSM.raw.ts + MobStateMachine.ts
  areas/                       ← 区域效果规则（机制留引擎，规则移出）
    buff/
      effect.mdsl                ← 来自 BuffAreaSystem.ts 的效果逻辑
    damage/
      effect.mdsl                ← 来自 DamageAreaSystem.ts 的效果逻辑
    trap/
      effect.mdsl
  registlets/                  ← 来自 BuiltInRegistlets.ts
    builtIn.ts
  shared/                      ← 跨领域复用的 BT 节点实现原语
    actions.ts                   ← 跨概念共用的 action 实现
    conditions.ts                ← 跨概念共用的 condition 实现
  pipelines/                   ← 来自 Pipeline/standard/index.ts
    standard/
      index.ts
  index.ts                     ← 注册入口，向引擎注册全部规则
```

### 来源映射

| 现有路径 | 迁移目标 |
|---|---|
| `Member/ControlBehavior/NodeMethods/ActionMethods.ts` | `shared/actions.ts` 或各领域模块 |
| `Member/ControlBehavior/NodeMethods/ConditionMethods.ts` | `shared/conditions.ts` |
| `Member/EffectBehavior/NodeMethods/ActionMethods.ts` | `combat/` + `shared/actions.ts` |
| `Member/EffectBehavior/NodeMethods/ConditionMethods.ts` | `combat/` + `shared/conditions.ts` |
| `Member/EffectBehavior/NodeMethods/DamageFormulas.ts` | `combat/damageFormulas.ts` |
| `Member/types/Mob/ControlBehavior/NodeMethods/` | `characters/mobs/[id]/` |
| `Member/types/Player/ControlBehavior/NodeMethods/` | `characters/player/` |
| `Member/types/Mob/EffectBehavior/NodeMethods/` | `characters/mobs/[id]/` |
| `Member/types/Player/EffectBehavior/NodeMethods/` | `characters/player/` |
| `Member/types/Mob/mobFSM.raw.ts` + `MobStateMachine.ts` | `characters/mobs/[id]/fsm.ts` |
| `Member/types/Player/playerFSM.raw.ts` + `PlayerStateMachine.ts` | `characters/player/fsm.ts` |
| `Member/StateMachine/commonFunctions/DamageResolution.ts` | `combat/damageResolution.ts` |
| `Member/StateMachine/commonFunctions/targetSelection.ts` | `combat/targetSelection.ts` |
| `Member/MemberBaseSchema.ts` + `PlayerAttrSchema.ts` | `characters/player/attrSchema.ts` |
| `Member/types/Mob/MobAttrSchema.ts` | `characters/mobs/[id]/attrSchema.ts` |
| `Member/types/Player/collectors/` | `characters/player/collectors.ts` |
| `World/Area/BuffAreaSystem.ts` 效果逻辑 | `areas/buff/effect.mdsl` |
| `World/Area/DamageAreaSystem.ts` 效果逻辑 | `areas/damage/effect.mdsl` |
| `World/Area/TrapAreaSystem.ts` 效果逻辑 | `areas/trap/effect.mdsl` |
| `World/Damage/DamageSystem.ts` | `combat/` |
| `World/EffectRange/trajectorySchema.ts` | `combat/` 或 `shared/` |
| `Member/attachments/BuiltInRegistlets.ts` | `registlets/builtIn.ts` |
| `World/Expression/CasterSnapshot.ts` | `combat/` |
| `World/ScenarioSchema.ts` | `index.ts` 或独立 schema 文件 |
| `World/Pipeline/standard/index.ts` | `pipelines/standard/index.ts` |

`shared/` 是唯一按技术类型组织的目录，存放被多个领域共用的 BT 节点实现原语，类似 ECS 里跨 System 复用的通用 Component。

## 注入接口形状

组织单元是领域模块（Plugin），每个模块向引擎注册自己的全部声明：

```typescript
// 领域模块接口，Bevy Plugin 的等价物
interface GamePlugin {
  // 该领域的 BT 流程定义
  btFlows?: Array<{ flowId: string; definition: string; version: number }>
  // 该领域的节点实现
  btNodeImpls?: {
    actions?: Record<string, NodeMethodImpl>
    conditions?: Record<string, NodeMethodImpl>
  }
  // FSM 定义（xstate machine config）
  fsmDefinitions?: Record<string, MachineConfig>
  // 属性 Schema
  attributeSchemas?: Record<string, AttributeSchema>
  // Pipeline 目录
  pipelineCatalog?: PipelineCatalog
}

// 引擎接受多个插件，统一注册
interface EngineRulesRegistry {
  register(plugin: GamePlugin): void
}
```

`src/game/index.ts` 作为注册入口，按顺序注册 `combat`、`locomotion`、`characters`、`skills` 等模块。引擎在构造时接收注册表，完成注册后运行时不再访问游戏规则层。

节点实现的函数签名：

```typescript
type NodeMethodImpl = (context: NodeContext) => State

interface NodeContext {
  blackboard: Blackboard      // 当前成员的 blackboard
  now: number                 // 当前模拟时间
  deltaTimeMs: number         // 本 Tick 步长
  capabilities: MemberCapabilities  // 成员能力面（submitControlInput 等）
}
```

具体形状在阶段 1 细化，这里确定方向。

## 分阶段实施步骤

### 阶段 1：BT 运行时提取与 wrapper 设计

目标：建立引擎层 BT 运行时骨架，验证版本热替换与事件 wrapper。

1. 在 `src/engine/runtime/bt/` 新建 BTFlowRegistry、EditableBTHost、FixedBTHost。
2. 节点注册器统一包装所有 action/condition，在函数执行前后以节点路径为键发射生命周期事件，事件 payload 是 blackboard 快照。
3. 实现版本检查：tick 开头比较 host.version 与 registry.version，变化则重建树（可编辑 BT 保留 blackboard）。
4. 实现 EditableBTHost 的 RUNNING 断言。
5. 验证 FixedBTHost 的 `captureCheckpoint` / `restoreCheckpoint` 路径可用。

**验收**：跑一个最小流程，改 mdsl 后下一 tick 用新树，事件顺序轴不乱。

### 阶段 2：事件订阅系统与 wrapper 打通

目标：建立 worker 内 EventBus 与对外事件区的连接。

1. EventBus 机制留在引擎，订阅带作用域并分桶。
2. wrapper 发射的事件先入 worker 内 EventBus。
3. 对外订阅匹配的路径做 blackboard 快照、写入输出端口事件区。
4. 无对外订阅时不创建事件区、不收集、不写出（ADR 0059）。

**验收**：有订阅时事件区可见且 payload 是快照；无订阅时不产生任何对外数据，模拟结果逐 Tick 一致。

### 阶段 3：硬编码流程改写验证

目标：用一条真实流程验证整套链路。

1. 选一条现有硬编码流程（建议 `DamageResolution` 或一个简单技能效果）改写成 mdsl。
2. 节点实现从 `NodeMethods/ActionMethods.ts` 原样迁出到游戏规则包，通过注入接口注册。
3. 跑通"节点 wrapper 自动发事件 → 订阅匹配 → 快照写入事件区"全链路。
4. 验证 SAB 容量在预期内。

**验收**：改写后流程行为与改写前逐 Tick 一致；事件 payload 内容正确。

### 阶段 4：控制行为树迁移

目标：控制行为树改声明式。

1. Player 与 Mob 的 ControlBehavior NodeMethods 全部迁出到游戏规则包。
2. 控制行为树 mdsl 定义随规则包声明。
3. 验证 EditableBTHost 的 RUNNING 断言在控制 BT 上生效。
4. 验证"决策相在移动结算之前"的时序正确。

**验收**：控制器输入与 AI 决策在同一决策相生效，录制顺序轴对齐。

### 阶段 5：效果行为树迁移

目标：效果行为树改声明式。

1. Player 与 Mob 的 EffectBehavior NodeMethods 迁出。
2. `DamageFormulas` 作为游戏规则移出。
3. 技能效果统一在施法前摇产生，全部伤害段与区域创建经 MessageQueue 排队。
4. 验证技能 BT 的 FixedBTHost 路径与 checkpoint。

**验收**：技能效果跨帧流程可恢复；checkpoint 回滚后效果状态正确。

### 阶段 6：FSM 与属性 Schema 迁移

目标：FSM 定义与属性 Schema 移出引擎。

1. `playerFSM.raw.ts`、`mobFSM.raw.ts` 迁出到游戏规则包。
2. `PlayerStateMachine.ts`、`MobStateMachine.ts` 装配逻辑迁出。
3. 属性 Schema 定义迁出，引擎只保留求值引擎。
4. `StateMachine/commonFunctions/` 迁出。

**验收**：FSM guard/动作可注入；属性修改器求值结果与迁移前一致。

### 阶段 7：游戏概念整体迁移

目标：Member、Area、Damage 等游戏概念移出引擎。

1. `Member.ts` 迁移为游戏规则层，引擎 World 只持有实体容器接口。
2. `Mob.ts`、`Player.ts` 迁出。
3. Area 具体系统效果规则迁出，机制留引擎。
4. `DamageSystem`、`BuiltInRegistlets`、`CasterSnapshot`、`ScenarioSchema` 迁出。
5. Pipeline 标准管线目录迁出。

**验收**：`src/engine/` 只含基础设施；游戏规则全部在引擎外部声明。

### 阶段 8：通信重构 Phase 5 落地

目标：本计划完成后，回到通信重构完成事实发布对齐。

1. 事件区内容定稿（已由本计划阶段 2 验证）。
2. 合并 ProcBus 与 DomainEventBus 为唯一 EventBus。
3. 事实发布点统一在各过程本身。
4. 其余按 `engine-blackboard-communication-refactor.md` Phase 5 执行。

## 验收标准

- [ ] 引擎只保留基础设施：通信、调度、运行时、事件机制、产出
- [ ] 游戏规则（BT 节点方法、FSM 定义、属性 Schema、游戏概念）全部声明在引擎外部
- [ ] BT 运行时分定义层（Registry，跨 reset）与实例层（Host，归 World）
- [ ] 可外部编辑的 BT 同步运行，禁 RUNNING；不可编辑的 BT 允许异步
- [ ] 事件命名空间由树路径承担，无固定事件表
- [ ] 事件 payload 是 blackboard 快照，在节点生命周期时刻生成
- [ ] 只有匹配外部订阅的路径做快照并写入事件区；无订阅时不产生任何对外数据
- [ ] 版本热替换在 tick 开头完成，保留 blackboard，本 tick 内无重建
- [ ] 可编辑 BT 的 checkpoint 只存 blackboard；不可编辑 BT 用 mistreevous 现有机制
- [ ] FSM 运行时沿用 xstate，引擎不额外封装
- [ ] 节点 wrapper 自动发射事件，节点实现层无感
- [ ] 改写后的流程行为与改写前逐 Tick 一致

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| blackboard 快照过大撑爆 SAB 事件区 | 阶段 3 验证容量；超容量时收窄到节点声明输出字段 |
| 节点路径作为事件身份难以稳定（树结构调整导致路径漂移） | 订阅端按前缀匹配；树结构是规则结构，版本变更时订阅端同步更新 |
| 热替换瞬间事件顺序轴受影响 | 重建在 tick 开头完成，本 tick 内无重建，事件顺序轴不受影响 |
| mistreevous 本地化 fork 维护成本 | 已接受，checkpoint 机制是关键依赖 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试；阶段 3 是关键验证点 |
| 游戏规则包与引擎的注入接口设计不成熟 | 阶段 1 细化接口形状，阶段 3 验证后定型 |
| 大规模迁移工作量 | 阶段 3 跑通后剩余流程改写是机械工作，接口不再变动 |

## 相关文档与 ADR

待新增（本计划落地后）：
- 声明式逻辑系统架构 ADR（覆盖决策 1–6）
- BT 事件发射约定 ADR（wrapper 自动发射、路径命名空间、blackboard 快照）

待修订：
- `src/engine/AGENTS.md`（通信角色表与基础设施边界）
- `src/engine/core/GameEngine.md`
- `src/engine/core/World/World.md`

关联：
- `docs/plans/engine-blackboard-communication-refactor.md`（本计划的下游消费者）
- ADR 0059（对外事实由订阅驱动，本计划的阶段 2 落地）
- ADR 0060（运行记录以模拟时间为权威顺序轴）
- ADR 0043（行动录制，待重估）
- ADR 0044（成员状态历史）
