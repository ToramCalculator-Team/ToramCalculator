# 世界介质模型现状分析（临时）

日期：2026-06-02

用途：保留本轮“空间作为介质、Actor 作为状态终点”的现状分析。本文是临时草稿，后续采纳需要新增 ADR。

## 结论（最终模型，已收敛）

介质（空间层）是一个**无属性状态的关系整合服务**，与 actor 并存。它在“成员全部 settle 之后”的相位，通过 actor 实现的**可观测读接口**现场读取并整合关系（距离、方向、范围目标、碰撞），**不缓存、不持有 actor 属性**。这取代了早期“介质持有派生影子（每 tick 拷贝）”的设想——本引擎单线程、同进程、定步长、可回放，没有跨线程/跨网络边界，拷贝没有买家；on-demand 现场查询既更省又更正确（追踪弹要读目标当前位置而非滞后影子）。

跨 actor 数据只走两条既有通道，介质都不参与：
- **某次命中的攻方战斗值** → 施放瞬间快照进 payload（`casterSnapshot`，时间锁定）。
- **持续外部增益（光环 / 地形）** → 推 modifier 进目标 StatContainer。

因此“空间层穿透读取真实 Member”**不是偏差，而是正确设计的雏形**（介质本就该查询时整合而非自存）。真正要做的是把它从“读具体 `Member` 类”收敛到“读一个统一的 `WorldObservable` 通信契约”。

`World` 保持**确定性相位调度器**，不 actor 化、不用 `invoke` 托管成员。相位顺序（member 带 → settle → projectile 带 → query）就是确定性来源，由实体的 `tickPriority` 表达。

实体统一落在**最小 `WorldEntity` 契约（仅“与介质双向通信”）**，能力靠**组合**而非 FSM 继承：`Damageable` 仅战斗单位、`Velocity/Collider` 仅投射物。Member **实现**该契约但保留各自的富 FSM；投射物/区域是 `WorldEntitySystem` 步进的轻数据。

仍待落地的实现差距：统一可观测读接口（含权威 `alive`）、投射物实体化（碰撞相交取代 `startTimeMs` 延迟）、伤害公式 `self` 的脱手快照语义。

## 目标模型

Actor 负责：

- 发出意图：使用技能、移动、选择目标、取消、复活。
- 持有私有状态：StatContainer、HP/MP、Status、Buff、技能上下文、状态机。
- 决定最终写入：受击 Actor 接收世界派发的 impact payload 后，执行命中、减伤、HP/MP 写回、死亡转换。
- 发布可观测事实：位置、阵营、是否存活、是否可被选中、公开状态标签。

世界/空间负责：

- 在 settle 相位通过统一的 `WorldObservable` 接口**现场读取**成员事实，而非持有/缓存它们，也非返回真实 Member 具体类。
- 维护空间实体：瞬时命中、持续区域、线性弹道、追踪弹道、陷阱、光环、地面效果、吸引区域（投射物/区域是 `WorldEntitySystem` 步进的轻数据）。
- 计算关系：距离、方向、范围目标、遮挡、碰撞。
- 派发影响：空间实体命中后，向目标 Actor 投递不可变 impact payload。
- 持有**自己的**状态：将来的环境态（光照/地形/天气）、可选的空间加速结构。不持有 actor 属性、不广播、不做 AOI 订阅。

技能释放的目标流程：

1. 施法者 Actor 基于可观测属性选择目标或落点。
2. 施法者扣除消耗并提交 `WorldImpactRequest` 或 `WorldEntityCreateRequest`。
3. 世界实体在 tick 中推进，读取空间中的可观测属性并计算命中。
4. 世界向目标 Actor 派发 `ReceiveImpact`。
5. 目标 Actor 结算并发布 `damage.received`、`death`、`state_changed` 等结果。

## 当前代码事实

### World

- `World.tick` 先 tick 全部 member，再 tick `AreaManager`。
- 没有“成员发布可观测属性 -> 空间层更新可观测属性 -> 空间实体查询可观测属性”的阶段。
- checkpoint 保存 members 与 `damageAreaSystem`，空间可观测属性当前没有持久化实体。

