import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_option } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";

export interface PlayerOption extends DataType<player_option> {
  MainTable: Awaited<ReturnType<typeof findPlayerOptions>>[number];
  MainForm: player_option;
}

export function playerOptionSubRelations(eb: ExpressionBuilder<DB, "player_option">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_option", "item.id", "_crystalToplayer_option.A")
        .whereRef("_crystalToplayer_option.B", "=", "player_option.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb.selectFrom("special").whereRef("special.itemId", "=", "player_option.templateId").selectAll("special"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerOptionById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .select((eb) => playerOptionSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerOptions() {
  const db = await getDB();
  return await db.selectFrom("player_option").selectAll("player_option").execute();
}

export async function updatePlayerOption(id: string, updateWith: PlayerOption["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_option").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerOption(trx: Transaction<DB>, newOption: PlayerOption["Insert"]) {
  const player_option = await trx
    .insertInto("player_option")
    .values(newOption)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_option;
}

export async function createPlayerOption(newOption: PlayerOption["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_option = await trx
      .insertInto("player_option")
      .values(newOption)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_option;
  });
}

export async function deletePlayerOption(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_option").where("id", "=", id).returningAll().executeTakeFirst();
}
