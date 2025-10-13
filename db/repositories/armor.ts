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
import { armorSchema, crystalSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Armor = Selectable<armor>;
export type ArmorInsert = Insertable<armor>;
export type ArmorUpdate = Updateable<armor>;

// 子关系定义
const armorSubRelationDefs = defineRelations({
  defaultCrystals: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("_armorTocrystal")
          .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
          .where("_armorTocrystal.A", "=", id)
          .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
      ).as("defaultCrystals"),
    schema: z.array(crystalSchema).describe("默认水晶列表"),
  },
});

// 生成 factory
export const armorRelationsFactory = makeRelations<"armor", typeof armorSubRelationDefs>(
  armorSubRelationDefs
);

// 构造关系Schema
export const ArmorWithRelationsSchema = z.object({
  ...armorSchema.shape,
  ...armorRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const armorSubRelations = armorRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findArmorById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("armor")
    .where("itemId", "=", id)
    .selectAll("armor")
    .executeTakeFirst() || null;
}

export async function findArmors(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .selectAll(["armor", "item"])
    .execute();
}

export async function insertArmor(trx: Transaction<DB>, data: ArmorInsert) {
  return await trx
    .insertInto("armor")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createArmor(trx: Transaction<DB>, data: ArmorInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>) {
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
  
  // 3. 创建 armor 记录
  const armor = await insertArmor(trx, {
    ...data,
    itemId: item.id,
  });
  
  return armor;
}

export async function updateArmor(trx: Transaction<DB>, id: string, data: ArmorUpdate) {
  return await trx
    .updateTable("armor")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteArmor(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("armor")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findArmorByItemId(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .where("item.id", "=", id)
    .selectAll(["armor", "item"])
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ArmorWithRelations = Awaited<ReturnType<typeof findArmorByItemId>>;

export async function findItemWithArmorById(itemId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("armor", "armor.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "armor"])
    .executeTakeFirstOrThrow();
}
