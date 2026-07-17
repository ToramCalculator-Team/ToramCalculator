# 0018 - 闭合 write_id 收敛环：服务端持久化与 rollback 语义

- **状态**: Accepted
- **日期**: 2026-07-06
- **决策层**: 数据层 / 通信
- **相关代码**: `db/generator/helpers/generateSQL.ts`、`src/routes/api/changes.ts`、`src/lib/writeSync/ChangeLogSynchronizer.ts`
- **相关 ADR**: Related to 0017

## 背景

客户端 synced/local/view 三件套依赖 `write_id` 识别服务端回灌并清理乐观覆盖，但服务端表没有持久化该字段；回灌行因此无法与本地写匹配。被拒写的 rollback 又只清 outbox、不清 local，导致用户继续看见从未被服务端接受的数据。

## 候选方案

### A. 服务端持久化 write_id

- 优点：恢复 ElectricSQL through-the-db 的原始收敛语义，复用已有客户端触发器。
- 缺点：服务端 schema 需要迁移，拒绝写仍采用较粗粒度的本地回滚。

### B. 客户端改用值比对或版本号

- 优点：服务端表结构不变。
- 缺点：无法可靠区分巧合相等与真实回灌，并引入第二套收敛协议。

## 决议

选 A：**服务端业务表持久化客户端 `write_id`，并通过 Electric 原样回传；被拒批次恢复“清 outbox + 清 local”的完整 rollback 语义。**

同一收敛边界还包括：

1. 服务端接受客户端合法产生的 delete。
2. insert 使用幂等 upsert，允许崩溃窗口后的安全重投。
3. 上行按 change 的数值顺序处理，不使用事务 ID 字符串排序。
4. `write_id` 是确认和幂等身份，不用业务值相等替代。

## 代价

- 服务端需要增加 `write_id` 列；没有在线迁移能力的环境必须以重建或明确的 schema 迁移完成。
- 粗粒度 rollback 会丢弃当前端尚未确认的本地写，用户可能感知为编辑被撤销。
- 绕过客户端触发器且缺失 `write_id` 的写无法自动清理对应 local 覆盖，只能作为防御性退化处理。

更精细的因果回滚和列级并发合并不在本决议范围内。

## 影响范围

- 服务端 schema、写入端点和客户端同步器共享同一 `write_id` 语义。
- 生成的服务端 SQL 必须为可同步业务表提供该字段。
- rollback、delete、重投和排序都必须维持收敛闭环。

## 参考

- ADR 0017：问题归档
- ElectricSQL through-the-db 模式
