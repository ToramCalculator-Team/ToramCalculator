import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystal, DB, item, recipe, recipe_ingredient } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";
import { z } from "zod/v4";
import { CrystalSchema, ItemSchema } from "@db/generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Crystal = Selectable<crystal>;
export type CrystalInsert = Insertable<crystal>;
export type CrystalUpdate = Updateable<crystal>;

// 子关系定义
const crystalSubRelationDefs = defineRelations({
  backs: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("_backRelation")
          .innerJoin("crystal", "_backRelation.B", "crystal.itemId")
          .innerJoin("item", "_backRelation.A", "item.id")
          .whereRef("item.id", "=", "crystal.itemId")
          .selectAll("item")
      ).as("backs"),
    schema: z.array(ItemSchema).describe("前置水晶物品列表"),
  },
  fronts: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("_frontRelation")
          .innerJoin("crystal", "_frontRelation.B", "crystal.itemId")
          .innerJoin("item", "_frontRelation.A", "item.id")
          .whereRef("item.id", "=", "crystal.itemId")
          .selectAll("item")
      ).as("fronts"),
    schema: z.array(ItemSchema).describe("后置水晶物品列表"),
  },
});

// 生成 factory...
export const crystalRelationsFactory = makeRelations(
  crystalSubRelationDefs
);

// 构造关系Schema
export const CrystalWithRelationsSchema = z.object({
  ...CrystalSchema.shape,
  ...crystalRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const crystalSubRelations = crystalRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findCrystalById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("crystal")
    .where("itemId", "=", id)
    .selectAll("crystal")
    .executeTakeFirst() || null;
}

export async function findCrystals(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .selectAll(["item", "crystal"])
    .execute();
}

export async function insertCrystal(trx: Transaction<DB>, data: CrystalInsert) {
  return await trx
    .insertInto("crystal")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createCrystal(trx: Transaction<DB>, data: CrystalInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>) {
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
  
  // 3. 创建 crystal 记录
  const crystal = await insertCrystal(trx, {
    ...data,
    itemId: item.id,
  });
  
  return crystal;
}

export async function updateCrystal(trx: Transaction<DB>, id: string, data: CrystalUpdate) {
  return await trx
    .updateTable("crystal")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteCrystal(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("crystal")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findCrystalWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .where("item.id", "=", id)
    .selectAll(["crystal", "item"])
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type CrystalWithRelations = Awaited<ReturnType<typeof findCrystalWithRelations>>;

export async function findItemWithCrystalById(itemId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "crystal.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "crystal"])
    .executeTakeFirstOrThrow();
}
