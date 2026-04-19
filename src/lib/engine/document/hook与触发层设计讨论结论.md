# 引擎架构说明（Hook 与扩展机制讨论结论）

本文档记录围绕 `额外逻辑hook点.txt`（托环/被动逻辑）与 `技能效果参考.txt`（特殊技能逻辑）对引擎分层的分析与决议。命名细节待定。

## 1. 分层与对称结构

引擎沿用 **数据 / 计算 / 编排** 三层，但把分类轴从"层"单独存在，重述成**每层具备对称的三件套**：

| 层 | 静态注册表 | 运行时实例 | 扩展原语（passive/skill 安装时写入） |
|---|---|---|---|
| **数据** | `AttributeSchema`（属性槽）<br>`StatusTypeRegistry`（状态类型） | `StatContainer`<br>`StatusInstanceStore`<br>`MemberSharedRuntime` | 声明属性槽（咏咒层数、lastTriggeredFrame）<br>声明状态类型（着火、昏厥、出血） |
| **计算** | `PipelineCatalog` | `PipelineResolverService` 按成员合成 | 向管线插 overlay 指令（包括 `emit` 派发事件） |
| **编排** | `EventCatalog`<br>BT 定义库<br>FSM 定义 | `BtManager`（active + parallel）<br>订阅表（proc mask + watcher） | 注册 BT / 订阅事件 / 绑定属性 watcher |

**事件订阅不是第四层**——它是编排层内部的通信机制，和 actor 消息、BT 叶子动作同属一类。`EventCatalog` 与 `PipelineCatalog`、`AttributeSchema` 地位对称，都是"该层的静态配置入口"。

**分类轴一致性**：三层仍然按"**组件类型**"划分（存储 / 纯计算 / 控制流）。通信机制（actor 消息 / pipeline 调用 / attribute watcher / event bus）横跨三层，不单独成层。

## 2. 关键决议（按层）

### 2.1 数据层

#### 2.1.1 StatContainer 作为持久化槽的统一载体

技能 / 托环 / buff 在安装时向 StatContainer **声明自己需要的属性槽**，所有跨技能层数、冷却时间戳、计数器都走统一的属性读取语法。

- 爆能的 `咏咒层数`、魔法炮的 `充能百分比`、弧光剑舞的 `灵光层数` 等跨技能数据，统一落成属性槽。
- Passive 的冷却（HP 紧急回复 60s、起跑冲刺 60s、转让 180s）存 `lastTriggeredFrame` 到属性槽，触发判定为 `$currentFrame - $lastTriggeredFrame >= CD`。不再用 BT `wait` 做计时。

**好处**：
- checkpoint / fast-forward / 预览回放零额外工作（Float64Array 已在 checkpoint 中）。
- 公式 / 管线 / BT / 事件 handler 用同一套属性读取语法访问。
- 首次触发用哨兵值表达（`-Infinity` 或 0），比"有没有 cooldown 实例"更直接。

**待定**：属性 key 的命名前缀约定（候选格式：`passive.<id>.<field>` / `skill.<id>.<field>`）。

#### 2.1.2 StatusInstance 边界收紧

`StatusInstanceStore` 仅承载**游戏内可见状态**（昏厥、着火、出血、猛毒、麻痹、迟缓、降防、冻结、停止……）—— 玩家看得见、别的技能要读 `tag` 判定的那种状态。

- 不再把冷却、计数器、层数当 Status 存——这些归属性槽。
- 核心价值是 `tag` 集合，配合编排层订阅"状态进入/离开"事件和计算层的状态查询。

#### 2.1.3 `DamageDispatchPayload` 扩展

受击相关 hook 绝大多数靠归因信息判定，必须扩展：

- `damageTags: string[]` —— 伤害类别标签（`着火 / 猛毒 / 魔力爆发 / 控制强化 / 物理 / 魔法 / 百分比 ...`）。
- `warningZone: string` —— 警告区域类型（`red / blue / none`），服务于红/蓝区护盾。
- `direction` —— 相对方位字段，服务于"殿后"。
- 其余源头信息（施法者 id、技能 id、是否致死等）已有或按需补齐。

标签字符串在引擎初始化时映射为 **bitfield 位索引**（供 §2.3 proc mask 复用）。

#### 2.1.4 跨 actor 数据：快照随事件

撤回 `Member.runPipeline` 的 `peerStats` 参数设计。所有跨成员数据通过**消息/事件 payload 打包传递**：

