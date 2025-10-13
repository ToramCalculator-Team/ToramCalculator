import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, CrystalWithRelationsSchema } from "./crystal";
import { DB, option, item } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";
import { optionSchema, itemSchema } from "@db/generated/zod";
import { z } from "zod/v3";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Option = Selectable<option>;
export type OptionInsert = Insertable<option>;
export type OptionUpdate = Updateable<option>;

// 2. 关联查询定义
const optEquipSubRelationDefs = defineRelations({
  defaultCrystals: {
    build: (eb: ExpressionBuilder<DB, "item">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_crystalTooption")
          .innerJoin("crystal", "_crystalTooption.A", "crystal.itemId")
          .where("_crystalTooption.B", "=", id)
          .selectAll("crystal")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId")))
      ).as("defaultCrystals"),
    schema: z.array(CrystalWithRelationsSchema).describe("默认水晶列表"),
  },
});

const optEquipRelationsFactory = makeRelations(optEquipSubRelationDefs);
export const OptionWithRelationsSchema = z.object({
  ...optionSchema.shape,
  ...itemSchema.shape,
  ...optEquipRelationsFactory.schema.shape,
});
export const optEquipSubRelations = optEquipRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findOptionById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("option")
    .where("itemId", "=", id)
    .selectAll("option")
    .executeTakeFirst() || null;
}

export async function findOptions(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .selectAll(["option", "item"])
    .execute();
}

export async function insertOption(trx: Transaction<DB>, data: OptionInsert) {
  return await trx
    .insertInto("option")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createOption(trx: Transaction<DB>, data: OptionInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>) {
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
  
  // 3. 创建 option 记录（复用 insertOption）
  const option = await insertOption(trx, {
    ...data,
    itemId: item.id,
  });
  
  return option;
}

export async function updateOption(trx: Transaction<DB>, id: string, data: OptionUpdate) {
  return await trx
    .updateTable("option")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteOption(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("option")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findOptionWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .where("item.id", "=", id)
    .selectAll(["option", "item"])
    .select((eb) => optEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithOptionById(itemId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("option", "option.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "option"])
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type OptionWithRelations = Awaited<ReturnType<typeof findOptionWithRelations>>;
