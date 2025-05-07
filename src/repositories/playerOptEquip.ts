import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_option } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { DataType } from "./untils";

export interface PlayerOptEquip extends DataType<player_option> {
  MainTable: Awaited<ReturnType<typeof findPlayerOptEquips>>[number];
  MainForm: player_option;
}

export function playerOptEquipSubRelations(eb: ExpressionBuilder<DB, "player_option">, id: Expression<string>) {
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

export async function findPlayerOptEquipById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .select((eb) => playerOptEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerOptEquips() {
  const db = await getDB();
  return await db.selectFrom("player_option").selectAll("player_option").execute();
}

export async function updatePlayerOptEquip(id: string, updateWith: PlayerOptEquip["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_option").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerOptEquip(trx: Transaction<DB>, newOptEquip: PlayerOptEquip["Insert"]) {
  const player_option = await trx
    .insertInto("player_option")
    .values(newOptEquip)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_option;
}

export async function createPlayerOptEquip(newOptEquip: PlayerOptEquip["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_option = await trx
      .insertInto("player_option")
      .values(newOptEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_option;
  });
}

export async function deletePlayerOptEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_option").where("id", "=", id).returningAll().executeTakeFirst();
}