### SpaceManager

- `queryCircle` 调用 `memberManager.getAllMembers()`。
- 查询结果类型是 `AnyMemberEntry[]`，调用者拿到真实 Member。
- `areas` 固定为空。
- 没有 alive、targetable、collision radius、facing、obstruction、AOI。

### DamageAreaSystem

- 已有 `DamageAreaInstance`，包含 shape、trajectory、lifetime、hitInterval、damageCount。
- `Enemy` / `Range` 通过 `SpaceManager.queryCircle` 找候选目标。
- `Single` / `None` 直接 `memberManager.getMember(targetId)`，绕过空间查询。
- 敌我过滤由 `DamageAreaSystem` 执行，依据 `campId`。
- 命中后计算 `distance`、`direction`、`targetCount`，再执行 `target.actor.send({ type: "受到攻击" })`。
- `deriveShapeAndTrajectory` 覆盖 `Single`、`None`、`Enemy`、`Range`、`MoveAttack`。
- 枚举已包含 `Line`、`Ground`、`Bullet`、`Meteor`、`Explosion`、`Attraction`，实现还没有映射这些空间语义。
- `moveAttack` action 当前只记录日志，没有构造并提交 `DamageAreaRequest`。

### DamageAreaRequest / DamageDispatchPayload

- 施法者构造请求时捕获 `casterSnapshot`。
- 派发 payload 携带 `damageFormula`、`casterSnapshot`、`skillLv`、`damageTags`、`warningZone`、`damageCount`。
- 派发时追加 `distance`、`targetCount`、`direction`。
- `isFatal` 派发时固定为 false，最终致死由受击侧 `applyDamage` 得出。

### DamageResolution

- 受击侧执行 `hitCheck`、`damageCalc`、`applyDamage`。
- `hitCheck` 使用 `casterSnapshot.hit` 和 `casterSnapshot["skill.mpCost"]`。
- `damageFormula` 求值调用 `ExpressionEvaluator`，传入 `casterId: req.sourceId`、`targetId: id`、`casterSnapshot`。
- **关键因果**：evaluator 拿到 `casterId` 后用 `getMemberById(casterId)` 取**实时施法者 Member** 作为 `self`，并不消费传入的 `casterSnapshot`。于是延迟/弹道命中时 `self.xxx` 读到的是施法者当下值，与“脱手锁定”语义冲突（偏差#3 的实锤）。
- 结算后通过 `notifyDomainEvent` 发 UI/控制器用的 `hit` event。
- 内置 `damage.received` 事件存在，但当前伤害流程没有 emit 到成员内 `ProcBus`。

### ExpressionEvaluator

- 通过 `getMemberById` 同步读取真实 `self` 和 `target`。
- 为 `self` / `target` 包一层 `Object.create(member)`，再注入 `hasBuff`。
- `target.hasBuff` 直接读取目标 `btManager`。
- `JSProcessor` 会把 `self.xxx` / `target.xxx` 改写成 `*.statContainer.getValue("xxx")`。
- 这条路径绕过了 `Member.runPipeline` 的跨 Actor 读取限制。

### Member / FSM

- `Member.runPipeline` 已经拒绝跨 Actor 属性读取，要求跨成员数据随事件 payload 传入。
- `MobStateMachine` 有完整受击流程：`受到攻击` → `记录伤害请求`(createHitSession) → `进行命中判定`(resolveHitCheck) → `resolveDamageAndApply`，含命中、控制、伤害、属性修改、死亡判断。
- `PlayerStateMachine` 经核对**不含** `受到攻击` / `HitSession` 任何处理入口——Player 当前无受击流程（确证，非未搜到）。
- 存活状态主要由 `hp.current > 0` 与 FSM 状态判断，没有统一权威 `alive` 字段。

### 文档与 ADR

