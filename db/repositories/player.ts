import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player } from "../generated/kysely/kyesely";
import { characterSubRelations } from "./character";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Player = Selectable<player>;
export type PlayerInsert = Insertable<player>;
export type PlayerUpdate = Updateable<player>;
// 关联查询类型
export type PlayerWithRelations = Awaited<ReturnType<typeof findPlayerWithRelations>>;

// 2. 关联查询定义
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

// 3. 基础 CRUD 方法
export async function findPlayerById(id: string): Promise<Player | null> {
  const db = await getDB();
  return await db
    .selectFrom("player")
    .where("id", "=", id)
    .selectAll("player")
    .executeTakeFirst() || null;
}

export async function findPlayers(): Promise<Player[]> {
  const db = await getDB();
  return await db
    .selectFrom("player")
    .selectAll("player")
    .execute();
}

export async function insertPlayer(trx: Transaction<DB>, data: PlayerInsert): Promise<Player> {
  return await trx
    .insertInto("player")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayer(trx: Transaction<DB>, data: PlayerInsert): Promise<Player> {
  // 注意：createPlayer 内部自己处理事务，所以我们需要在外部事务中直接插入
  const player = await trx
    .insertInto("player")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return player;
}

export async function updatePlayer(trx: Transaction<DB>, id: string, data: PlayerUpdate): Promise<Player> {
  return await trx
    .updateTable("player")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayer(trx: Transaction<DB>, id: string): Promise<Player | null> {
  return await trx
    .deleteFrom("player")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player")
    .where("id", "=", id)
    .selectAll("player")
    .select((eb) => playerSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}