# 声明式逻辑系统改造计划

**状态**: 待执行  
**预计工作量**: 待估  
**核心决策**: 行为运行时提供行为调用、运行状态管理与动态修改；当前以 mistreevous BT 作为执行后端；FSM 管理状态转换并决定行为何时启动或停止；节点生命周期观测与游戏事件使用独立事件模型

## 目标与边界

目标：分离耦合的托拉姆游戏逻辑和引擎基础设施；
边界：引擎只保留基础设施，跨线程通信、IO、生命周期管理、事件订阅系统、游戏系统基础设施（Reactor、AttributeContainer、Pipeline、Behavior、FSM、EventBus）。所有游戏规则（Member 类型、阵营、技能效果、伤害公式、FSM 定义、节点方法实现、属性 Schema）声明在引擎外部并向下注入。

## 核心设计决策

### 决策 1：事件命名空间由树路径承担

事件身份由节点在树中的层级路径决定，形如 `受击流程.命中判定.基础命中值计算:succeeded`。

理由：树结构本身就是规则结构，命名空间与规则不会漂移；维护独立事件表必然与树结构产生第二处真相源。

### 决策 2：BT 运行时结构分定义与实例两层

定义层存储 mdsl ，动态修饰行为时，修改定义层，然后重新编译对应的行为树。调用时直接使用编译好的行为树。

### 决策 4："可动态编辑"的行为不允许是异步行为

| | 可动态编辑（EditableBTHost） | 不可编辑（FixedBTHost） |
|---|---|---|
| 版本变更时 | 必须丢弃旧树状态 | 无版本变更 |
| 允许的状态 | 仅 SUCCESS / FAILED | RUNNING 允许 |
| Checkpoint | 只存 blackboard | 用 mistreevous checkpoint 机制 |
| 典型场景 | 控制行为树、效果行为树 | 技能 BT |

因为热替换时旧树的 RUNNING 状态无处映射。

### 决策 5：checkpoint 双路径

- **可编辑 BT**：checkpoint 只存 blackboard。重建树后从 blackboard 恢复，无树内部状态。
- **不可编辑 BT**：用 mistreevous 现有的 `captureCheckpoint` / `restoreCheckpoint`，已覆盖 Wait 已等待时长、Repeat 迭代计数、Retry 尝试计数。

本地化 mistreevous 已经实现 checkpoint 机制，无需侵入第三方库。

### 决策 6：FSM 运行时沿用 xstate

现有 FSM 基于 xstate，引擎不额外封装。FSM 定义（machine config）作为游戏规则声明在引擎外部并注入。引擎只提供 xstate runner 与 guard/动作的注入接口。

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

### 阶段 1：行为运行时与 BT 后端适配

目标：建立行为调用和动态定义管理骨架，并验证。

1. 建立行为定义、编译版本与运行状态管理；mistreevous 作为当前 BT 后端接入。
3. 实现定义更新、校验、编译缓存与明确的版本提交边界。
4. 定义更新时已有执行状态的处理契约，并验证 checkpoint 的版本校验。
5. 验证 mistreevous BT 的 checkpoint 恢复路径。

**验收**：提交新行为定义后，新调用使用新版本；更新边界、已有运行状态处理和检查点兼容行为有测试覆盖。

### 阶段 2：领域事件订阅与 BT 观测

目标：建立 GameReactor 内部事实订阅与 BT 节点生命周期观测的独立路径。

1. GameReactor 持有 EventBus，管理自身事件的订阅。
2. 行为运行时为长期运行的 mistreevous BT 建立和清理领域事件订阅。
3. GameReactor内部事件发生时，EventBus将事件交给行为运行时，行为运行时将负载交给匹配的 BT，并在当前逻辑调用中推进。
5. Wait 节点进入等待时，由行为运行时通过 Reactor Action 注册目标时刻，到期后继续推进对应的 BT。

**验收**：Wait 到期时在目标逻辑 tag 恢复推进。

### 阶段 3：硬编码流程改写验证

目标：用一条真实流程验证整套链路。

1. 选一条现有硬编码流程（建议 `DamageResolution` 或一个简单技能效果）改写成 mdsl。
2. 节点实现从 `NodeMethods/ActionMethods.ts` 原样迁出到游戏规则包，通过注入接口注册。
3. 跑通“游戏事件发布 → EventBus 本地订阅 → 行为运行时推进 BT → 行为能力修改状态”全链路。
4. 独立验证节点生命周期观测快照及显式网络输出。