- 伤害公式里 `self.xxx` 由施法者侧打包成 `casterSnapshot` 随 `DamageDispatchPayload` 发送（已实现，`CommonActions.ts:106`）。
- 不存在同步的跨 actor 属性读。
- MemberManager 可提供聚合查询（活着的队友数等），但也是推送/广播不是拉取。

#### 2.1.5 跨技能读取靠属性，不靠跨 actor

弧光剑舞读灵光层数、爆能读咏咒层数等**都是同一 actor 内部**的跨技能读，走 §2.1.1 属性槽方案即可，与 actor 隔离无冲突。

### 2.2 计算层

#### 2.2.1 Pipeline + Overlay 承担绝大多数 hook

成员初始化时，passive / 托环把**各自的 overlay 预插入对应管线**。之后战斗期间不需要调度；只要 payload 流经管线，overlay 本身就是"如果 XX 则 YY"的条件指令（`select / and / or / not / >= ...` 已在 `Pipeline/instruction.ts`）。

受击/伤害侧需要落地的核心管线（对应 `玩家受击流程.txt`）：

- `hitResolve`：无敌 → 闪躲 → 暴击 → 回避 → 伤害 → 格挡 → 格挡后伤害
- `applyDamage`：异常抵抗 / 异常施加判定 / 扣 HP

典型 passive 的管线落点：

| 效果 | 落点 | 指令示意 |
|---|---|---|
| 殿后 | `hitResolve` 减伤段末尾 | `if direction=='back' then damage *= (1-tLv%)` |
| 红/蓝区护盾 | `hitResolve` 减伤段 | `if warningZone=='red' then damage *= (1-tLv%)` |
| 稳如泰山 | `hitResolve` 减伤段 | `if status='停止' and moveSpeed=0 then damage *= (1-tLv*3%)` |
| 浴血奋战 后半 | `hitResolve` 伤害段 | 与出血状态联动 |
| 紧急维修 | `hitResolve` 中 | `if statusTags.has('降防') then 概率 removeStatus('降防')` |
| 弧光剑舞·扣MP | `hitResolve` 减伤段 | 消耗 MP 抵伤害；不足时 `removeStatus('弧光剑舞')` |
| 弧光剑舞·减伤 | `hitResolve` 减伤段 | 单独一条 overlay |
| 领教领教 | `hitResolve` 末尾 | `damage = clamp(damage, 0, targetHp*1%)` |
| 锤击·必暴击 | `hitResolve` 暴击判定段 | `if damageTags.has('控制强化') and targetStatusTags.has('控制类异常') then crit=true` |
| 最后的抵抗 | `applyDamage` 前 | `insertBefore(applyDamage, select(...))`：若队伍最后且 `hp-damage ≤ 0` 则 `damage = hp.current-1` |

（燃烧的斗志、猛毒恢复、魔力失火、HP 紧急回复等改判到编排层，见 §2.3.3 / §2.3.4。）

#### 2.2.2 emit 指令：管线里的事件派发点

为 Pipeline 加一条 `emit` 算子，让 overlay 可以在管线特定阶段插入事件派发。例如"暴击判定段后 emit `crit_received`"。

这是计算层对编排层的唯一"主动通知"通路——事件目录由编排层管理（`EventCatalog`），但派发点可以通过 overlay 增量挂载到任意管线阶段。

### 2.3 编排层

#### 2.3.1 FSM / BT 分工保留

- **FSM**（XState）：状态机，唯一的 `runtime` 字段写入方。
- **BT**（mistreevous）：`activeEffectEntry` 单活动技能 + `parallelEntries` 并行 buff；所有持久化数据落 StatContainer 属性槽，BT 自身不持有需要 checkpoint 的状态。

#### 2.3.2 订阅子系统：混合模型

订阅是编排层的内部通信机制，**三种形式并存**，按语义选用而非叠加：

```
语义："XXX 时 YYY"
├─ YYY 需要修改当前正在结算的 payload 值？
│    └─ 是 → Pipeline overlay（计算层，必须在结算链上）
├─ 否，是对 self 属性 / 状态做一次性修改？
│    ├─ 触发条件是 "某属性跨阈值" → 属性变更委托（watcher）
│    └─ 触发条件是 "某事件发生" → Proc mask 事件总线
└─ YYY 是周期性的 → buff BT 循环节点
```

#### 2.3.3 属性变更委托（借 Unreal GAS `OnGameplayAttributeValueChange`）

