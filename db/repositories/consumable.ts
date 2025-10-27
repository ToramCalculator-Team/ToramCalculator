import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { consumable, DB, item, recipe, recipe_ingredient } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { ConsumableSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Consumable = Selectable<consumable>;
export type ConsumableInsert = Insertable<consumable>;
export type ConsumableUpdate = Updateable<consumable>;

// 子关系定义
const consumableSubRelationDefs = defineRelations({});

// 生成 factory
export const consumableRelationsFactory = makeRelations(
  consumableSubRelationDefs
);

// 构造关系Schema
export const ConsumableWithRelationsSchema = z.object({
  ...ConsumableSchema.shape,
  ...consumableRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const consumableSubRelations = consumableRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findConsumableById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("consumable")
    .where("itemId", "=", id)
    .selectAll("consumable")
    .executeTakeFirst() || null;
}

export async function findConsumables(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .selectAll(["item", "consumable"])
    .execute();
}

export async function insertConsumable(trx: Transaction<DB>, data: ConsumableInsert) {
  return await trx
    .insertInto("consumable")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createConsumable(trx: Transaction<DB>, data: ConsumableInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>) {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 item 记录
  const item = await createItem(trx, {
    ...itemData,
    id: data.itemId || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.account?.id,
    updatedByAccountId: store.session.account?.id,
  });
  
  // 3. 创建 consumable 记录
  const consumable = await insertConsumable(trx, {
    ...data,
    itemId: item.id,
  });
  
  return consumable;
}

export async function updateConsumable(trx: Transaction<DB>, id: string, data: ConsumableUpdate) {
  return await trx
    .updateTable("consumable")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteConsumable(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("consumable")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findConsumableWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .where("item.id", "=", id)
    .selectAll("consumable")
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ConsumableWithRelations = Awaited<ReturnType<typeof findConsumableWithRelations>>;

export async function findItemWithConsumableById(itemId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "consumable.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "consumable"])
    .executeTakeFirstOrThrow();
}
