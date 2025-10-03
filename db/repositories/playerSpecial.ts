import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_special } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v3";
import { player_specialSchema } from "@db/generated/zod";
import { CrystalRelationsSchema } from "./crystal";

// 1. 类型定义
export type PlayerSpecial = Selectable<player_special>;
export type PlayerSpecialInsert = Insertable<player_special>;
export type PlayerSpecialUpdate = Updateable<player_special>;
// 关联查询类型
export type PlayerSpecialWithRelations = Awaited<ReturnType<typeof findPlayerSpecialWithRelations>>;
export const PlayerSpecialRelationsSchema = z.object({
  ...player_specialSchema.shape,
  crystalList: z.array(CrystalRelationsSchema),
});

// 2. 关联查询定义
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
  ];
}

// 3. 基础 CRUD 方法
export async function findPlayerSpecialById(id: string): Promise<PlayerSpecial | null> {
  const db = await getDB();
  return (
    (await db.selectFrom("player_special").where("id", "=", id).selectAll("player_special").executeTakeFirst()) || null
  );
}

export async function findPlayerSpecials(): Promise<PlayerSpecial[]> {
  const db = await getDB();
  return await db.selectFrom("player_special").selectAll("player_special").execute();
}

export async function insertPlayerSpecial(trx: Transaction<DB>, data: PlayerSpecialInsert): Promise<PlayerSpecial> {
  return await trx.insertInto("player_special").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createPlayerSpecial(trx: Transaction<DB>, data: PlayerSpecialInsert): Promise<PlayerSpecial> {
  // 注意：createPlayerSpecial 内部自己处理事务，所以我们需要在外部事务中直接插入
  const player_special = await trx
    .insertInto("player_special")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return player_special;
}

export async function updatePlayerSpecial(
  trx: Transaction<DB>,
  id: string,
  data: PlayerSpecialUpdate,
): Promise<PlayerSpecial> {
  return await trx
    .updateTable("player_special")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerSpecial(trx: Transaction<DB>, id: string): Promise<PlayerSpecial | null> {
  return (await trx.deleteFrom("player_special").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 4. 特殊查询方法
export async function findPlayerSpecialWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_special")
    .where("id", "=", id)
    .selectAll("player_special")
    .select((eb) => playerSpecialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