- `WorldAreaSystem.md` 写明 `SpaceManager` 只做纯空间查询/索引，不承载业务规则。
- `WorldAreaSystem.md` 是历史叙述文档，后续设计应写 ADR。
- ADR 0005 选择“命中后效果通过攻击 Payload 传递”，并记录了目标侧结算回调施法者会模糊职责边界。
- 若采纳世界介质模型，on-hit / on-kill 的回流路径需要重新评估。

## 偏差清单

### 1. 空间查询读的是具体 Member 类，而非统一可观测契约（非“穿透读取”问题）

更正早期判断：“空间层穿透读取真实成员”本身**不是偏差**——介质就该在 settle 相位现场整合关系，而非自存影子。真正的偏差是 `queryCircle` 返回 `AnyMemberEntry`（具体富类），使调用方耦合到 Member 内部、也无法让投射物/墙体等非 Member 实体进入同一查询。应收敛到统一的 `WorldObservable` 只读接口（人人实现），介质只认接口不认具体类。

### 2. 世界实体抽象不足

`DamageAreaSystem` 只能表达圆形区域和简单线性轨迹。追踪弹道、子弹路径、地面阻挡、爆炸预兆、吸引区域需要统一的世界实体生命周期和碰撞模型。

### 3. 表达式求值器绕开 Actor 隔离，破坏脱手锁定

伤害公式执行期，evaluator 经 `getMemberById(casterId)` 同步读取**实时施法者** Member 作为 `self`（见“当前代码事实 / DamageResolution”的关键因果）。延迟命中或弹道命中时，`self.xxx` 读到的是施法者当下值，而非 `casterSnapshot` 锁定的施放瞬间值。修复方向：受击求值时 `self` 走 `casterSnapshot` facade，禁止 `getMemberById(caster)`。

### 4. 目标选择归属不清

`MemberManager.resolveTargetId` 按注册顺序选择第一个敌方成员。距离、可见性、存活、targetable、威胁关系应来自世界可观测属性查询。

### 5. 死亡与受击没有回流到空间可观测属性

目标 Actor 可以写出 `hp.current = 0` 并进入死亡状态，但空间层不会得到统一的 `alive=false` 可观测属性更新。

### 6. 受击能力不统一

Mob 有完整受击流程，Player 经核对无受击入口。世界派发 impact 需要统一的 `Damageable` 能力契约（仅战斗单位实现；投射物/区域不实现）。

## 根因判断

`SpaceManager` 的当前设计目标是几何查询壳，尚未承担可观测属性读面职责。

`DamageAreaSystem` 同时承担实体推进、阵营过滤、命中节流、动态变量计算、Actor 派发，缺少 `WorldEntity`、`SpatialQuery`、`ImpactDispatch` 三层边界。

`ExpressionEvaluator` 以“表达式可直接拿 self/target”为目标，缺少不同场景的求值 facade：施法者快照、目标当前自身、公开可观测属性。

`MemberManager` 同时承担成员注册、目标解析、真实对象读取，使上层容易绕过空间层。

## 建议迭代顺序

### 阶段 0：先写 ADR 草案

建议新增 ADR：`world-observable-attributes-as-spatial-medium`。

需要决策：

- `SpaceManager` 是否升级为世界可观测属性表与空间索引。
- 可观测属性最小字段：`id`、`type`、`campId`、`teamId`、`position`、`facing`、`collisionRadius`、`alive`、`targetable`、`statusTags`。
- 瞬时 impact 与跨帧 projectile/area 是否共用统一世界实体入口。
- 受击结果如何回流到世界可观测属性与施法者侧 on-hit 逻辑。

### 阶段 1：建立成员可观测属性

建议类型：

```ts
interface MemberObservableAttributes {
	id: string;
	type: MemberType;
	campId: string;
	teamId: string;
	position: Vec3;
	facing?: Vec3;
	collisionRadius: number;
	alive: boolean;
	targetable: boolean;
	statusTags: readonly string[];
}
```

建议 tick 顺序：

1. tick members。
2. 同步或发布成员可观测属性。
3. tick world entities / area systems。
4. 派发 impact。

