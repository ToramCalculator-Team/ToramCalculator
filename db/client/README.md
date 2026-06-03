# Client DB Schema Ledger

客户端数据库使用版本化 SQL 账本启动 PGlite。

- `baseline/client.sql` 是当前客户端数据库固定基线，来自一次受控的 `db/generated/client.sql` 快照。
- `previous-schema.prisma` 是上一已接管版本的 Prisma schema，用作下一次 Prisma diff 的 `from` 输入。
- `migrations/` 是后续客户端 schema 变更的迁移目录。
- `migrations/index.ts` 由 `pnpm generate:schema` 中的 Prisma custom generator 生成，避免人工维护导入顺序和版本链。
- `db/generated/client.sql` 继续作为生成器输出的当前快照，用于创建迁移和校验漂移。

设计说明：PGlite Worker 只能消费版本化 SQL，避免日常 `pnpm generate` 改写历史基线，导致已打开过网站的客户端缺少可追溯升级路径。

正式发布前可以硬重订客户端数据库基线；该动作需要同步更新 `src/lib/version/schema.ts`、`baseline/` 和 `migrations/index.ts`。

日常 schema 变更采用增量迁移：

```txt
schema 变更
-> pnpm generate
-> pnpm build
```

`pnpm generate:schema` 会对比 `previous-schema.prisma` 和 `db/generated/schema.prisma`，生成 `migrations/<id>/prisma-diff.sql` 与客户端增量 `migrations/<id>/client.sql`。