StatContainer 支持 `watchThreshold(path, threshold, handler)`。属性写入时比对新旧值，**只有真正跨越注册阈值时才唤醒 handler**，其余写入 O(1) 比对后 no-op。成本与注册阈值数成正比，与 passive 总数无关。

数据层提供纯被动的 `onChange(path, cb)` 机制，**注册表在编排侧**，保持"数据写 → 编排读"的单向耦合。

适用：HP / MP 阈值类一次性触发。
- HP 紧急回复：`watchThreshold('hp.current', maxHP*25%, ...)`
- 灵光剑舞终止条件：由 buff BT 自行订阅（`hp.max*5%`）
- Mp 紧急回复：挂技能释放检查点或 watcher（待定）

#### 2.3.4 Proc mask 事件总线（借 MMORPG aura/proc 系统）

每个事件携带一个 bitfield mask 标识类别；订阅者注册时声明感兴趣的 mask。派发时先做 `event.mask & aura.mask`，位与非零才进入 predicate 评估。

- bitfield 直接复用 §2.1.3 的 `damageTags` 位映射。
- 状态进出事件是 proc mask 的子集（`PROC_STATUS_ENTER | PROC_STATUS_EXIT`）。
- 订阅表为每 actor 持有 `(mask, predicate, handler)` 三元组列表，进 checkpoint。

适用：离散事件驱动的 passive。
- 状态进出：减轻追击 a、神经控制、钉鞋、浴血奋战前半、巨人烈破凝气
- 伤害类别（改 MP / 改 status）：燃烧的斗志、猛毒恢复、魔力失火
- 仇恨变化：起跑冲刺、恐慌、目标申告（待进一步讨论）
- 队伍成员事件：命运共同体、救世主、转让、下班通报（待进一步讨论）
- 技能生命周期：爆能咏咒、结界联动、魔法炮充能、曬太陽（待进一步讨论）

#### 2.3.5 EventCatalog：扁平注册表

与 PipelineCatalog、AttributeSchema 结构对称，引擎初始化时一次性冻结：

```
EventCatalog[eventName] = {
  mask: <bit index>,
  payloadSchema: <zod schema>,
  description: string,
}
```

**不需要 overlay 式层叠扩展**。事件的扩展发生在订阅侧（新增 subscriber），不在事件定义侧；派发点的扩展则由 §2.2.2 的 `emit` 指令在计算层 overlay 中完成。

#### 2.3.6 三种形式下的 hook 分类重判

| 效果 | 原方案 | 最终落点 | 理由 |
|---|---|---|---|
| HP 紧急回复 | overlay | **属性 watcher**（§2.3.3） | HP 跨 25% 一次性触发，watcher 只在真正跨线时唤醒 |
| 燃烧的斗志 | overlay | overlay 或 **proc mask**（§2.3.4） | 改 MP 不改 damage；前期 overlay 够用，后期切 proc mask |
| 猛毒恢复 | overlay | 同上 | 同理 |
| 魔力失火 | overlay | 同上 | 同理 |
| 减轻追击 a | overlay | proc mask（状态进入） | 典型离散事件 |
| 神经控制 | overlay | proc mask（状态进入） | 同上 |
| 殿后 / 红蓝区 / 领教领教 / 最后的抵抗 / 稳如泰山 / 锤击 / 浴血奋战后半 / 弧光剑舞 / 紧急维修 | overlay | overlay（保持） | 都要修改当前 damage |

## 2.99 一次伤害的端到端数据流

下面这张路径图把数据、计算、编排、订阅、渲染 / UI 五个关注点串起来；所有 hook 最终都是挂到其中某一个阶段。新人阅读代码时按这张图依次跳到对应模块即可拼出全貌。