### 阶段 2：让 DamageAreaSystem 消费可观测属性

改动方向：

- `SpaceManager.queryCircle` 返回成员可观测属性列表。
- 敌我、alive、targetable 过滤基于可观测属性。
- 距离、方向、targetCount 基于可观测属性计算。
- 最终派发通过 `MemberManager.sendTo(targetId, event)` 触达 Actor。
- `DamageDispatchPayload` 可携带命中时的 `targetPosition`，便于回放和调试。

### 阶段 3：修复伤害公式快照

当前注释承诺：施法者属性在生成伤害区域时快照，目标属性在受击侧实时读取。

建议执行契约：

- `damageFormula` 中的 `self.xxx` 读取 `casterSnapshot`。
- `damageFormula` 中的 `target.xxx` 读取受击 Actor 当前 StatContainer。
- 受击求值时构造 `self` 快照 facade，提供 `statContainer.getValue/getBaseValue`。
- 伤害结算期禁止通过 `getMemberById` 读取施法者真实 Member。

### 阶段 4：抽象世界实体

最小实体集合：

- `InstantImpact`：立刻查询并派发。
- `StaticArea`：固定中心与半径，支持持续/分段命中。
- `LinearProjectile`：沿方向推进，支持路径命中。
- `HomingProjectile`：每 tick 读取目标可观测属性，更新运动方向，支持目标失效。

`DamageAreaSystem` 可以先迁移为这些实体的适配层，再逐步拆出通用 `WorldEntitySystem`。

### 阶段 5：事件回流

需要补齐：

- 受击结算后 emit `damage.received` 到成员内 `ProcBus`。
- HP 到 0 后发布 `death` domain event，并更新世界可观测属性 `alive=false`。
- on-hit / on-crit / on-kill 效果通过事件路由回施法者或订阅者。

### 阶段 6：统一 Combatant 受击契约

Player 和 Mob 应共享：

- 相同的受击事件入口。
- 相同的 `HitSession` 数据结构。
- 相同的 `DamageResolution` 调用方式。
- 各自状态机只保留行动状态差异。

## 伤害计算分段判断

> 注：本节早期把“可观测 / 内部”当成 StatContainer 上的**属性二分**来写，已与最终模型冲突，下面重述。
> 关键澄清：`self.*`（“自身属性”引用语义）与“可观测性”（介质/他人能否感知）是**两条独立的轴**，不要混。可观测面是一个**对外读接口**，不是给战斗数值打的标签；StatContainer **不分区**。

结论：两段式计算（空间算关系量 / 目标算减免与扣血）已忠实于“谁有权改状态谁做最后计算”，**不重做**。要做的只是把边界**显式化**：

1. **关系量（空间注入 vars）**：distance、direction、targetCount、碰撞、路径遮挡——介质在 settle 相位现场算，零持有。
2. **私有结算量（目标 pipeline）**：def/avoid/resist、护盾、无敌、死亡保护、HP/MP 写回——目标 actor 的 StatContainer/pipeline 算。

“可观测”不是属性分类，而是按**来源**分两类事实（见“可观测属性的权威设计”节）：内在投影类（position/alive/camp/facing/radius/公开 tags，actor 是唯一持有者）与关系派生类（距离/遮挡/视线/AOI 成员，介质现场整合、actor 连声明都没有）。战斗有效值**两类都不是**，它是纯内部属性 → 介质永不提供 `getEffectiveDefense`。

推荐伤害流水线：

1. 施法者 Actor 在释放时生成“施法者可观测快照”，用于固定攻击方当时的可观测战斗量。
2. 世界实体命中时读取可观测属性，计算距离、方向、目标集合、碰撞、路径阻挡，并生成“伤害事件包”。
3. 伤害事件包只表达影响来源和空间关系：sourceId、targetId、areaId/entityId、damageFormula、distance、direction、targetCount、tags、施法者可观测快照。
4. 目标 Actor 接收伤害事件包，读取自身当前内部属性，执行命中、减伤、护盾、无敌、死亡保护、HP/MP 写回。
5. 目标 Actor 发布 `damage.received` / `death`，世界据此更新可观测属性。

