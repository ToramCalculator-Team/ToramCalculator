import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { consumable, DB, item, recipe, recipe_ingredient } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";
import { jsonArrayFrom } from "kysely/helpers/postgres";

// 1. 类型定义
export type Consumable = Selectable<consumable>;
export type ConsumableInsert = Insertable<consumable>;
export type ConsumableUpdate = Updateable<consumable>;
// 关联查询类型
export type ConsumableWithRelations = Awaited<ReturnType<typeof findConsumableWithRelations>>;

// 2. 关联查询定义
export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

// 3. 基础 CRUD 方法
export async function findConsumableById(id: string): Promise<Consumable | null> {
  const db = await getDB();
  return await db
    .selectFrom("consumable")
    .where("itemId", "=", id)
    .selectAll("consumable")
    .executeTakeFirst() || null;
}

export async function findConsumables(): Promise<Consumable[]> {
  const db = await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .selectAll(["item", "consumable"])
    .execute();
}

export async function insertConsumable(trx: Transaction<DB>, data: ConsumableInsert): Promise<Consumable> {
  return await trx
    .insertInto("consumable")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createConsumable(trx: Transaction<DB>, data: ConsumableInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Consumable> {
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
  
  // 3. 创建 consumable 记录
  const consumable = await insertConsumable(trx, {
    ...data,
    itemId: item.id,
  });
  
  return consumable;
}

export async function updateConsumable(trx: Transaction<DB>, id: string, data: ConsumableUpdate): Promise<Consumable> {
  return await trx
    .updateTable("consumable")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteConsumable(trx: Transaction<DB>, id: string): Promise<Consumable | null> {
  return await trx
    .deleteFrom("consumable")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findConsumableWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .where("item.id", "=", id)
    .selectAll("consumable")
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithConsumableById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "consumable.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "consumable"])
    .executeTakeFirstOrThrow();
}
