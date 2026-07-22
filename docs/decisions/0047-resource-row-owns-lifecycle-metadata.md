# 0047 - 资源行直接拥有生命周期元信息

- **状态**: Accepted
- **日期**: 2026-07-22
- **决策层**: 数据层（领域所有权 / 持久化 / 客户端同步）
- **相关代码**: `db/schema/models/data.prisma`、`db/generator/helpers/generateRepository.ts`、`db/generator/helpers/generateZod.ts`

## 决策问题

`world`、`address`、`activity`、`zone`、`mob`、`item`、`recipe`、`npc`、`task`、`skill`、`character` 和 `simulator` 都需要创建、更新时间。这些时间没有独立身份、权限或生命周期，但此前被集中存放在 `statistic` 表中，并由资源外键引用。系统需要决定继续把它建模为独立实体、反转关系让元信息引用资源，还是让资源行直接拥有这些字段。

## 决策驱动

- 生命周期元信息必须与资源同时创建、更新和删除，不能产生无归属记录。
- Prisma schema、DMMF、repository、客户端同步表和 UI 配置应表达同一份资源边界。
- 创建资源不能依赖先创建一个仅用于提供外键的辅助实体。
- 时间字段需要保持强类型，并由统一写入边界维护。
- 浏览和使用行为会形成无界事件历史，不能与资源当前状态混在同一行内增长。

## 候选方案

### A. 保留独立 Statistic 实体并由资源引用

- 优点：所有资源的元信息使用统一表结构，可以从单表读取。
- 缺点：元信息没有独立生命周期却获得独立 ID；资源创建、删除和备份都需要跨表编排，还会产生无归属记录和虚假的父关系。

### B. 反转外键，由 Statistic 引用具体资源

- 优点：数据库可以从资源删除向元信息执行级联删除，资源可以先创建。
- 缺点：一个共享表需要为每种资源维护互斥外键，无法直接表达“每个资源恰有一条元信息”；增加资源类型时还要扩展集中表结构。

### C. 资源行直接持有强类型时间字段

- 优点：字段所有权、非空约束和生命周期与资源一致；创建与删除都是单资源操作；DMMF 和同步 schema 可以直接描述真实边界。
- 缺点：相同列会出现在多张资源表中；跨资源时间查询需要联合多个表。

## 决议

选择 C：**资源生命周期元信息由资源行直接拥有，不建立共享 `statistic` 实体。**

1. 12 张资源表直接拥有非空的 `createdAt` 和 `updatedAt` 字段，字段与资源同时创建和删除。
2. 项目使用 Kysely 写入，Prisma 的 `@updatedAt` 不会参与运行时更新；repository 生成器必须在插入时设置两个时间，在更新时刷新 `updatedAt`，并从调用方输入类型和字段选择中排除这两个字段。
3. 数据库驱动返回的 `Date` 在生成的 Zod DateTime schema 边界归一化为 ISO 字符串，应用层只消费可序列化字符串。
4. UI 配置只决定时间字段是否展示或允许输入，不改变字段所有权。表单不允许用户编辑系统维护时间。
5. 原 `usageTimestamps` 和 `viewTimestamps` 没有实际数据与当前业务需求，不迁入资源行。
6. 未来若需要浏览、使用或其他行为历史，使用独立的追加型事件存储；不在资源行中保存无界数组，也不因此恢复共享元信息实体。

## 代价

新增通用生命周期字段时需要同步修改多张资源表，跨资源查询也需要 `UNION` 或独立投影。时间维护依赖 repository 生成规则而不是数据库自动行为，绕过 repository 的直接 Kysely 写入必须显式提供符合 schema 的时间值。删除 `statistic` 还需要一次性迁移已有数据库和备份数据。

## 重新评估条件

- 生命周期元信息出现独立于资源的权限、保留期、共享关系或单独删除需求。
- 跨全部资源的时间分析成为高频查询，并且联合查询或派生投影无法满足已测量的延迟与维护要求。
- 浏览或使用行为历史成为正式需求，需要确定事件身份、保留策略、聚合口径和同步边界。

## 参考

- [Prisma referential actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions)
- [ADR 0018：闭合 write_id 收敛环](./0018-close-write-id-convergence-loop.md)
- [ADR 0041：Character 持久数据以 PGlite business view 为唯一响应式读源](./0041-character-data-uses-pglite-live-view.md)