空间层可以计算的内容：

- 距离变量。
- 方向与背击关系。
- 弹道命中、路径遮挡、碰撞目标。
- 命中目标数与范围密度。
- 施法者可观测快照的转发。

目标 Actor 应保留的内容：

- HP/MP 的最终写回。
- 无敌、护盾、伤害吸收、死亡保护。
- 依赖内部历史的效果，例如“过去 N 秒内条件”“本地 proc 冷却”“当前状态机阶段”。
- 会触发状态机转换的结果。

对现有代码的含义：

- `DamageAreaSystem` 已经承担了距离、方向、targetCount，这属于第一段空间计算。
- `buildDamageRequest` 已经尝试生成 `casterSnapshot`，但 `damageFormula` 的 `self` 执行语义需要修正。
- `DamageResolution` 当前承担命中、伤害、写回，后续可以接收更明确的伤害事件包。
- 防御力、回避、抗性默认留给受击 Actor 的 StatContainer / pipeline 计算。

建议 ADR 明确一个边界：空间层输出伤害事件包和空间关系变量；目标 Actor 拥有战斗计算与最终结算权。

## 可观测属性的权威设计（修正）

结论：当前引擎应采用薄读模型。Actor 权威维护自身状态和已发布事实；世界级服务缓存这些事实、计算空间关系、持有环境状态。战斗有效值留在 Actor 的 StatContainer / pipeline / modifier 链路内。

“可观测”需要拆成两种情况：

1. 已发布事实：position、alive、campId、facing、collisionRadius、targetable、粗粒度仇恨指针。Actor 是事实源，世界只做缓存、中继和空间索引。
2. 环境调制现象：颜色、可见度、环境影响后的表现。世界可以持有环境状态和空间关系，但当前战斗有效值不集中交给世界计算。

Actor 应维护并发布：

- 内部属性。
- 已发布事实，例如位置、朝向、阵营、存活、可被选中、公开状态标签。
- 战斗派生值的最终计算权，例如有效防御、有效回避、最终伤害、HP/MP 写回。

世界级服务应维护：

- 已发布事实的只读缓存。
- 空间关系数学，例如距离、方向、碰撞、视线、AOI、目标集合。
- 将来可能存在的环境状态，例如光照、地形、天气、烟雾。
- 对外观察接口，例如目标查询、可见性查询、空间命中查询。

例子：

- 衣服颜色这种表现层现象可以由材质和光照共同决定；这类需求不应推导出世界负责战斗有效值。
- 地形或光环影响防御时，环境系统应通过 Area / BuffArea 向 Actor 的 StatContainer 推 modifier，Actor 的 StatContainer 产出有效防御。
- HP 当前值由 Actor 维护；`alive`、`targetable` 由 Actor 发布，世界缓存并用于目标查询。
- 当前引擎里 position 可作为 Actor 发布事实；如果未来引入物理碰撞权威，再单独讨论 position 是否迁移给世界。

因此，世界级服务不提供 `getEffectiveDefense` 这类战斗有效值接口。环境依赖通过“Area / BuffArea -> modifier -> StatContainer”进入 Actor，保持战斗计算权威在 Actor。

需要商量的设计点：

1. 哪些自身状态需要作为已发布事实进入世界缓存。
2. 已发布事实由事件驱动更新，还是每 tick 同步。
3. `position` 在当前阶段保留 Actor 发布事实，还是为未来物理系统预留世界权威。
4. def、avoid、resist 这类战斗值是否需要发布给世界；默认不用于世界级伤害计算。
5. 环境影响统一走 Area / BuffArea / modifier 链路，还是保留少量世界实时查询例外。

## AoI（感兴趣区域）裁决

更正早期“先把 AoI 建模成观察关系”的设想。AoI 的两个用途要分开判：

