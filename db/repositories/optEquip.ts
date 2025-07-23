import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DB, option, item } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";

// 1. 类型定义
export type Option = Selectable<option>;
export type OptionInsert = Insertable<option>;
export type OptionUpdate = Updateable<option>;
// 关联查询类型
export type OptionWithRelations = Awaited<ReturnType<typeof findOptionWithRelations>>;

// 2. 关联查询定义
export function optEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTooption")
        .innerJoin("crystal", "_crystalTooption.A", "crystal.itemId")
        .where("_crystalTooption.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

// 3. 基础 CRUD 方法
export async function findOptionById(id: string): Promise<Option | null> {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .where("itemId", "=", id)
    .selectAll("option")
    .executeTakeFirst() || null;
}

export async function findOptions(): Promise<Option[]> {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .selectAll(["option", "item"])
    .execute();
}

export async function insertOption(trx: Transaction<DB>, data: OptionInsert): Promise<Option> {
  return await trx
    .insertInto("option")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createOption(trx: Transaction<DB>, data: OptionInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>): Promise<Option> {
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
  
  // 3. 创建 option 记录（复用 insertOption）
  const option = await insertOption(trx, {
    ...data,
    itemId: item.id,
  });
  
  return option;
}

export async function updateOption(trx: Transaction<DB>, id: string, data: OptionUpdate): Promise<Option> {
  return await trx
    .updateTable("option")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteOption(trx: Transaction<DB>, id: string): Promise<Option | null> {
  return await trx
    .deleteFrom("option")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findOptionWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .where("item.id", "=", id)
    .selectAll(["option", "item"])
    .select((eb) => optEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithOptionById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("option", "option.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "option"])
    .executeTakeFirstOrThrow();
}