```
施法者 FSM
  │
  │  BT 动作 rangeAttack → 构造 DamageAreaRequest
  │  (casterSnapshot = self.* 快照；damageTags / warningZone 由技能声明填入)
  ▼
DamageAreaSystem (World/Area/)                        [引擎级]
  │
  │  tick 时做范围检测；对每个命中目标：
  │  - computeDirection 把几何位置映射为 "back/front/left/right"
  │  - 构造 DamageDispatchPayload（含 damageTags / warningZone / direction / isFatal=false / …）
  │  - actor.send({ type: "受到攻击", data: { damageRequest } })
  ▼
受击者 FSM "受到攻击" 处理 (Member/types/<Player|Mob>/StateMachine)
  │
  │  action "记录伤害请求" → context.hitSession = createHitSession(damageRequest)
  │  action "发送命中判定事件给自己" → actor.send("进行命中判定")
  ▼
"进行命中判定" 状态 — action "命中计算管线"                [编排层调用计算层]
  │
  │  DamageResolution.resolveHitCheck(member, session)
  │    ├─ runPipeline("hitCheck", { isMagical, casterHit, skillMpCost, damageTags })
  │    │    └─ 管线输出 hitRate (0-100)   [计算层; overlay 挂这里改命中率]
  │    └─ FSM 侧做 Math.random 投掷 → session.hit (true/false)
  │
  │  action "根据命中结果进行下一步" → actor.send("进行控制判定")
  ▼
"进行控制判定" 状态                                        [占位；异常施加留给 statusResist]
  │  action "发送伤害计算事件给自己" → actor.send("进行伤害计算")
  ▼
"进行伤害计算" 状态 — action "伤害计算管线"
  │
  │  DamageResolution.resolveDamageAndApply(member, session)
  │    ├─ 未命中 → 上报 0 伤害的 hit domain event 后返回
  │    ├─ expressionEvaluator 求 baseDamage (自动合并 casterSnapshot + self)
  │    ├─ runPipeline("damageCalc", { baseDamage, isBack, isFront, isRedZone, … })
  │    │    └─ 输出 finalDamage / isFatal / crit         [overlay 密集挂点：
  │    │                                                   殿后 / 红蓝区 / 领教领教 / 稳如泰山 / 浴血奋战后半 …]
  │    ├─ runPipeline("applyDamage", { finalDamage, mpCost, damageTags })
  │    │    └─ 输出 hpAfter / mpAfter / died            [最后的抵抗 overlay 挂这里拦截]
  │    ├─ StatContainer.addModifier('hp.current', DYNAMIC_FIXED, hpDelta, …)  [数据层写入]
  │    └─ member.notifyDomainEvent({ type:"hit", damage, hp })
  │
  │  action "发送属性修改事件给自己" → actor.send({ type:"修改属性", data:{ attr, value:hitSession.hpAfter } })
  ▼
"修改属性" 处理 — 触发 "发出属性变化域事件"
  │
  │  member.notifyDomainEvent({ type:"state_changed", hp, mp, position })
  │  若 hpAfter <= 0 且生前 hp > 0 → 额外 notifyDomainEvent({ type:"death" })
  ▼
DomainEventBus (DomainEvents/)                         [引擎级]
  │
  │  flush 本帧缓存 → 投影给订阅者
  ▼
ControllerEventProjector
  │
  │  按 binding 把事件派发到具体控制器 → 主线程
  ▼
UI / Renderer / 观察者

# 副轴 1: StatContainer 写入 hp.current → onChange 通知
#         ├─ AttributeWatcherRegistry 检测阈值穿越（HP 紧急回复在这里触发）
#         └─ watcher handler → addModifier / emit 自定义事件
#
# 副轴 2: StatusInstanceStore apply / removeByType 时
#         └─ 路由到 member.procBus → emit "status.entered" / "status.exited"
#             └─ 订阅者 (registlet / buff / skill 的 handler) 被唤醒
#
# 副轴 3: damageCalc / applyDamage 管线里 `emit` 算子
#         └─ env.emit → services.pipelineEventSink → member.procBus.emit
```

**阅读索引**：
- 组装阶段：`DamageAreaSystem.tick` / `CommonActions.rangeAttack`
- 派发阶段：`DamageAreaSystem.ts` 末尾的 `target.actor.send`
- FSM 入口：`PlayerStateMachine.ts` 的 `受到攻击` / `进行命中判定` / `进行伤害计算` handler
- 核心编排：`World/Member/DamageResolution.ts` — resolveHitCheck / resolveDamageAndApply
- 管线骨架：`Pipeline/builtInBinaryOpPipelines.ts`（hitCheck / damageCalc / applyDamage）
- Overlay 挂载：`Registlets/RegistletLoader.ts` + `Registlets/BuiltInRegistlets.ts`
- 订阅路由：`Member/runtime/ProcBus/` + `Event/EventCatalog` + `Event/BuiltInEvents`
- 阈值观察：`Member/runtime/AttributeWatcher/` + `StatContainer.onChange`

**当前骨架的局限**（需要将来补）：
- Mob 侧还保留旧的 inline action；暂未接 DamageResolution 抽出来的 resolveX 函数
- 随机投掷用 `Math.random`，还没接 seeded PRNG，不支持确定性回放
- "最后的抵抗"的队伍判定、延时死亡事件未实现
- applyDamage 的 addModifier 每次命中生成一条 sourceId 唯一的 fixed modifier，长时间运行会累积；需要聚合机制

