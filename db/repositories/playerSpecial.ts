import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_special } from "../generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";

export interface PlayerSpecial extends DataType<player_special> {
  MainTable: Awaited<ReturnType<typeof findPlayerSpecials>>[number];
  MainForm: player_special;
}

export function playerSpecialSubRelations(eb: ExpressionBuilder<DB, "player_special">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_special", "item.id", "_crystalToplayer_special.A")
        .whereRef("_crystalToplayer_special.B", "=", "player_special.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb.selectFrom("special").whereRef("special.itemId", "=", "player_special.templateId").selectAll("special"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerSpecialById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_special")
    .where("id", "=", id)
    .selectAll("player_special")
    .select((eb) => playerSpecialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerSpecials() {
  const db = await getDB();
  return await db.selectFrom("player_special").selectAll("player_special").execute();
}

export async function updatePlayerSpecial(id: string, updateWith: PlayerSpecial["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_special").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerSpecial(trx: Transaction<DB>, newSpecial: PlayerSpecial["Insert"]) {
  const player_special = await trx
    .insertInto("player_special")
    .values(newSpecial)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_special;
}

export async function createPlayerSpecial(newSpecial: PlayerSpecial["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_special = await trx
      .insertInto("player_special")
      .values(newSpecial)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_special;
  });
}

export async function deletePlayerSpecial(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_special").where("id", "=", id).returningAll().executeTakeFirst();
}