import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_pet } from "@db/generated/zod/index";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { mobSubRelations, MobWithRelationsSchema } from "./mob";
import { createId } from "@paralleldrive/cuid2";
import { PlayerPetSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type PlayerPet = Selectable<player_pet>;
export type PlayerPetInsert = Insertable<player_pet>;
export type PlayerPetUpdate = Updateable<player_pet>;

// 2. 关联查询定义
const playerPetSubRelationDefs = defineRelations({
  template: {
    build: (eb: ExpressionBuilder<DB, "player_pet">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("mob")
          .whereRef("id", "=", "player_pet.templateId")
          .selectAll("mob")
          .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id")))
      ).$notNull().as("template"),
    schema: MobWithRelationsSchema.describe("宠物模板"),
  },
});

const playerPetRelationsFactory = makeRelations(playerPetSubRelationDefs);
export const PlayerPetWithRelationsSchema = z.object({
  ...PlayerPetSchema.shape,
  ...playerPetRelationsFactory.schema.shape,
});
export const playerPetSubRelations = playerPetRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findPlayerPetById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .executeTakeFirst() || null;
}

export async function findPlayerPets(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_pet")
    .selectAll("player_pet")
    .execute();
}

export async function insertPlayerPet(trx: Transaction<DB>, data: PlayerPetInsert) {
  return await trx
    .insertInto("player_pet")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerPet(trx: Transaction<DB>, data: PlayerPetInsert) {
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

export async function updatePlayerPet(trx: Transaction<DB>, id: string, data: PlayerPetUpdate) {
  return await trx
    .updateTable("player_pet")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerPet(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("player_pet")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerPetWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .select((eb) => playerPetSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type PlayerPetWithRelations = Awaited<ReturnType<typeof findPlayerPetWithRelations>>;
