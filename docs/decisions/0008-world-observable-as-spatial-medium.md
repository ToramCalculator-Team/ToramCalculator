# 0008 - 世界可观测属性作为空间介质

- **状态**: Proposed
- **日期**: 2026-06-02
- **决策层**: 跨层（编排层 / 通信 / 计算层）
- **相关代码**: `src/lib/engine/core/World/observable.ts`、`src/lib/engine/core/World/SpaceManager.ts`、`src/lib/engine/core/World/Area/DamageAreaSystem.ts`、`src/lib/engine/core/World/Member/Member.ts`
- **相关 ADR**: 0005

## 背景

空间查询此前直接返回具体 `Member`，区域系统因此同时承担几何查询、阵营过滤、战斗求值和 actor 派发，非 Member 实体也无法进入同一空间模型。需要明确空间层持有什么、返回什么，以及战斗数据和调度顺序由谁负责。

## 候选方案

### A. 空间层持有成员属性影子并返回具体对象

- 优点：跨线程时可作为快照边界，调用方能力丰富。
- 缺点：当前单线程引擎会产生无买家的复制和 checkpoint；查询耦合具体类，空间层容易侵入战斗计算。

### B. 空间层现场读取统一只读视图

- 优点：读取当前真值、零影子状态；Member、投射物和障碍物可通过统一契约参与查询。
- 缺点：现场扫描在实体规模增长后需要空间索引；只读契约需要长期维护。

对于 World 调度，另有两种方向：使用异步 actor 监督树，或保留显式确定性相位调度。前者统一 actor 结构，但无法保证跨 actor 的固定处理顺序；后者需要手写排序，但相位顺序本身就是回放确定性的来源。

## 决议

选择现场查询和显式相位调度：

1. **空间介质不缓存 actor 属性。** 查询发生在稳定相位，通过只读接口读取当前真值。
2. **查询只返回 `WorldObservable`。** 最小字段包括身份、阵营、位置、存活和碰撞半径；空间层不认识具体 `Member`。
3. **空间层只计算关系量。** 距离、方向、目标数量和碰撞属于空间；防御、抗性、护盾和 HP 写回仍由目标 actor 结算。
4. **跨 actor 战斗值走既有两条通道。** 施放瞬间值进入 payload 快照，持续外部影响通过 modifier 进入目标 `StatContainer`。
5. **World 保持确定性相位调度器。** `tickPriority` 表达 member settle、projectile 和 query 等相位，不用 XState invoke 托管顺序。
6. **实体能力通过组合表达。** `WorldEntity` 只定义与介质通信的最小契约，不承载通用战斗能力。

成员事实回流遵循“目标发布事实、施法者自行响应”：目标结算后向自身响应总线和领域事件发布结果，不由目标直接替施法者执行 on-hit 决策。

AoI 不作为当前模型的一部分。实体规模增长时可在查询内部加入网格或四叉树，但不改变上述边界。

## 代价

- 现场查询假定单线程同进程；若未来跨 worker 或网络拆分，需要重新引入快照边界。
- 当前查询可能是 O(n)，实体规模增长后需要空间索引。
- `WorldObservable`/`WorldEntity` 是长期契约，需要防止战斗逻辑重新渗入空间层。
- actor 状态机和轻量世界实体契约会并存，职责边界需要持续维护。

## 影响范围

- 所有空间查询和区域系统只依赖 `WorldObservable`，不返回或读取具体 `Member` 能力。
- 目标 actor 保留私有战斗结算权；空间层只负责关系和投递。
- World 的确定性来自显式相位，而不是 actor 监督结构。

## 参考

- `src/lib/engine/document/world-medium-analysis.tmp.md`
- ADR 0005：命中后效果通过攻击 Payload 传递
- `src/lib/engine/document/WorldAreaSystem.md`
