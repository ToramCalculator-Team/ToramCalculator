import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";
import { DB, option } from "~/../db/kysely/kyesely";

export interface OptEquip extends DataType<option> {
  MainTable: Awaited<ReturnType<typeof findOptEquips>>[number];
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

export async function findOptEquipByItemId(id: string) {
  const db = await getDB();
  const optEquip = await db.selectFrom("option").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
  return optEquip;
}

export async function findOptEquips() {
  const db = await getDB();
  return await db
    .selectFrom("option")
    .innerJoin("item", "item.id", "option.itemId")
    .selectAll(["option", "item"])
    .execute();
}

export async function updateOptEquip(id: string, updateWith: OptEquip["Update"]) {
  const db = await getDB();
  return await db
    .updateTable("option")
    .set(updateWith)
    .where("option.itemId", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createOptEquip(trx: Transaction<DB>, newOptEquip: OptEquip["Insert"]) {
  const optEquip = await trx.insertInto("option").values(newOptEquip).returningAll().executeTakeFirstOrThrow();
  return optEquip;
}

export async function deleteOptEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
