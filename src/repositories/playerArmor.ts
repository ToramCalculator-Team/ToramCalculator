import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_armor } from "../../db/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";

export interface PlayerArmor extends DataType<player_armor> {
  MainTable: Awaited<ReturnType<typeof findPlayerArmors>>[number];
  MainForm: player_armor;
}

export function playerArmorSubRelations(eb: ExpressionBuilder<DB, "player_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_armor", "item.id", "_crystalToplayer_armor.A")
        .whereRef("_crystalToplayer_armor.B", "=", "player_armor.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb.selectFrom("special").whereRef("special.itemId", "=", "player_armor.templateId").selectAll("special"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerArmorById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .select((eb) => playerArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerArmors() {
  const db = await getDB();
  return await db.selectFrom("player_armor").selectAll("player_armor").execute();
}

export async function updatePlayerArmor(id: string, updateWith: PlayerArmor["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_armor").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerArmor(trx: Transaction<DB>, newArmor: PlayerArmor["Insert"]) {
  const player_armor = await trx.insertInto("player_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
  return player_armor;
}

export async function createPlayerArmor(newArmor: PlayerArmor["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_armor = await trx.insertInto("player_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return player_armor;
  });
}

export async function deletePlayerArmor(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_armor").where("id", "=", id).returningAll().executeTakeFirst();
}
