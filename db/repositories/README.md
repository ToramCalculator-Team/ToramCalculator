# Repository 方法规范

## 概述

本规范定义了 Repository 层的方法命名、参数类型、职责分工和实现模式，确保代码的一致性和可维护性。

## 方法命名规范

### 1. 基础 CRUD 方法

#### 查询方法
- `findXxxById(id: string): Promise<Xxx | null>` - 根据 ID 查询单个记录
- `findXxxs(): Promise<Xxx[]>` - 查询所有记录
- `findXxxs(params: FilterParams): Promise<Xxx[]>` - 根据条件查询记录

#### 插入方法
- `insertXxx(trx: Transaction<DB>, data: XxxInsert): Promise<Xxx>` - 纯数据插入
- `createXxx(trx: Transaction<DB>, data: XxxInsert, relatedData?: RelatedData): Promise<Xxx>` - 业务创建（包含关联数据）

#### 更新方法
- `updateXxx(trx: Transaction<DB>, id: string, data: XxxUpdate): Promise<Xxx>` - 更新记录

#### 删除方法
- `deleteXxx(trx: Transaction<DB>, id: string): Promise<Xxx | null>` - 删除记录

### 2. 特殊查询方法

#### 关联查询
- `findXxxWithRelations(id: string): Promise<XxxWithRelations>` - 查询包含关联数据的记录

#### 业务查询
- `findXxxByYyy(yyy: string): Promise<Xxx | null>` - 根据业务字段查询
- `findXxxWithYyy(yyyId: string): Promise<XxxWithYyy>` - 查询包含特定关联的记录

## 类型定义规范

### 1. 基础类型
```typescript
export type Xxx = Selectable<xxx>;
export type XxxInsert = Insertable<xxx>;
export type XxxUpdate = Updateable<xxx>;
```

### 2. 关联查询类型
```typescript
export type XxxWithRelations = Awaited<ReturnType<typeof findXxxWithRelations>>;
```

## 方法职责分工

### insertXxx vs createXxx

#### insertXxx（纯数据插入）
- **职责**: 仅执行数据库插入操作
- **参数**: 完整的插入数据（包含所有必需字段）
- **返回**: 插入后的记录
- **使用场景**: 
  - 在事务中插入已有业务实体的子记录
  - 批量数据导入
  - 测试数据创建

```typescript
export async function insertXxx(trx: Transaction<DB>, data: XxxInsert): Promise<Xxx> {
  return await trx
    .insertInto("xxx")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}
```

#### createXxx（业务创建）
- **职责**: 创建完整的业务实体，包括所有关联数据
- **参数**: 
  - `data: XxxInsert` - 主表数据
  - `relatedData?: RelatedData` - 关联表数据（如 item、statistic 等）
- **返回**: 创建后的主记录
- **使用场景**: 
  - 用户创建新的业务实体
  - 需要同时创建多个关联表的场景
  - 业务逻辑要求完整性的场景

```typescript
export async function createXxx(trx: Transaction<DB>, data: XxxInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Xxx> {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 item 记录
  const item = await createItem(trx, {
    ...itemData,
    id: data.itemId || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.user.account?.id,
    updatedByAccountId: store.session.user.account?.id,
  });
  
  // 3. 创建主记录（复用 insertXxx）
  const xxx = await insertXxx(trx, {
    ...data,
    itemId: item.id,
  });
  
  return xxx;
}
```

## 实现模式

### 1. 文件结构
```typescript
// 1. 类型定义
export type Xxx = Selectable<xxx>;
export type XxxInsert = Insertable<xxx>;
export type XxxUpdate = Updateable<xxx>;
export type XxxWithRelations = Awaited<ReturnType<typeof findXxxWithRelations>>;

// 2. 关联查询定义
export function xxxSubRelations(eb: ExpressionBuilder<DB, "xxx">, id: Expression<string>) {
  return [
    // 关联查询定义
  ];
}

// 3. 基础 CRUD 方法
export async function findXxxById(id: string): Promise<Xxx | null> { /* ... */ }
export async function findXxxs(): Promise<Xxx[]> { /* ... */ }
export async function insertXxx(trx: Transaction<DB>, data: XxxInsert): Promise<Xxx> { /* ... */ }
export async function createXxx(trx: Transaction<DB>, data: XxxInsert, relatedData?: RelatedData): Promise<Xxx> { /* ... */ }
export async function updateXxx(trx: Transaction<DB>, id: string, data: XxxUpdate): Promise<Xxx> { /* ... */ }
export async function deleteXxx(trx: Transaction<DB>, id: string): Promise<Xxx | null> { /* ... */ }

// 4. 特殊查询方法
export async function findXxxWithRelations(id: string) { /* ... */ }
```

