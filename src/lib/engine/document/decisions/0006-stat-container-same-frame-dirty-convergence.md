# 0006 - StatContainer 同帧脏值定点收敛

- **状态**: Accepted
- **日期**: 2026-06-01
- **决策层**: 数据层
- **相关代码**:
  - `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`
  - `src/lib/engine/core/World/Member/runtime/AttributeWatcher/AttributeWatcher.ts`
  - `src/lib/engine/core/World/Member/Member.ts`
- **相关 ADR**: 0001

## 背景

`StatContainer` 是成员属性的持久化数值槽，战斗中由 `Member.tick()` 每帧调用 `flushDirtyValues()` 刷出 modifier 造成的脏值。

旧刷新流程在一次 `updateDirtyValues()` 里执行拓扑序一趟、全量线性兜底一趟、残留检测一趟。`onChange` listener 在通知阶段写回 modifier 时，写回属性如果已经被拓扑循环跳过，就只能依赖线性兜底；线性兜底按属性索引顺序执行，无法保证新脏化的下游依赖者在同一帧按拓扑序收敛。

`onChange` listener 也可能在回调里调用 `getValue()`。旧实现缺少 flush 重入保护，listener 内读取刚标脏的属性会触发嵌套 `updateDirtyValues()`，使计算、通知、写回交错在同一个调用栈里。

## 候选方案

### A. 保留拓扑一趟加线性兜底

继续使用现有刷新流程，只移除诊断扫描和 `Array.shift()`。

- 优点：
  - 变更范围小。
  - 不需要调整 `getValue()` 的重入语义。
- 缺点：
  - listener 写回仍可能因为拓扑循环不回头而留到下一帧。
  - 线性兜底按索引顺序执行，依赖顺序不可证明。
  - 每次有脏值时仍存在与 schema 规模绑定的固定扫描成本。

### B. 下一帧吸收 listener 写回

一次 flush 只处理进入 flush 前已经存在的 dirty 集。通知阶段新增的 dirty 留给下一次 `Member.tick()`。

- 优点：
  - 实现简单，单次 flush 没有定点迭代风险。
  - listener 写回不会拉长当前帧计算时间。
- 缺点：
  - 阈值 watcher 链式触发会产生一帧延迟。
  - 同一帧内 `getValue()` 可能读到写回前的值。
  - 当前代码通过兜底趟尝试同帧吸收写回；改为下一帧会改变既有意图。

### C. 同帧有界定点收敛（采纳）

`markDirty()` 维护位图和显式 `dirtyList`。flush 取出当前 dirty 批次，按构造期预计算的拓扑 rank 排序，只计算值并记录 pending notification；当前批次计算完成后统一派发通知。通知阶段写回的新 dirty 进入下一轮，直到 dirty 和 pending notification 都为空，或超过 pass 上限。

- 优点：
  - 刷新成本主要跟本帧受影响属性数量相关。
  - listener 写回按下一轮拓扑批次吸收，深层级联可以在同一帧收敛。
  - 通知阶段看到的是当前批次已经提交的值快照。
  - flush 重入被显式拦住，listener 内 `getValue()` 走单属性依赖链重算。
- 缺点：
  - listener 链路很长时，单次 flush 可能执行多轮。
  - 需要振荡上限和诊断信息，定位互相写回的 listener。
  - `getValue()` 在 flush 中需要维护一条独立的按需重算路径。

## 决议

采纳方案 C。具体约定：

1. `dirtyBitmap` 继续作为去重事实源，`dirtyList` 作为刷新迭代源。
2. `markDirty()` 只在脏位从 0 变 1 时追加 dirtyList，并向依赖者传播。
3. flush 使用同帧有界定点迭代，当前 dirty 批次按拓扑 rank 排序。
4. 计算阶段只写入 `values`、设置缓存、清 dirty、记录 pending notification。
5. 通知阶段统一派发 pending notification；listener 写回只追加下一轮 dirty。
6. flush 中的 `getValue()` 不启动完整 drain，只按依赖 DFS 重算被读取属性的 dirty dependency 链，并把事件记录到 pending notification。
7. 超过 `maxFlushPasses` 时记录残留 dirty 和 pending notification，用于定位 listener 振荡。

理由：

1. `Member.tick()` 每帧调用 flush，热路径应与本帧变更规模绑定。
2. 属性表达式依赖图已有拓扑关系，dirty 批次按 rank 排序可以复用这条约束。
3. listener 写回是现有 watcher 机制的合法行为，刷新流程需要显式吸收这类写回。
4. 计算和通知分离后，listener 内写回不会打断当前批次计算。

## 代价

这个决议接受这些代价：

1. **单次 flush 时间可能变长**。长 watcher 链会在同一帧内多轮收敛，战斗帧耗时会集中在当前 tick。
2. **振荡需要运行时兜底**。两个 listener 互相写回时无法通过静态拓扑图判断，只能用 pass 上限报错。
3. **dirty 状态维护更复杂**。位图和 dirtyList 必须同时维护，`markAllDirty()`、按需读取、flush drain 都要保持一致。
4. **通知不再与单个属性计算立即同栈触发**。listener 看到的是批次提交后的事件，依赖“计算当前属性时立刻回调”的代码需要改写。

重新考虑条件：

1. profiling 显示同帧多轮收敛造成帧时间尖峰。
2. watcher 振荡在真实技能中频繁出现，说明 listener 写回模型需要更强约束。
3. `getValue()` 在 flush 中按需重算的路径与批量 flush 语义出现难以维护的分歧。

## 影响范围

- 代码层面：
  - `StatContainer` 负责 dirty 队列、flush 定点迭代、pending notification 和重入读取。
  - `AttributeWatcher` 继续只负责阈值判断；handler 写回由 `StatContainer` 的 flush drain 吸收。
  - `Member.tick()` 继续每帧调用 `flushDirtyValues()`，调用点不变。
- 文档层面：
  - 本 ADR 记录 `StatContainer` dirty 刷新语义；旧历史叙述文档不作为该语义权威源。
- 迁移：
  - 现有 watcher handler 无需改 API；依赖同步通知栈顺序的代码需要按批次通知语义复查。

## 参考

- `src/lib/engine/document/decisions/0001-stat-container-as-unified-persistence-slot.md`
- 本次实现前的 `StatContainer.updateDirtyValues()` 热路径审查
