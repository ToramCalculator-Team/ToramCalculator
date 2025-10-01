import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystal, DB, item, recipe, recipe_ingredient } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem, ItemRelationsSchema } from "./item";
import { store } from "~/store";
import { z } from "zod/v3";
import { crystalSchema, itemSchema } from "@db/generated/zod";

// 1. 类型定义
export type Crystal = Selectable<crystal>;
export type CrystalInsert = Insertable<crystal>;
export type CrystalUpdate = Updateable<crystal>;
// 关联查询类型
export type CrystalWithRelations = Awaited<ReturnType<typeof findCrystalWithRelations>>;
export const CrystalRelationsSchema = z.object({
  ...crystalSchema.shape,
  backs: z.array(itemSchema),
  fronts: z.array(itemSchema)
});

// 2. 关联查询定义
export function crystalSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_backRelation")
        .innerJoin("crystal", "_backRelation.B", "crystal.itemId")
        .innerJoin("item", "_backRelation.A", "item.id")
        .whereRef("item.id", "=", "crystal.itemId")
        .selectAll("item"),
    ).as("backs"),
    jsonArrayFrom(
      eb
        .selectFrom("_frontRelation")
        .innerJoin("crystal", "_frontRelation.B", "crystal.itemId")
        .innerJoin("item", "_frontRelation.A", "item.id")
        .whereRef("item.id", "=", "crystal.itemId")
        .selectAll("item"),
    ).as("fronts"),
  ];
}

// 3. 基础 CRUD 方法
export async function findCrystalById(id: string): Promise<Crystal | null> {
  const db = await getDB();
  return await db
    .selectFrom("crystal")
    .where("itemId", "=", id)
    .selectAll("crystal")
    .executeTakeFirst() || null;
}

export async function findCrystals(): Promise<Crystal[]> {
  const db = await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .selectAll(["item", "crystal"])
    .execute();
}

export async function insertCrystal(trx: Transaction<DB>, data: CrystalInsert): Promise<Crystal> {
  return await trx
    .insertInto("crystal")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createCrystal(trx: Transaction<DB>, data: CrystalInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Crystal> {
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
  
  // 3. 创建 crystal 记录
  const crystal = await insertCrystal(trx, {
    ...data,
    itemId: item.id,
  });
  
  return crystal;
}

export async function updateCrystal(trx: Transaction<DB>, id: string, data: CrystalUpdate): Promise<Crystal> {
  return await trx
    .updateTable("crystal")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteCrystal(trx: Transaction<DB>, id: string): Promise<Crystal | null> {
  return await trx
    .deleteFrom("crystal")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findCrystalWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .where("item.id", "=", id)
    .selectAll(["crystal", "item"])
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithCrystalById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "crystal.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "crystal"])
    .executeTakeFirstOrThrow();
}
