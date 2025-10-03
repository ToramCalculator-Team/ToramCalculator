import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { createId } from "@paralleldrive/cuid2";
import { armor, crystal, DB, image, item, recipe, recipe_ingredient } from "../generated/kysely/kysely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";

// 1. 类型定义
export type Armor = Selectable<armor>;
export type ArmorInsert = Insertable<armor>;
export type ArmorUpdate = Updateable<armor>;
// 关联查询类型
export type ArmorWithRelations = Awaited<ReturnType<typeof findArmorByItemId>>;

// 2. 关联查询定义
export function armorSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_armorTocrystal")
        .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
        .where("_armorTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

// 3. 基础 CRUD 方法
export async function findArmorById(id: string): Promise<Armor | null> {
  const db = await getDB();
  return await db
    .selectFrom("armor")
    .where("itemId", "=", id)
    .selectAll("armor")
    .executeTakeFirst() || null;
}

export async function findArmors(): Promise<Armor[]> {
  const db = await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .selectAll(["armor", "item"])
    .execute();
}

export async function insertArmor(trx: Transaction<DB>, data: ArmorInsert): Promise<Armor> {
  return await trx
    .insertInto("armor")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createArmor(trx: Transaction<DB>, data: ArmorInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Armor> {
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
  
  // 3. 创建 armor 记录
  const armor = await insertArmor(trx, {
    ...data,
    itemId: item.id,
  });
  
  return armor;
}

export async function updateArmor(trx: Transaction<DB>, id: string, data: ArmorUpdate): Promise<Armor> {
  return await trx
    .updateTable("armor")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteArmor(trx: Transaction<DB>, id: string): Promise<Armor | null> {
  return await trx
    .deleteFrom("armor")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findArmorByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .where("item.id", "=", id)
    .selectAll(["armor", "item"])
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithArmorById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("armor", "armor.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "armor"])
    .executeTakeFirstOrThrow();
}
