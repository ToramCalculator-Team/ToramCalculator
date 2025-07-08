import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";
import { DB, option } from "../../db/generated/kysely/kyesely";

export interface Option extends DataType<option> {
  MainTable: Awaited<ReturnType<typeof findOptions>>[number];
  MainForm: option;
}

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

export async function findOptionByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .where("item.id", "=", id)
    .selectAll(["option", "item"])
    .executeTakeFirstOrThrow();
}

export async function findOptions() {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .selectAll(["option", "item"])
    .execute();
}

export async function updateOption(id: string, updateWith: Option["Update"]) {
  const db = await getDB();
  return await db
    .updateTable("option")
    .set(updateWith)
    .where("option.itemId", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createOption(trx: Transaction<DB>, newOption: Option["Insert"]) {
  const optEquip = await trx.insertInto("option").values(newOption).returningAll().executeTakeFirstOrThrow();
  return optEquip;
}

export async function deleteOption(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
