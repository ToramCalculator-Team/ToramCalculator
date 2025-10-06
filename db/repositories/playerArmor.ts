import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_armor } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, CrystalWithRelationsSchema } from "./crystal";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v3";
import { player_armorSchema, itemSchema } from "@db/generated/zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type PlayerArmor = Selectable<player_armor>;
export type PlayerArmorInsert = Insertable<player_armor>;
export type PlayerArmorUpdate = Updateable<player_armor>;

// 2. 关联查询定义
const playerArmorSubRelationDefs = defineRelations({
  crystalList: {
    build: (eb: ExpressionBuilder<DB, "player_armor">, id: Expression<string>) => 
      jsonArrayFrom(
        eb
          .selectFrom("item")
          .innerJoin("crystal", "item.id", "crystal.itemId")
          .innerJoin("_crystalToplayer_armor", "item.id", "_crystalToplayer_armor.A")
          .whereRef("_crystalToplayer_armor.B", "=", "player_armor.id")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
          .selectAll(["item", "crystal"])
      ).as("crystalList"),
    schema: z.array(
      z.object({
        ...itemSchema.shape,
        ...CrystalWithRelationsSchema.shape,
      })
    ).describe("水晶列表"),
  },
});

const playerArmorRelationsFactory = makeRelations(playerArmorSubRelationDefs);
export const PlayerArmorWithRelationsSchema = z.object({
  ...player_armorSchema.shape,
  ...playerArmorRelationsFactory.schema.shape,
});
export const playerArmorSubRelations = playerArmorRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findPlayerArmorById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return (
    (await db.selectFrom("player_armor").where("id", "=", id).selectAll("player_armor").executeTakeFirst()) || null
  );
}

export async function findPlayerArmors(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("player_armor").selectAll("player_armor").execute();
}

export async function insertPlayerArmor(trx: Transaction<DB>, data: PlayerArmorInsert) {
  return await trx.insertInto("player_armor").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createPlayerArmor(trx: Transaction<DB>, data: PlayerArmorInsert) {
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

export async function updatePlayerArmor(
  trx: Transaction<DB>,
  id: string,
  data: PlayerArmorUpdate,
) {
  return await trx.updateTable("player_armor").set(data).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
}

export async function deletePlayerArmor(trx: Transaction<DB>, id: string) {
  return (await trx.deleteFrom("player_armor").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 4. 特殊查询方法
export async function findPlayerArmorWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .select((eb) => playerArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type PlayerArmorWithRelations = Awaited<ReturnType<typeof findPlayerArmorWithRelations>>;
