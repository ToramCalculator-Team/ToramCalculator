# 0019 - 渐进式登录以 game_profile 作为本地主体与同步边界

- **状态**: Accepted
- **日期**: 2026-07-10
- **决策层**: 数据层 / 通信 / 应用层
- **相关代码**: `db/schema/models/user.prisma`、`src/session/temporaryAccount.ts`、`src/components/features/loginDialog.tsx`、`src/lib/writeSync/ChangeLogSynchronizer.ts`
- **相关 ADR**: Depends on 0018；Related to 0017

## 背景

当前 `account` 同时承担认证账号、匿名本地主体和游戏资产归属根。匿名用户可以在本地持续创作，但同步层无法区分“仅本地存在”和“已被平台用户认领”，登录后可能把匿名主体和关联数据错误上传。全局清理 `changes`/local 的做法也无法支持多主体。

## 候选方案

### A. 匿名阶段不建立主体

- 优点：服务端不会出现匿名主体。
- 缺点：离线编辑需要另一套无归属草稿模型，登录时还要重新装配数据。

### B. 为匿名用户建立临时 user，登录时合并 user

- 优点：所有数据始终有 user 归属。
- 缺点：认证身份与游戏主体再次混合，user 合并范围过大。

### C. 使用 game_profile 表示游戏内主体

- 优点：保留匿名主体连续性，分离认证与游戏数据，并为同步提供明确归属根。
- 缺点：需要统一认领、冲突选择、changes 过滤和本地清理语义。

## 决议

选 C：**`user` 表示平台身份，`game_profile` 表示某个游戏中的使用主体；只有已认领的 profile 可以上行。**

```text
user
  -> game_profile
       -> 游戏领域账号、存档、角色和资产
```

核心契约：

1. `game_profile` 至少包含游戏身份、可空 `userId` 和 `syncState`。
2. `LocalOnly` profile 仅存在本地，其业务变更不得上行；`Synced` profile 已被用户认领，可以同步。
3. 每个用户在同一游戏中最多拥有一个 profile；同一设备的活动匿名 profile 由本地会话生命周期保证唯一。
4. 登录和注册使用同一认领流程：用户可以绑定本地数据或放弃本地数据。
5. 若云端和本地都存在 profile，不做自动字段合并，用户必须明确选择保留哪一侧。
6. 选择保留云端时删除本地匿名主体及其待上传私有数据；选择保留本地时替换云端私有主体，并转移公共资源的贡献归属。
7. profile 替换属于受控服务端事务，不通过通用 `/api/changes` 编排。
8. `changes` 是本地变更池，不是全局可发送队列；同步器只发送能解析到 `Synced` profile 的变更，并按批次 ID 精确提交或回滚。
9. `sync_heartbeat` 作为系统探针由明确白名单放行。
10. 公共资源直接记录创建和更新它们的 `game_profile`，不再通过中间聚合表表达贡献归属。

## 代价

- 在领域重构完成前，当前混合 `account` 模型和匿名误上传风险仍然存在。
- 冲突采用二选一而非自动合并，会明确丢弃一侧私有数据。
- change 归属追溯依赖关系元数据完整；只有主键的删除还需要回查归属。
- 本决议只约束上行写入；Electric 下行是否按 profile 过滤留给后续安全决议。

实施推迟到 v1.0 之后；在此之前不得继续扩大 `account` 的职责。这是迁移边界，不代表 ADR 未被采纳。

## 影响范围

- 平台 schema、登录流程、同步器和写入端点共享 `game_profile` 归属语义。
- 本地主体认领、放弃和冲突处理必须使用同一状态转换。
- 全局 changes/local 清理不再是合法的多主体操作。

## 参考

- ADR 0017：同步与鉴权问题归档
- ADR 0018：`write_id` 收敛环
- ElectricSQL through-the-db 模式
