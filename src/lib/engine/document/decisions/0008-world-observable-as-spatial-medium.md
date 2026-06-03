# 0008 - 世界可观测属性作为空间介质

- **状态**: Proposed
- **日期**: 2026-06-02
- **决策层**: 跨层（编排层 / 通信 / 计算层）
- **相关代码**: `src/lib/engine/core/World/observable.ts`、`src/lib/engine/core/World/SpaceManager.ts:49`、`src/lib/engine/core/World/Area/DamageAreaSystem.ts`、`src/lib/engine/core/World/Member/Member.ts`、`src/lib/engine/core/World/Member/runtime/DamageResolution.ts`、`src/lib/engine/core/Expression/ExpressionEvaluator.ts`
- **相关 ADR**: 0005（命中后效果通过攻击 Payload 传递）

## 背景

`World.tick` 先 tick 全部 member，再 tick `AreaManager`。空间层（`SpaceManager`）此前只是几何查询壳：`queryCircle` 调 `memberManager.getAllMembers()`，返回具体富类 `Member`，调用方据此自行做敌我/存活过滤，并直接 `target.actor.send(...)` 派发。

这带来三个互相纠缠的现象：

1. 空间查询返回具体 `Member`，调用方耦合到 Member 内部实现；非 Member 实体（投射物、墙体）无法进入同一查询。
2. `DamageAreaSystem` 同时承担实体推进、阵营过滤、命中节流、动态变量计算、Actor 派发，缺少清晰的「空间实体 / 空间查询 / 影响派发」边界。
3. 火球等飞行攻击靠 `lifetime.startTimeMs` 往后偏移模拟「延迟出现的静态圆」，飞行期没有实体存在于空间——不可拦截、不可被墙挡、目标移动不修正、渲染拿不到平滑轨迹。

同时存在三个语义空洞：受击求值时 `self` 读实时施法者而非施放瞬间快照（脱手锁定语义冲突，已在近期改造中修复）；`resolveTargetId` 按注册顺序选敌而非空间查询；死亡/受击结果没有统一回流为空间可观测事实与施法者侧 on-hit 逻辑。

这些现象的共同根因是：缺少一个**显式的介质模型**来回答「空间层到底持有什么、不持有什么、如何与 actor 通信」。在没有该模型前，每个子系统各自决定如何读 Member、如何派发，约定散落且互相绕过。本 ADR 固化该模型，作为后续 WorldEntity 实体化、事件回流、统一受击契约等迭代的共同前提。

## 候选方案

本 ADR 需要在四个互相关联的子问题上各选一个方向。先列子问题各自的候选，再在「决议」统一收口。

### 子问题一：空间层持有什么

#### A. 介质持有派生影子（每 tick 拷贝）

成员每 tick 把可观测属性拷贝进空间层的影子表，空间实体读影子。

- 优点：读写解耦，跨线程/跨网络时影子是天然的同步边界。
- 缺点：本引擎单线程、同进程、定步长、可回放，没有跨边界，拷贝没有买家；追踪弹要读目标当前位置，滞后影子反而更错；多一套影子表要进 checkpoint 对齐。

#### B. 介质 on-demand 现场查询（不缓存/不广播）

介质在「成员全部 settle 之后」的相位，通过 actor 实现的只读接口现场读取并整合关系，不缓存、不持有 actor 属性。

- 优点：零拷贝、读当前真值、无影子表持久化负担；与单线程定步长模型契合。
- 缺点：每次查询 O(n) 现场扫描，成员数大时需要空间加速结构（四叉树/网格）——但那是 `queryCircle` 内部优化，不改变模型。

### 子问题二：空间查询返回什么

#### A. 返回具体 `Member` 富类（现状）

- 优点：调用方能拿到全部能力，无需定义新接口。
- 缺点：调用方耦合 Member 内部；非 Member 实体无法进入同一查询；介质越界触碰战斗内部。

#### B. 返回统一 `WorldObservable` 只读视图

介质只认 `WorldObservable` 接口（`id`/`type`/`campId`/`teamId`/`position`/`alive`/`collisionRadius` 等），人人实现，介质不认具体类。

- 优点：调用方只依赖投影字段；投射物/墙体等非 Member 实体经同一接口纳入；读面收窄、职责清晰。
- 缺点：需要定义并维护接口；actor 要补齐权威字段（如 `alive` getter）。

### 子问题三：跨 actor 战斗数据怎么流动

#### A. 介质提供 `getEffectiveDefense` 等战斗有效值读接口

