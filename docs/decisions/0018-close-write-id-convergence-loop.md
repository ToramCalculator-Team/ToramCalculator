# 0018 - 闭合 write_id 收敛环：服务端持久化 + 官方 rollback 语义

- **状态**: Accepted
- **日期**: 2026-07-06
- **决策层**: 数据层 / 通信
- **相关代码**: `db/generator/helpers/generateSQL.ts`、`src/routes/api/changes.ts`、`src/lib/pglite/ChangeLogSynchronizer.ts`
- **相关 ADR**: 0017（问题归档）

## 背景

写链路搬用 ElectricSQL 官方 "through-the-db"（pattern 4）**示例**代码，移植时丢失了官方
自洽设计的一半，导致 local-first 收敛环开路（ADR 0017 B-1/B-4）：

- 服务端表由 `prisma migrate diff` 产出，**无 write_id 列**；`/api/changes` 收到
  `change.write_id` 却丢弃。Electric 回灌的行 write_id 恒 NULL → 客户端清理触发器
  `write_id = NEW.write_id AND write_id IS NOT NULL` 永不命中 → `<t>_local` 乐观覆盖行
  永不清理，且永久遮蔽服务端后续更新。
- `rollback()` 官方是 `DELETE changes` + `DELETE <t>_local` 两句；移植时注释掉后者，
  只清 outbox 留下 local → 被拒写从重试队列消失却仍显示在视图 → 永久静默发散。

客户端三件套（synced/local/view + 触发器）是**已完成的一半**，缺的是服务端把 write_id
持久化并经 Electric 回传的另一半。

## 候选方案

### A. 服务端持久化 write_id（对齐官方）

服务端每张业务表加 `write_id UUID` 列，`/api/changes` 落库时写入 `change.write_id`，
Electric 回灌带回，客户端已有清理触发器自然生效。

- 优点：与官方 pattern 4 一致；改动小；客户端零改动（synced 已有 write_id 列）；
  不 bump DB_SCHEMA_VERSION。
- 缺点：服务端表结构变化，需重建（dev `infra:reset`）或补一条生产 ALTER 迁移。

### B. 客户端改用值比对/版本号收敛，绕开 write_id

清理触发器改为按业务列值或行版本号判断是否已同步。

- 优点：服务端表不变。
- 缺点：偏离官方；值比对无法区分"回灌恰好等于本地值"与"真正已同步"；引入第二套收敛
  语义，违反"避免第二套模式"。

## 决议

选 A。

理由：

1. 官方设计本就正确，问题是移植丢失，修法应是**恢复**而非发明。
2. 客户端三件套已按 write_id 语义写好，改服务端半边即闭合，改动面最小。
3. write_id 作为幂等键还顺带支撑 B-3 的 upsert（`ON CONFLICT DO UPDATE` 写回同一 write_id）。
4. rollback 同步恢复官方"清 outbox + 清所有 local"的完整语义；官方明确不做因果感知的
   定向回滚（"opens the door to a lot of complexity"），遵循其粗暴但自洽的基线。

配套（本次一并落地，见 0017）：B-2 服务端接受 delete；B-3 insert 改幂等 upsert；
B-5 上行按 changes.id 数值序而非 transaction_id 字符串序。

## 代价

- 服务端加列需迁移。dev/测试走 `infra:reset`（initdb 重建）；**生产当前无增量迁移机制
  （仅 initdb），需手工补 `ALTER TABLE ... ADD COLUMN write_id UUID`**——发布前运维步骤，
  已在 0017 标注。
- rollback 恢复清 local 后，一次服务端拒绝会丢弃该端所有未确认本地写（与官方一致）。
  这些写本就被拒、重投也不会过，清掉是正确的，但用户可能感知为"我刚才的编辑没了"。
  更精细的定向回滚留作未来项。
- write_id 缺失兜底用 `randomUUID()`：理论上客户端触发器总会带 write_id，兜底仅防御性。
  若某路径绕过触发器直接 POST 无 write_id 的 change，兜底生成的 id 与任何 local 行都不
  匹配，其 local 覆盖需等该行下次正常写入才清理——可接受的退化。

## 影响范围

- **代码**：`generateSQL.ts` 重构为 `buildServerSql`/`buildClientSql` 从同一 baseSQL 派生，
  共用 `mapTableBlocks` + `isSyncableTable`（跳过表清单 `NON_SYNC_TABLES` 单一真相）；
  server 侧 `injectWriteIdColumn` 注入列。`changes.ts` 落库写 write_id + 接受 delete +
  upsert。`ChangeLogSynchronizer.ts` rollback 清所有 `%_local`、send 数值序。
- **生成产物**：`db/generated/server.sql` 每张业务表带 write_id（生成，勿手改）。
  client.sql 无结构变化，**DB_SCHEMA_VERSION 不变**。
- **迁移**：dev `pnpm infra:reset`；生产补 ALTER 迁移（见代价）。
- **测试**：`localFirstConvergence.test.ts`、`changes.test.ts` 断言从"复现缺陷"转为
  "验证修复"。

## 参考

- ADR 0017（缺陷归档与逐项定性）
- ElectricSQL through-the-db 模式：https://electric.ax/docs/guides/writes
- 官方示例：electric-sql/electric `examples/write-patterns/patterns/4-through-the-db`
  （sync.ts）+ `shared/backend/api.js`（服务端持久化 write_id 的原始实现）
