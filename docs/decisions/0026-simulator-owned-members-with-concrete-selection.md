# 0026 - Simulator 独占成员编排并由 Member 选择具体参战配置

- **状态**: Accepted
- **日期**: 2026-07-10
- **决策层**: 跨层（数据 / 应用状态 / 引擎）
- **相关代码**: `db/schema/models/data.prisma`、`db/repositories/simulatorEngine.ts`、`src/lib/engine/core/`
- **相关 ADR**: Refines 0024；Related to 0025

## 背景

当前 schema 允许多个 Simulator 通过多对多关系共享同一 Team，Team 又独占 Member；Player 类型 Member 只引用 Player，引擎再通过账号级 `player.useIn` 从全部 Character 中选择一个。这既会让一个方案的编排修改影响其他方案，也无法明确记录成员实际使用哪个 Character。

业务允许多个 Simulator 包含相同的角色或 Mob 配置，但这表示各方案拥有内容相同的独立成员编排，不表示它们共享同一 Team/Member 实体。同一 Simulator 中还禁止同一个 Player 出现两次。

## 候选方案

### A. 继续共享 Team/Member，并补充 Character 选择

- 优点：保留现有关系和队伍共享能力，schema 改动较少。
- 缺点：方案间仍共享可变编排，Player 唯一性和设计草稿所有权需要跨多对多关系校验。

### B. Simulator 独占 Team/Member，Member 直接选择具体参战配置

- 优点：方案边界、成员身份和验证输入都可以局部确定；不同方案不会因共享编排行而互相修改。
- 缺点：内容相同的队伍和成员会产生重复数据；若需要预设能力，必须通过显式复制实现。

## 决议

选 B：**每个 Simulator 独占自己的 Team 与 Member 编排；Member 直接保存其成员类型所需的具体参战配置。**

1. 同一 Team/Member 数据行不得同时属于多个 Simulator。多个方案可以拥有值相同的独立 Team/Member，也可以引用同一个持久 Character 或 Mob 模板。
2. Player 类型 Member 直接保存 `characterId`。Player 身份由 Character 的归属关系推导，不再通过账号级 `player.useIn` 决定 Simulator 成员使用哪个 Character。
3. Mob 类型 Member 保存 `mobId` 及该成员的 Mob 难度配置；该配置属于方案成员，不属于共享 Mob 模板。
4. 同一 Simulator 中，一个 Player 最多对应一个 Member。选择该 Player 的另一个 Character 是替换现有成员配置，不是新增第二个 Player 成员。
5. 如果未来需要队伍或成员预设，加载预设时复制为目标 Simulator 独占的编排数据，不共享可变 Team/Member 行。

## 代价

方案之间不会自动同步队伍编排，内容相同的 Team/Member 会重复存储。现有多对多关系、查询和默认数据需要迁移；Player 唯一性与 Character 归属一致性必须在 schema 能力允许的范围内由约束和写入校验共同保证。

## 影响范围

- Simulator 聚合负责 Team/Member 的创建、修改和移除。
- 引擎输入按 Member 的具体选择裁剪数据，不再加载 Player 的全部 `characters[]` 后读取 `player.useIn`。
- Character 仍是可独立寻址和编辑的持久资源；Member 只持有对它的明确引用。
- 设计草稿与运行快照按 ADR 0025 保留具体 Member 配置与 Character 引用解析结果。
- 迁移与验收见 `docs/plans/0021-aui-interface-state-migration.md`。
