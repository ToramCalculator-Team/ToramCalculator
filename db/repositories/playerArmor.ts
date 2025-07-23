import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_armor } from "../generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type PlayerArmor = Selectable<player_armor>;
export type PlayerArmorInsert = Insertable<player_armor>;
export type PlayerArmorUpdate = Updateable<player_armor>;
// 关联查询类型
export type PlayerArmorWithRelations = Awaited<ReturnType<typeof findPlayerArmorWithRelations>>;

// 2. 关联查询定义
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

// 3. 基础 CRUD 方法
export async function findPlayerArmorById(id: string): Promise<PlayerArmor | null> {
  const db = await getDB();
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .executeTakeFirst() || null;
}

export async function findPlayerArmors(): Promise<PlayerArmor[]> {
  const db = await getDB();
  return await db
    .selectFrom("player_armor")
    .selectAll("player_armor")
    .execute();
}

export async function insertPlayerArmor(trx: Transaction<DB>, data: PlayerArmorInsert): Promise<PlayerArmor> {
  return await trx
    .insertInto("player_armor")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerArmor(trx: Transaction<DB>, data: PlayerArmorInsert): Promise<PlayerArmor> {
  // 注意：createPlayerArmor 内部自己处理事务，所以我们需要在外部事务中直接插入
  const player_armor = await trx
    .insertInto("player_armor")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return player_armor;
}

export async function updatePlayerArmor(trx: Transaction<DB>, id: string, data: PlayerArmorUpdate): Promise<PlayerArmor> {
  return await trx
    .updateTable("player_armor")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerArmor(trx: Transaction<DB>, id: string): Promise<PlayerArmor | null> {
  return await trx
    .deleteFrom("player_armor")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerArmorWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .select((eb) => playerArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
