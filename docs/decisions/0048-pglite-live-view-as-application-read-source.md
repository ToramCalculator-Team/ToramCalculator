# 0048 - PGlite business view 作为应用持久数据的唯一响应式读源

- **状态**: Accepted
- **日期**: 2026-07-23
- **决策层**: 数据层 / 应用层
- **相关代码**: `db/generator/helpers/generateRepository.ts`、`src/lib/pglite/liveQuery.ts`
- **相关 ADR**: Supersedes 0041; Depends on 0018

## 决策问题

Character 已经通过 PGlite business view 收敛本地写入、同步确认和拒写回退，但应用其他持久数据仍同时使用一次性 repository 查询、组件缓存和 live query。系统需要决定是继续按页面选择读取方式，还是为全部正式持久数据建立统一的响应式读取边界。

## 决策驱动

- 本地写入、其他模块写入和同步回灌必须通过同一条读取路径进入界面。
- repository 应只描述可复用查询，不能同时维护一次性读取与响应式读取两套公共契约。
- 应用状态可以拥有交互和运行状态，但不能成为数据库业务视图之外的持久数据副本。
- 写命令仍需要在事务中执行授权、存在性和一致性查询。

## 候选方案

### A. 各调用方自行选择一次性读取或 live query

- 优点：现有调用方无需整体迁移，简单页面可以继续使用异步资源。
- 缺点：同一数据具有不同刷新语义，外部写入和同步回退需要逐页面维护失效或刷新逻辑。

### B. 只为高交互聚合建立 live model

- 优点：复杂聚合可以实时收敛，普通列表保持现状。
- 缺点：数据权威边界仍由页面复杂度决定，普通列表继续保留过期数据和第二套读取契约。

### C. 全部正式持久数据通过 PGlite business view 响应式读取

- 优点：所有持久变化通过统一路径收敛，repository reader 可以完全使用 query builder 表达。
- 缺点：全部读取调用方必须迁移，响应式查询基础设施成为应用级关键依赖。

## 决议

选择 C：**PGlite business view 是应用正式持久数据的唯一响应式读源，repository reader 只提供 query builder，调用边界通过 live query 或领域 live model 消费。**

1. UI、Session 和普通数据服务不得使用一次性读取结果维护正式持久数据副本，也不提供非响应式 fallback。
2. repository reader 只描述查询，不执行查询；简单投影使用通用 live query，复杂聚合可以使用领域 live model。
3. 表单 draft、状态机运行状态和未持久化输入不属于正式持久数据，可以由其生命周期所有者管理。
4. 写命令为了授权、存在性检查、差异计算和事务一致性，可以在命令边界直接执行 query builder；这些结果不得成为长期展示读源。
5. 本决议把 0041 的 Character 边界推广到整个应用，并完整取代 0041。

## 代价

应用读取依赖 PGlite live subscription 的正确性和可用性。调用方不能再以一次性查询规避订阅问题；订阅错误必须显式暴露并在统一基础设施中修复。专用写命令需要清楚区分内部一致性读取与对外持久数据读取。

## 重新评估条件

- PGlite 无法为某类正式持久投影提供可取消且一致的订阅，并且经过测量确认无法在统一读取基础设施中解决。
- 应用引入独立于本地数据库收敛模型的长期离线分支或多人合并协议。
- 某类持久数据必须由远端流式服务直接拥有，无法进入 PGlite business view。

## 参考

- [ADR 0018](./0018-close-write-id-convergence-loop.md)
- [ADR 0041](./0041-character-data-uses-pglite-live-view.md)
