import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, player } from "../../db/generated/kysely/kyesely";
import { characterSubRelations } from "./character";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";

export interface Player extends DataType<player> {
  MainTable: Awaited<ReturnType<typeof findPlayers>>[number];
  MainForm: player;
}

export function playerSubRelations(eb: ExpressionBuilder<DB, "player">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("character")
        .whereRef("id", "=", "player.useIn")
        .selectAll("character")
        .select((subEb) => characterSubRelations(subEb, subEb.val("character.id"))),
    )
      .$notNull()
      .as("character"),
  ];
}

export async function findPlayerById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player")
    .where("id", "=", id)
    .selectAll("player")
    .select((eb) => playerSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayers() {
  const db = await getDB();
  return await db.selectFrom("player").selectAll("player").execute();
}

export async function updatePlayer(id: string, updateWith: Player["Update"]) {
  const db = await getDB();
  return await db.updateTable("player").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createPlayer(newPlayer: Player["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player = await trx
      .insertInto("player")
      .values({
        ...newPlayer,
        // characterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return player;
  });
}

export async function deletePlayer(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player").where("id", "=", id).returningAll().executeTakeFirst();
}