- 优点：调用方一站式拿到结算所需的全部值。
- 缺点：把战斗计算权从 actor 抽到介质，违背「谁有权改状态谁做最后计算」；StatContainer/pipeline/modifier 链路被架空。

#### B. 两条既有通道，介质不参与战斗值

攻方战斗值施放瞬间快照进 payload（`casterSnapshot`，时间锁定）；持续外部增益推 modifier 进目标 StatContainer。介质只输出空间关系量（距离/方向/targetCount/碰撞）。

- 优点：战斗计算权留在 actor；脱手锁定语义天然成立；与 ADR 0005「命中后效果通过攻击 Payload 传递」一致。
- 缺点：施法者侧需在施放瞬间构造快照；公式 `self` 求值要按锁定/实时分流（已落地 `lockCasterAttributes`）。

### 子问题四：World 是否 actor 化

#### A. World 用 XState invoke/spawn 托管成员

- 优点：统一进 actor 监督树，概念整齐。
- 缺点：invoke/spawn 是异步监督，不保证跨 actor 处理顺序，回放不确定；Member 大量状态在 FSM 之外（StatContainer/ProcBus/BtManager），actor 化要多对齐一套持久化。

#### B. World 保持确定性相位调度器

相位顺序（member 带 → settle → projectile 带 → query）就是确定性来源，由实体 `tickPriority` 表达；实体统一落在最小 `WorldEntity` 契约（仅「与介质双向通信」），能力靠组合而非 FSM 继承。

- 优点：显式相位顺序保证回放确定性；能力不对称（火球不可被伤害、Member 不需运动学）用组合表达，不污染基类。
- 缺点：相位调度需要手写稳定排序；`WorldEntity` 契约与各 actor 富 FSM 是两套结构，需约定边界。

## 决议

四个子问题分别选 **B**：介质 = on-demand 关系整合服务，查询返回 `WorldObservable`，战斗值走 payload 快照 + modifier 两通道，World 保持确定性相位调度器。

理由：

1. **零拷贝、读真值**：单线程定步长可回放引擎没有跨边界，影子拷贝没有买家；追踪弹必须读目标当前位置，on-demand 现场查询既更省又更正确。
2. **介质只认接口不认类**：`WorldObservable` 让调用方只依赖投影字段，并为投射物/墙体等非 Member 实体进入同一查询留口；空间层穿透读取真实成员**不是偏差**，把它从「读具体 Member」收敛到「读统一只读契约」才是要做的。
3. **战斗计算权留在 actor**：介质永不提供 `getEffectiveDefense` 这类有效值接口。`self.*`（自身属性引用语义）与「可观测性」（介质/他人能否感知）是两条独立的轴，StatContainer 不分区。环境依赖统一走 Area/BuffArea → modifier → StatContainer。
4. **相位顺序即确定性来源**：显式 `tickPriority` 相位带（member 带 settle → projectile 带 → query）保证回放确定；XState invoke 的异步监督反而会丢相位边界。
5. **能力组合而非继承**：`WorldEntity` 基类唯一职责是「与介质双向通信」；`Damageable`/`StatContainer`/`BT` 仅 Member，`Velocity`/`Collider` 仅投射物。能力不对称是「组合 over 继承」的决定性信号。

### 确立的契约

**介质能力清单**：on-demand 空间查询（含游戏语义的感知半径）+ WorldEntity 生命周期推进 + 碰撞相交检测 + impact 派发。**不含** AoI 订阅、属性缓存、广播。

**`WorldObservable`（actor 实现的只读读面）**：`id`/`type`/`campId`/`teamId`/`position`/`alive`/`collisionRadius`，后续按需扩展 `facing`/`targetable`/公开 `statusTags`。schema 由介质定义、actor 填值，读当前真值、零分配、不返回新对象。

**`WorldEntity`（最小通信契约）**：

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

**两段式伤害边界**：空间层算关系量（distance/direction/targetCount/碰撞/遮挡）并转发施法者快照；目标 actor 算私有结算量（def/avoid/resist/护盾/无敌/死亡保护/HP·MP 写回）。已忠实于「谁有权改状态谁做最后计算」，不重做，只把边界显式化。

**on-hit / death 回流路径**（与 ADR 0005 衔接）：ADR 0005 已定「命中后效果通过攻击 Payload 传递」，目标侧结算回调施法者会模糊职责边界。本 ADR 据介质模型补充：受击结算后，目标 actor emit `damage.received` 到自身 ProcBus；HP 归零发布 `death` domain event 并令 `alive=false` 成为新的可观测真值（介质下次查询自然读到，无需主动推送）；on-hit/on-crit/on-kill 回施法者走**事件路由**而非目标侧直接回调，保持「目标只发布事实、不替施法者做决定」。具体事件载荷形状留待事件回流迭代细化。

