# 0017 - 已知问题：数据同步收敛缺陷与写入端点越权

- **状态**: Withdrawn
- **日期**: 2026-07-06
- **决策层**: 数据层 / 通信
- **相关代码**: `src/lib/writeSync/ChangeLogSynchronizer.ts`、`src/routes/api/changes.ts`
- **相关 ADR**: Related to 0018、0019、0020

## 决策问题

本文件最初归档了服务端授权不足和本地乐观写无法收敛两组问题，但没有比较候选方案或作出架构决议，因此不属于 ADR。

## 决议

2026-07-13 撤回本 ADR 分类。已解决的同步收敛问题由 ADR 0018 记录决策理由；本地主体与领域边界由 ADR 0019、0020 记录。仍未解决的授权边界和列级合并问题迁到 `docs/plans/sync-and-auth-hardening.md`，不得继续在本文件维护进度。

## 代价

编号 0017 作为已发布历史保留，但不再出现在当前权威决策视图中。原问题明细仍可从 Git 历史追溯。

## 后续

- ADR 0018：闭合 `write_id` 收敛环并恢复 rollback 语义。
- ADR 0019：以 `game_profile` 区分本地主体与允许上行的主体。
- ADR 0020：平台与具体游戏领域分层，并由生成器发布领域命名空间。
- `docs/plans/sync-and-auth-hardening.md`：继续跟踪尚未决策的问题。
