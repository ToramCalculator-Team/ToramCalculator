import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_pet } from "../generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { mobSubRelations } from "./mob";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type PlayerPet = Selectable<player_pet>;
export type PlayerPetInsert = Insertable<player_pet>;
export type PlayerPetUpdate = Updateable<player_pet>;
// 关联查询类型
export type PlayerPetWithRelations = Awaited<ReturnType<typeof findPlayerPetWithRelations>>;

// 2. 关联查询定义
export function playerPetSubRelations(eb: ExpressionBuilder<DB, "player_pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "player_pet.templateId")
        .selectAll("mob")
        .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id"))),
    )
      .$notNull()
      .as("template"),
  ];
}

// 3. 基础 CRUD 方法
export async function findPlayerPetById(id: string): Promise<PlayerPet | null> {
  const db = await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .executeTakeFirst() || null;
}

export async function findPlayerPets(): Promise<PlayerPet[]> {
  const db = await getDB();
  return await db
    .selectFrom("player_pet")
    .selectAll("player_pet")
    .execute();
}

export async function insertPlayerPet(trx: Transaction<DB>, data: PlayerPetInsert): Promise<PlayerPet> {
  return await trx
    .insertInto("player_pet")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerPet(trx: Transaction<DB>, data: PlayerPetInsert): Promise<PlayerPet> {
  // 注意：createPlayerPet 内部自己处理事务，所以我们需要在外部事务中直接插入
  const player_pet = await trx
    .insertInto("player_pet")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return player_pet;
}

export async function updatePlayerPet(trx: Transaction<DB>, id: string, data: PlayerPetUpdate): Promise<PlayerPet> {
  return await trx
    .updateTable("player_pet")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerPet(trx: Transaction<DB>, id: string): Promise<PlayerPet | null> {
  return await trx
    .deleteFrom("player_pet")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerPetWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .select((eb) => playerPetSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