## 3. 代表效果的完整分解

**爆能**（咏唱 8s，每施放魔法攻击累加咏咒层数降低咏唱）：

1. 安装时 → 数据层声明 `skill.爆能.咏咒层数` 属性槽
2. 安装时 → 编排层订阅 proc mask "技能施放完成 / 魔法攻击类"，handler 对槽 +1
3. 运行时 → 计算层向"咏唱时间"管线插 overlay：`castTime -= 1 * stacks`
4. 运行时 → 施放 BT 的最后动作把槽清零

**HP 紧急回复**：

1. 安装时 → 声明 `passive.hpEm.lastTriggeredFrame` 槽
2. 安装时 → 注册属性 watcher：HP 跨 `maxHP*25%` 向下
3. handler：判断冷却 → 修改 HP → 更新时间戳
4. hitResolve 管线不挂任何 overlay

**最后的抵抗**：

1. 安装时 → 向 `applyDamage` 前插条件 overlay：`select(isLastInTeam and hp-damage≤0, damage = hp.current-1, damage)`
2. overlay 命中分支里 `emit` 一个 `last_resistance_triggered` 事件（§2.2.2）
3. 事件 handler 向 EventQueue 塞 5+tLv 秒后的延时死亡事件

**弧光剑舞**（拆成两条 overlay）：

- 受击时扣 MP 抵伤害；MP 不足时 `removeStatus('弧光剑舞')` —— 挂 `hitResolve`。
- 受击减伤加成 —— 挂 `hitResolve` 减伤段，单独 overlay。
- 状态终止条件（HP<5%）—— 位于自身 buff BT 内的循环节点判定。

## 4. 落地路线图

### 阶段 1 — 数据层前置

1. `DamageDispatchPayload` 扩展 `damageTags / warningZone / direction / 致死标记` 等字段。
2. StatContainer 属性槽命名前缀约定 + 技能/托环安装时的声明接口。
3. 初始化期把标签字符串集合映射为 bitfield 位索引（供 §2.3.4 proc mask 复用）。

### 阶段 2 — 计算层落地

4. 实现 `hitResolve` / `applyDamage` 管线，并把 `DamageAreaSystem` 派发的 "受到攻击" FSM 事件接到这段管线上。
5. Pipeline 加 `emit` 算子。
6. 清理：移除 `Member.runPipeline` 的 `peerStats` 参数。

### 阶段 3 — 编排层订阅机制

7. **属性变更委托**：StatContainer 暴露 `onChange` 纯机制；编排层维护阈值注册表，阈值列表进 checkpoint。
8. **Proc mask 事件总线**：定义 `EventCatalog`；优先实现状态进出事件源（来自 StatusInstanceStore apply / removeByType），BT 提供叶子节点声明式订阅。
9. 按需扩展事件源到伤害类别（借已有 `damageTags`）、仇恨变化、队伍成员事件、技能生命周期。

### 阶段 4 — passive / 托环 试点

10. 选代表性 hook 跑通全链路：
    - Pipeline overlay 类：领教领教、最后的抵抗、殿后
    - 属性 watcher 类：HP 紧急回复
    - Proc mask 订阅类：减轻追击、神经控制

### 阶段 5 — 编排层补缺

11. 输入意图通道（`ControllerEndpoint → runtime.inputIntent`），为一阵风 / 月神灾厄 / 殿后 等铺路。
12. `BuffAreaSystem` 补全，接空间查询 + 周期 tick，实现怕寂寞这类空间 buff。

### 阶段 6 — 扩展（低优先）

13. 条件 Modifier：战斗期间武器不变，短期不急；后续若出现装备/形态切换需求，优先走"管线 overlay 内 select"路线。

## 5. 未决项

- 订阅事件源扩展的取舍：仇恨变化 / 队伍事件 / 技能生命周期三类的具体事件粒度。
- 属性槽的命名前缀格式。
- Proc mask bitfield 的类别划分与位宽预算。
- 输入意图通道的具体协议（按键流 vs 意图聚合）。
- Mp 紧急回复的触发点：技能释放检查点 vs 属性 watcher。
- passive 总量膨胀到什么阈值时，把"改 MP / 改 status"类 hook（燃烧的斗志等）从 overlay 切到 proc mask。
