import { Expression, ExpressionBuilder } from "kysely";
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
  const optEquips = await db.selectFrom("option").selectAll().execute();
  return optEquips;
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

export async function createOptEquip(newOptEquip: OptEquip["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {});
}

export async function deleteOptEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}