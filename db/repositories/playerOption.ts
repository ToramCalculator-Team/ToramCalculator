import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_option } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { crystalSubRelations } from "./crystal";
import { z } from "zod/v3";
import { player_optionSchema } from "@db/generated/zod";
import { CrystalRelationsSchema } from "./crystal";

// 1. 类型定义
export type PlayerOption = Selectable<player_option>;
export type PlayerOptionInsert = Insertable<player_option>;
export type PlayerOptionUpdate = Updateable<player_option>;
// 关联查询类型
export type PlayerOptionWithRelations = Awaited<ReturnType<typeof findPlayerOptionWithRelations>>;
export const PlayerOptionRelationsSchema = z.object({
  ...player_optionSchema.shape,
  crystalList: z.array(CrystalRelationsSchema),
});

// 2. 关联查询定义
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
  ];
}

// 3. 基础 CRUD 方法
export async function findPlayerOptionById(id: string): Promise<PlayerOption | null> {
  const db = await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .executeTakeFirst() || null;
}

export async function findPlayerOptions(): Promise<PlayerOption[]> {
  const db = await getDB();
  return await db
    .selectFrom("player_option")
    .selectAll("player_option")
    .execute();
}

export async function insertPlayerOption(trx: Transaction<DB>, data: PlayerOptionInsert): Promise<PlayerOption> {
  return await trx
    .insertInto("player_option")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerOption(trx: Transaction<DB>, data: PlayerOptionInsert): Promise<PlayerOption> {
  // 注意：createPlayerOption 内部自己处理事务，所以我们需要在外部事务中直接插入
  const playerOption = await trx
    .insertInto("player_option")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return playerOption;
}

export async function updatePlayerOption(trx: Transaction<DB>, id: string, data: PlayerOptionUpdate): Promise<PlayerOption> {
  return await trx
    .updateTable("player_option")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerOption(trx: Transaction<DB>, id: string): Promise<PlayerOption | null> {
  return await trx
    .deleteFrom("player_option")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerOptionWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .select((eb) => playerOptionSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