### AoI 裁决

AoI 作为性能/网络裁剪用途**出局**：本引擎单线程同进程、几十成员、介质不广播，没有「向谁推送」，自然没有「只向 AoI 内推送」的优化对象。其性能继任者是 `queryCircle` 内部的空间加速结构（四叉树/网格），按成员数逼近时再引入，不是 AoI 语义。游戏语义「感知范围」（仇恨范围、索敌距离、脱视野丢仇恨）**保留**，但落地形态是 actor 决策时一次带半径的 `queryCircle`，复用空间查询而非常驻订阅。

## 代价

这个决策放弃了什么：

1. **放弃跨边界扩展的现成路径**：on-demand 现场查询假定单进程同线程。若未来真要把模拟拆到 worker/网络多端，没有影子表作为同步边界，需要重新引入快照层。这是有意识的赌注——赌本引擎不会跨边界。
2. **放弃介质侧的查询性能上限**：`queryCircle` 是 O(n) 现场扫描。成员数从几十涨到上千时会成为热点，届时必须在 `queryCircle` 内塞空间加速结构（这是实现优化，不改模型，但是额外工作）。
3. **接口维护成本**：`WorldObservable` / `WorldEntity` 是需要长期维护的契约，每加一类可观测事实都要改接口 + 所有实现者。
4. **两套结构并存**：actor 富 FSM 与 `WorldEntity` 轻数据是两套生命周期，边界没守住时容易出现「把战斗逻辑塞进 WorldEntity」或「把空间状态塞进 StatContainer」的腐化。

什么情况下会后悔：如果引擎演进方向逆转——需要分布式模拟、或需要介质持有权威物理状态（position 迁移给世界的物理碰撞权威）——则「介质不持有 actor 属性」这条会成为约束，需要新 ADR 推翻本决策的子问题一与子问题三。

## 影响范围

- **代码层面**：
  - `World/observable.ts`：`WorldObservable` 接口（已建立）。后续 `WorldEntity` 接口在此族下新增。
  - `SpaceManager.queryCircle`：返回 `WorldObservable` 视图 + camp/alive 过滤（已落地）。
  - `DamageAreaSystem`：消费 `WorldObservable`、经 `MemberManager.sendTo` 派发（已落地）；后续正名 `WorldEntity` 并补 `rangeKind → shape/trajectory` 映射、碰撞相交取代 `startTimeMs` 延迟。
  - `Member`：实现 `WorldObservable`，含权威 `alive` getter（已落地）；`collisionRadius` 当前占位 0，待实体几何配置驱动。
  - `ExpressionEvaluator` / `DamageResolution`：`self` 脱手快照语义（`lockCasterAttributes`，已落地）。
  - `MemberManager.resolveTargetId`：改用 `queryCircle`（待办，本 ADR 解锁）。
  - 受击结算：emit `damage.received` / `death`、on-hit 事件路由（待办，依赖本 ADR 的回流路径决策）。
  - Player 受击入口：与 Mob 共享 `HitSession` / `DamageResolution`（待办）。
- **文档层面**：
  - 本 ADR 是 `world-medium-analysis.tmp.md` 临时分析的正式收敛，该 tmp 文档可在本 ADR Accepted 后归档。
  - `WorldAreaSystem.md`（历史叙述文档）与本 ADR 的介质模型对齐说明需补充交叉引用。
  - 与 ADR 0005 的 on-hit 边界衔接见「决议 / on-hit 回流路径」，事件载荷细化时应增补 ADR。
- **迁移**：现状代码已完成子问题一/二/三的落地（observable 接口、查询收敛、脱手快照）；子问题四（World 不 actor 化）是保持现状、明文化约束。剩余实体化、事件回流、统一受击契约按独立迭代推进，均以本 ADR 为前提。

## 参考

- `src/lib/engine/document/world-medium-analysis.tmp.md`：本 ADR 的原始分析草稿（介质模型、偏差清单、可观测属性权威设计、AoI 裁决、WorldEntity 实体模型）。
- ADR 0005：命中后效果通过攻击 Payload 传递（on-hit 回流边界的前序决策）。
- `src/lib/engine/document/WorldAreaSystem.md`：`SpaceManager` 历史叙述文档。



