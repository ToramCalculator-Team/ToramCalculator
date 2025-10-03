import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { material, DB, item, recipe, recipe_ingredient } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";

// 1. 类型定义
export type Material = Selectable<material>;
export type MaterialInsert = Insertable<material>;
export type MaterialUpdate = Updateable<material>;
// 关联查询类型
export type MaterialWithRelations = Awaited<ReturnType<typeof findMaterialWithRelations>>;

// 2. 关联查询定义
export function materialSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

// 3. 基础 CRUD 方法
export async function findMaterialById(id: string): Promise<Material | null> {
  const db = await getDB();
  return await db
    .selectFrom("material")
    .where("itemId", "=", id)
    .selectAll("material")
    .executeTakeFirst() || null;
}

export async function findMaterials(): Promise<Material[]> {
  const db = await getDB();
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .selectAll(["item", "material"])
    .execute();
}

export async function insertMaterial(trx: Transaction<DB>, data: MaterialInsert): Promise<Material> {
  return await trx
    .insertInto("material")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createMaterial(trx: Transaction<DB>, data: MaterialInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Material> {
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
  
  // 3. 创建 material 记录
  const material = await insertMaterial(trx, {
    ...data,
    itemId: item.id,
  });
  
  return material;
}

export async function updateMaterial(trx: Transaction<DB>, id: string, data: MaterialUpdate): Promise<Material> {
  return await trx
    .updateTable("material")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMaterial(trx: Transaction<DB>, id: string): Promise<Material | null> {
  return await trx
    .deleteFrom("material")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findMaterialWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .where("item.id", "=", id)
    .selectAll(["material", "item"])
    .select((eb) => materialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithMaterialById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("material", "material.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "material"])
    .executeTakeFirstOrThrow();
}