**性能/网络裁剪用途 → 出局。** AoI 的价值来自“广播/同步成本高”（分布式、跨网络、成百上千实体、只向邻近者推送）。本引擎单线程、同进程、几十成员，且介质已确定**不缓存、不广播、settle 相位 on-demand 查询**——没有“向谁推送”，自然没有“只向 AoI 内推送”的优化对象。`queryCircle` 已是 O(n) 现场扫描，AoI 分桶在当前规模省不下有意义的东西。它真正的继任者是**空间加速结构（四叉树/网格）**，而那是 `queryCircle` 的内部优化、按成员数逼近时再引入，**不是 AoI 语义**。

**游戏语义“感知范围”用途 → 保留，但不做成 AoI 基础设施。** 仇恨范围、技能索敌距离（如光护 8m/24m）、脱离视野丢失仇恨——这类是规则本身。落地形态就是 actor 决策时发起的一次**带半径的 `queryCircle`**（settle 相位、on-demand），即“感知”这个游戏动作复用空间查询，而非一套常驻订阅结构。

由此，介质能力清单收敛为：**on-demand 空间查询（含感知半径）+ WorldEntity 生命周期推进 + 碰撞相交检测 + impact 派发**。不含 AoI 订阅、不含属性缓存、不含广播。

`queryCircle` 仍需的改造（与 AoI 无关，是接口收敛）：返回 `WorldObservable` 只读视图而非具体 Member；支持 camp/alive/targetable 过滤；可选 `sourceId` 用于自我排除。

## WorldEntity 实体模型（投射物实体化）

现状澄清：**“伤害延迟”不是独立字段**。火球飞行目前靠 `lifetime.startTimeMs` 往后偏移来模拟——`tick` 里 `currentTimeMs < startTimeMs` 就 `continue`，效果是“延迟出现的静态圆”，飞行期**没有实体存在于空间**（不可拦截、不可被墙挡、目标移动不修正、渲染拿不到平滑轨迹）。而**速度其实已经是实例属性**：`DamageAreaInstance.trajectory` 已有 `linear` + `speed` + `start` + `dir`，`computeCurrentCenter` 已按 `start + dir·speed·t` 推进。

所以这不是“从零做”，而是三个收敛动作：

1. **正名 + 泛化**：`DamageAreaInstance` 提升为 `WorldEntity`；`shape` 开成判别联合（`circle` / `line段` / 后续 `sector`）；`trajectory` 增 `homing`（每 tick 读目标 `WorldObservable.position` 修正 `dir`）。
2. **碰撞相交取代 startTimeMs 延迟**：`Bullet` 从 t=0 起以 speed 推进，**实体几何与目标几何相交的那一 tick** 才派发 `受到攻击`；飞行期实体真实存在 → 可拦截/可渲染/可追踪。
3. **rangeKind → shape+trajectory 真实映射**：补齐当前被 `deriveShapeAndTrajectory` default 分支压成静态圆的 `Bullet`、`Line`、`Ground`、`GroundFixed`、`Meteor`、`Explosion`、`Attraction`。

`damageCount`/`hitIntervalMs` 的分段节流逻辑（`collectSegmentIndexes`）与实体化正交，原样保留。

最小实体集合：`InstantImpact`（立即查询派发）、`StaticArea`（固定中心+半径，持续/分段）、`LinearProjectile`（沿向推进+路径命中）、`HomingProjectile`（每 tick 读目标可观测位置修正、支持目标失效）。`DamageAreaSystem` 先迁移为这些实体的适配层，再拆出通用 `WorldEntitySystem`。

## World 不 actor 化 / 实体统一模型

**World 保持确定性相位调度器，不用 `invoke` 托管成员。** 理由：World 的核心职责是“相位调度”（member 带 settle → projectile 带 → query），这个**显式顺序就是确定性来源**；XState 的 invoke/spawn 给的是异步监督树，不保证跨 actor 处理顺序，套上来要么丢相位边界（回放不确定）要么纯属多一层队列。且 Member 大量状态在 FSM 之外（StatContainer/ProcBus/BtManager/statusStore），actor 化只会让 checkpoint 多一套“actor 树持久化 + sidecar 持久化”要对齐。