### 2. 事务处理
- 所有修改操作必须在事务中执行
- 查询操作可以在事务外执行
- 关联数据创建必须在同一事务中

### 3. 错误处理
- 使用 `executeTakeFirstOrThrow()` 确保操作失败时抛出异常
- 查询方法使用 `executeTakeFirst() || null` 处理空结果

### 4. ID 生成
- 使用 `createId()` 生成 cuid2 格式的 ID
- 允许外部传入 ID，但提供默认生成机制

## 最佳实践

### 1. 方法复用
- `createXxx` 方法必须复用对应的 `insertXxx` 方法
- 避免重复的数据库操作代码

### 2. 类型安全
- 使用 Kysely 的 `Selectable`、`Insertable`、`Updateable` 类型
- 避免使用 `any` 类型
- 关联查询类型通过 `ReturnType` 自动推导

### 3. 性能考虑
- 关联查询使用 `jsonArrayFrom` 和 `jsonObjectFrom` 减少查询次数
- 合理使用索引字段进行查询

### 4. 数据一致性
- 在事务中创建关联数据确保一致性
- 使用外键约束保证数据完整性

## 示例

### 完整的 Repository 实现示例

```typescript
import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { xxx, DB } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";

// 1. 类型定义
export type Xxx = Selectable<xxx>;
export type XxxInsert = Insertable<xxx>;
export type XxxUpdate = Updateable<xxx>;
export type XxxWithRelations = Awaited<ReturnType<typeof findXxxWithRelations>>;

// 2. 关联查询定义
export function xxxSubRelations(eb: ExpressionBuilder<DB, "xxx">, id: Expression<string>) {
  return [
    // 定义关联查询
  ];
}

// 3. 基础 CRUD 方法
export async function findXxxById(id: string): Promise<Xxx | null> {
  const db = await getDB();
  return await db
    .selectFrom("xxx")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findXxxs(): Promise<Xxx[]> {
  const db = await getDB();
  return await db
    .selectFrom("xxx")
    .selectAll()
    .execute();
}

export async function insertXxx(trx: Transaction<DB>, data: XxxInsert): Promise<Xxx> {
  return await trx
    .insertInto("xxx")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createXxx(trx: Transaction<DB>, data: XxxInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Xxx> {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 item 记录
  const item = await createItem(trx, {
    ...itemData,
    id: data.itemId || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.user.account?.id,
    updatedByAccountId: store.session.user.account?.id,
  });
  
  // 3. 创建主记录（复用 insertXxx）
  const xxx = await insertXxx(trx, {
    ...data,
    itemId: item.id,
  });
  
  return xxx;
}

export async function updateXxx(trx: Transaction<DB>, id: string, data: XxxUpdate): Promise<Xxx> {
  return await trx
    .updateTable("xxx")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteXxx(trx: Transaction<DB>, id: string): Promise<Xxx | null> {
  return await trx
    .deleteFrom("xxx")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findXxxWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("xxx")
    .where("id", "=", id)
    .selectAll("xxx")
    .select((eb) => xxxSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
```

## 注意事项

1. **方法复用**: `createXxx` 必须复用 `insertXxx`，避免重复代码
2. **关联数据**: 根据业务需求创建完整的关联数据
3. **事务安全**: 所有修改操作必须在事务中执行
4. **类型推导**: 关联查询类型通过 `ReturnType` 自动推导，避免循环引用
5. **ID 管理**: 允许外部传入 ID，但提供默认生成机制
6. **错误处理**: 使用适当的错误处理机制
7. **性能优化**: 合理使用关联查询减少数据库访问次数 