**验收**：相同输入与逻辑时刻下，改写后流程行为与原流程等价；事件负载与响应结果正确。

### 阶段 4：控制行为树迁移

目标：控制行为树改声明式。

1. Player 与 Mob 的 ControlBehavior NodeMethods 全部迁出到游戏规则包。
2. 控制行为树 mdsl 定义随规则包声明。
3. 验证控制行为的同步完成与跨逻辑时刻运行符合行为调用契约。
4. 验证控制行为树在输入事件到达时同步处理，并由 Reactor 网络因果顺序保证其输出生效次序。

**验收**：控制器输入和 AI 决策均经相同的成员输入契约处理；实际生效顺序由逻辑时刻与微步确定，运行记录保留该顺序。

### 阶段 5：效果行为树迁移

目标：效果行为树改声明式。

1. Player 与 Mob 的 EffectBehavior NodeMethods 迁出。
2. `DamageFormulas` 作为游戏规则移出。
3. 技能施法时产生效果；后续阶段、伤害段与区域创建按 Reactor Action 和网络因果关系调度。
4. 验证技能行为的 BT 后端路径、异步等待与 checkpoint。

**验收**：效果在技能施法时产生；跨 tag 的阶段由调度 Action 恢复，checkpoint 回滚后效果状态正确。

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

### 阶段 8：通信边界对齐

本阶段落实事件总线与网络外观察的当前边界：

1. 每个 GameReactor 持有本地 EventBus，发布事件并同步通知本地订阅者。
2. BT 节点生命周期观测与游戏事件分开处理。
3. 节点观测对外输出由消费者显式声明，经专用观察输出写入自己的缓冲。
4. 跨 tag 的延迟效果由 Reactor `Action.schedule` 调度。

## 验收标准

- [ ] 引擎只保留基础设施：通信、调度、运行时、事件机制、产出
- [ ] 游戏规则（BT 节点方法、FSM 定义、属性 Schema、游戏概念）全部声明在引擎外部
- [ ] 行为运行时统一管理行为定义版本、编译产物与运行状态；BT 作为当前执行后端
- [ ] 行为运行时统一支持同步完成与跨逻辑时刻运行的行为
- [ ] 事件命名空间由树路径承担，无固定事件表
- [ ] 事件 payload 是 blackboard 快照，在节点生命周期时刻生成
- [ ] 节点生命周期观测只有显式配置时进入网络输出；GameReactor 内部领域事件只交付本地订阅者
- [ ] 行为定义支持动态修改；新版本按明确边界生效，不要求重建 GameReactor
- [ ] checkpoint 按后端和行为恢复契约保存，并校验定义版本
- [ ] FSM 运行时沿用 xstate，引擎不额外封装
- [ ] 节点 wrapper 自动发射事件，节点实现层无感
- [ ] 改写后的流程行为与改写前在相同输入与逻辑时刻下等价

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| blackboard 快照过大撑满节点观测缓冲 | 阶段 3 验证容量；超容量时收窄到节点声明输出字段 |
| 节点路径作为事件身份难以稳定（树结构调整导致路径漂移） | 订阅端按前缀匹配；树结构是规则结构，版本变更时订阅端同步更新 |
| 定义更新与网络推进交叠 | 在明确的模拟边界提交更新，并按执行契约处理旧版本的 BT 状态 |
| mistreevous 本地化 fork 维护成本 | 作为当前 BT 后端维护，评估其 checkpoint 与升级成本 |
| 迁移期间功能损坏 | 分阶段验证，每阶段跑通现有测试；阶段 3 是关键验证点 |
| 游戏规则包与引擎的注入接口设计不成熟 | 阶段 1 细化接口形状，阶段 3 验证后定型 |
| 大规模迁移工作量 | 阶段 3 跑通后剩余流程改写是机械工作，接口不再变动 |

## 相关文档与 ADR

相关架构文档：
- `src/engine/CONTEXT.md`（行为运行时术语）
- `src/engine/core/BehaviorTree/BehaviorRuntime.md`（行为运行时职责与执行契约）
- `src/engine/core/GameEngine.md`
- `src/engine/core/World/World.md`

关联：
- `docs/plans/engine-blackboard-communication-refactor.md`（本计划的下游消费者）
- Reactor 内部事件总线与外部事件输出订阅边界
- ADR 0060（运行记录以模拟时刻为权威顺序轴）
- ADR 0043（行动录制，待重估）
- ADR 0044（成员状态历史）
