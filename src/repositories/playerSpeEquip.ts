import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_special } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";

export interface PlayerSpeEquip extends DataType<player_special> {
  MainTable: Awaited<ReturnType<typeof findPlayerSpeEquips>>[number];
  MainForm: player_special;
}

export function playerSpeEquipSubRelations(eb: ExpressionBuilder<DB, "player_special">, id: Expression<string>) {
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

export async function findPlayerSpeEquipById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_special")
    .where("id", "=", id)
    .selectAll("player_special")
    .select((eb) => playerSpeEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerSpeEquips() {
  const db = await getDB();
  return await db.selectFrom("player_special").selectAll("player_special").execute();
}

export async function updatePlayerSpeEquip(id: string, updateWith: PlayerSpeEquip["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_special").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerSpeEquip(trx: Transaction<DB>, newSpeEquip: PlayerSpeEquip["Insert"]) {
  const player_special = await trx
    .insertInto("player_special")
    .values(newSpeEquip)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_special;
}

export async function createPlayerSpeEquip(newSpeEquip: PlayerSpeEquip["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_special = await trx
      .insertInto("player_special")
      .values(newSpeEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_special;
  });
}

export async function deletePlayerSpeEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_special").where("id", "=", id).returningAll().executeTakeFirst();
}