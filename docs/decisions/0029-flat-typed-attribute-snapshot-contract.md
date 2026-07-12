# 0029 - 属性快照采用扁平路径与严格叶节点契约

- **状态**: Accepted
- **日期**: 2026-07-11
- **决策层**: 跨层（数据 / 引擎 / 通信 / UI）
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StatContainer/`、`src/lib/engine/core/World/Member/Member.ts`、`src/lib/engine/core/types.ts`
- **相关 ADR**: Depends on 0022；Refines 0028

## 背景

StatContainer 已在构造时把嵌套 AttributeSchema 展开为属性路径和连续 TypedArray，并按属性索引保存 modifier 来源。当前对外导出却通过 `exportNestedValues()` 重新构造任意深度对象，随后以 `Record<string, unknown>` 进入 `MemberSerializeData` 和 `FrameSnapshot`；UI 消费时又递归查找并扁平化叶节点。这既丢失线程协议的静态与运行时类型约束，也在每 Tick 捕获路径中重复创建展示结构。

## 决策驱动

- 权威快照必须具有单一、可验证且可版本化的跨线程 schema。
- 快照形状应与 StatContainer 的属性路径和索引模型一致，避免每 Tick 构树后再展开。
- UI 分组和未来压缩表示必须是权威数据的投影，而不是第二套属性事实。

## 候选方案

### A. 保留嵌套树并增加递归 schema

- 优点：接近当前 UI 接收形状，已有消费者改动较少。
- 缺点：需要递归节点/叶节点判定，仍会重复构树；动态分组名可能与叶节点字段冲突，差异计算和列式优化也需要再次展开。

### B. 直接导出扁平属性路径映射

- 优点：与 StatContainer 既有索引模型一致；叶节点可以由严格 schema 统一验证，Tick 差异计算、压缩和未来 SAB 字典化都无需再解析嵌套路径。
- 缺点：现有 UI 需要按属性路径派生分组，依赖嵌套对象的调用方必须迁移。

## 决议

选 B：**StatContainer 保持现有扁平内部存储；权威属性快照直接导出为 `AttributePath -> AttributeSnapshotLeaf`，叶节点及 modifier 来源由统一 Zod schema 定义。**

1. 不修改 StatContainer 的 TypedArray、属性索引、依赖图、脏值刷新或内部 `TAttrKey` 泛型。
2. `ModifierSource`、modifier 条目、属性叶节点和属性快照建立单一 Zod schema；公开 TypeScript 类型从 schema 推导。
3. `MemberSerializeData.attrs` 与 `FrameSnapshot` 使用同一属性快照契约，不再声明为 `Record<string, unknown>`。
4. 线程协议不泛化为 `FrameSnapshot<TAttrKey>`。异构成员共享动态字符串路径，但路径对应的叶节点结构必须严格一致。
5. 面向展示的属性分组由 UI 根据路径派生，不进入 Worker 权威快照。
6. `exportNestedValues()` 不再作为运行记录和线程协议的数据源；若调试视图仍需要，可作为非权威投影暂时保留。

## 代价

Character、Simulator HUD、技能预览和属性面板需要迁移到扁平路径契约。属性路径成为长期记录的一部分，重命名路径需要版本迁移或兼容映射。完整叶节点仍可能在相邻 Tick 间重复大量 modifier 来源；后续可以在不改变查询语义的前提下使用来源字典、列式或增量表示优化存储。

## 重新评估条件

- 需要支持无法稳定映射为属性路径的异构或递归属性结构。
- 属性路径兼容迁移的成本持续高于嵌套 schema 的维护成本。
- 跨线程协议被新的强类型列式协议整体取代，且不再对外暴露路径映射。

## 影响范围

- StatContainer 增加严格的扁平属性快照导出，避免先构树再展开。
- `MemberSerializeData`、`FrameSnapshot` 和 Worker 协议共享同一 schema 与派生类型。
- UI 不再通过 `isDataStorageType` 遍历未知树来发现叶节点，而是直接消费已验证的路径映射。
- ADR 0028 的每 Tick 捕获以本契约作为属性数据形状，性能优化不得重新引入第二套属性表示。
