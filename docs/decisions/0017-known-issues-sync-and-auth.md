# 0017 - 已知问题：数据同步收敛缺陷与写入端点越权

- **状态**: B 组已修复；A 组暂缓
- **日期**: 2026-07-06
- **决策层**: 数据层 / 通信
- **相关代码**: `src/lib/pglite/ChangeLogSynchronizer.ts`、`src/routes/api/changes.ts`
- **相关 ADR**: 0018、0019、0020

> 本文件是问题归档，不是新的架构决策。后续决议分别记录在相关 ADR 中。

## 背景

客户端写链路采用 ElectricSQL through-the-db：本地视图把写入记录到 `changes`，同步器提交到 `/api/changes`，服务端落库后再由 Electric 回灌。审阅发现两类问题：服务端授权边界不足，以及本地乐观写无法可靠收敛。

## A. 安全类问题（暂缓）

### A-1：缺少行级归属校验

写入端点只验证 JWT 有效性，没有验证当前用户能否修改指定表和行。有效用户理论上可以修改全局数据或他人资源。

### A-2：缺少字段白名单

请求值只移除 `undefined`，没有按表限制可写列。参数化查询能防 SQL 注入，但不能阻止伪造归属等业务越权。

这两项同源于服务端缺少“表白名单 + 行归属 + 字段白名单”的授权模型。当前暂缓，后续应由独立安全决议处理。

## B. 同步收敛问题

| 编号 | 问题 | 状态 |
|---|---|---|
| B-1 | 服务端不持久化 `write_id`，导致 local 覆盖永不清理 | 已由 ADR 0018 修复 |
| B-2 | 客户端产生 delete，但服务端拒绝，阻塞后续队列 | 已修复 |
| B-3 | accepted 后本地未清理时重投 insert，主键冲突后持续重试 | 已通过幂等 upsert 修复 |
| B-4 | rejected 时清空 outbox 却保留 local，形成静默发散 | 已恢复完整 rollback 语义 |
| B-5 | 事务 ID 使用字符串排序，可能破坏依赖顺序 | 已改为按 change 数值顺序处理 |
| B-6 | update 上行全列快照，不同列的并发修改退化为整行 last-write-wins | 未处理 |

B-1 至 B-5 的统一决议见 ADR 0018。B-6 涉及列级合并语义，应在出现明确并发需求时单独决策。

## 后续决策

- ADR 0018：闭合 `write_id` 收敛环并恢复 rollback 语义。
- ADR 0019：以 `game_profile` 区分本地主体与允许上行的主体。
- ADR 0020：平台与具体游戏领域分层，并由生成器发布领域命名空间。

## 参考

- ElectricSQL through-the-db 模式
- `src/lib/pglite/localFirstConvergence.test.ts`
- `src/routes/api/changes.test.ts`