**实体统一靠最小 `WorldEntity` 契约 + 组合，不靠 FSM 继承。** 基类的**唯一**职责是“与介质双向通信”：

```ts
interface WorldEntity {
	readonly id: string;
	observable(): WorldObservable;     // 介质读取面（is-a，非每次产出快照）
	receiveImpact(payload): void;      // 介质投递入口（投射物可空实现）
	step(ctx): void;                   // 每 tick 推进
	readonly tickPriority: number;     // 相位序：member 带 < projectile 带
	readonly alive: boolean;
}
```

- `Damageable`/`StatContainer`/`BT` → 仅 Member，**不进基类**。
- `Velocity`/`Collider` → 仅投射物，**不进基类**。
- 能力不对称（火球不可被伤害、Member 不需运动学）是“组合 over 继承”的决定性信号；单一继承链必然漏污染或塞死重。

**相位由 `tickPriority` 表达**：同池 tick + 稳定排序（同优先级以 id tiebreak、排序不依赖运行时浮点）即可表达“成员先 settle、投射物后读”。统一调度池合法，前提是优先级把世界切成清晰相位带；**不 OK 的是“无序平铺循环”**，而非“同池”。分池（MemberManager / WorldEntitySystem）与同池+优先级两者都合法，列为实现取舍（见待确认）。

`WorldObservable` 是 actor **实现**的只读接口（`position`/`alive`/`campId`/`facing`/`collisionRadius`/公开 `tags`），schema 由介质统一定义、actor 填值；Member 几乎已满足（position getter、tick 即 step、checkpoint 就位），**仅缺一个权威 `alive` getter**。介质读接口、零分配、读当前真值——不返回新对象（否则等于把每 tick 拷贝请回来）。

## 推荐近期切片

第一步：新增 ADR 草案，确认介质 = on-demand 关系整合服务（不缓存/不广播/不 AoI）、`WorldEntity` 最小通信契约、`WorldObservable` 读接口。

第二步：定义 `WorldObservable` 接口并让 Member 实现（补权威 `alive` getter）；`SpaceManager.queryCircle` 改为返回 `WorldObservable` 视图 + camp/alive 过滤，`DamageAreaSystem` 不再直接读具体 Member。

第三步：修复 `damageFormula` 的 `self` 脱手快照语义（受击求值 `self` 走 `casterSnapshot` facade，禁用 `getMemberById(caster)`）。

第四步：把 `DamageAreaInstance` 正名为 `WorldEntity` 并补 `rangeKind → shape/trajectory` 映射；用碰撞相交取代 `startTimeMs` 飞行延迟。

第五步：在可观测读接口稳定后实现 `HomingProjectile`（每 tick 读目标 `observable().position`）。

## 待确认问题

1. 单体技能是否统一走 `InstantImpact`。
2. `WorldObservable` 是否含公开 `statusTags`，以及哪些状态属于公开可观测信息。
3. `alive` 由 Actor 的 HP 写回 / 死亡 FSM 转换驱动的权威 getter，具体以哪个为准。
4. on-hit 效果应直接回施法者 Actor，还是进入世界事件路由（与 ADR 0005 的边界重叠，需一并定）。
5. `Range` 技能中心是施法时锁定落点，还是持续追踪目标位置。
6. def、avoid、resist 等目标防御属性：默认留目标 Actor 自算，确认不进任何对外读模型。
7. **轻实体调度：分池（MemberManager / WorldEntitySystem）还是同池 + `tickPriority`**。两者都满足相位确定性，取舍点在 checkpoint 隔离 vs 调度统一。
8. **`receiveImpact` 是并入 `WorldEntity` 基类，还是单列为 `Damageable` 第二接口**。按“最小=双向通信”可并入（投射物空实现）；按“能力对称”可单列。
9. `position` 现阶段确认为 Actor 发布事实（范式 1）；未来引入物理碰撞权威时再议是否迁移给世界。
