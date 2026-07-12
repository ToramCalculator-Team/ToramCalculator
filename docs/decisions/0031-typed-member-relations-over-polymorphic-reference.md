# 0031 - Member 使用分类型关系而非多态字符串引用

- **状态**: Accepted
- **日期**: 2026-07-12
- **决策层**: 跨层（数据 / 查询 / 同步 / 场景解析）
- **相关代码**: `db/schema/models/data.prisma`、`db/repositories/simulatorEngine.ts`、`src/lib/engine/core/engineScenarioSchema.ts`
- **相关 ADR**: Refines 0026

## 背景

Member 需要按 `MemberType` 引用 Character、Mob、Partner 或 Mercenary。可以把这些引用压缩为 `type + relationId` 多态字符串，也可以为不同类型保留显式数据库关系。前者结构紧凑，但关系目标所在的表由类型动态决定，数据库和 Prisma 无法建立跨表外键；后者字段较多，但可以保留引用完整性、生成关系查询和反向引用。

## 决策驱动

- 持久 Member 引用必须尽可能由数据库外键保证目标存在。
- 写入、查询、同步和场景解析应共享同一个按类型判别的关系契约。
- 新增 MemberType 的扩展成本不能以永久失去引用完整性为代价。

## 候选方案

### A. `type + relationId` 多态字符串引用

- 优点：Member 字段少；增加新 MemberType 时不必增加新的关系字段。
- 缺点：数据库不能验证目标存在或类型匹配；查询、删除约束、反向引用和悬空引用处理都必须由应用手工实现。

### B. 按 MemberType 保留显式关系

- 优点：目标表、外键和关系查询明确；无效引用可以在进入引擎前暴露；持久方案同步后仍保留引用完整性。
- 缺点：Member 包含多个类型专属的可空关系字段；仍需额外约束只能填写与 `type` 匹配的一个关系；增加新类型需要迁移 schema。

## 决议

选 B：**Member 继续使用按类型区分的显式数据库关系，不使用通用 `relationId` 表达多态引用。**

1. Player Member 直接关联一个 Character，不再关联 Player 后通过 `player.useIn` 二次选择。
2. Mob Member 关联一个 Mob；Partner 与 Mercenary 继续使用各自明确的关系，不共享一个无类型的 ID 字段。
3. `member.type`、已填写的关系和被引用目标必须形成合法的判别联合：与当前类型对应的关系必须存在，其他类型关系必须为空。
4. Mob 难度是 Mob Member 的类型专属配置；非 Mob Member 不携带无语义的默认难度。
5. 数据库能够表达的引用完整性由外键保证；跨字段判别约束在写入边界和场景解析边界验证，不通过运行时 fallback 修复无效数据。
6. Simulator 不把永久悬空的成员引用视为合法设计状态；同步暂时未收敛与持久引用无效必须被区分处理。

## 代价

Member schema 会保留多个可空关系字段，新增 MemberType 时需要增加关系和迁移。Prisma schema 本身未必能表达“恰好一个且与 type 匹配”的完整条件，因此仍需要生成 SQL 约束或应用边界校验。若未来明确需要跨库资源引用或允许目标长期缺失，应重新评估多态引用，而不是在现有字段中放入无法验证的字符串。

## 重新评估条件

- Member 必须引用数据库外部或无法建立外键的跨库资源。
- MemberType 数量增长使显式关系迁移成为主要演进瓶颈。
- 产品明确允许持久悬空引用，并建立了独立的解析与修复协议。

## 影响范围

- ADR 0026 中 Player Member 的具体选择落实为直接 Character 关系。
- Member 写入契约和场景解析结果使用同一判别联合，不分别发明宽松形状。
- repository 通过明确关系加载目标数据，不根据通用 ID 动态选择数据表。
- 实施与验收纳入 `docs/plans/minimum-validation-loop.md` 的阶段 0。
