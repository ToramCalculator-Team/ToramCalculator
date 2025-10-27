import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_special } from "@db/generated/zod/index";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, CrystalWithRelationsSchema } from "./crystal";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import { PlayerSpecialSchema, ItemSchema } from "@db/generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type PlayerSpecial = Selectable<player_special>;
export type PlayerSpecialInsert = Insertable<player_special>;
export type PlayerSpecialUpdate = Updateable<player_special>;

// 2. 关联查询定义
const playerSpecialSubRelationDefs = defineRelations({
  crystalList: {
    build: (eb: ExpressionBuilder<DB, "player_special">, id: Expression<string>) => 
      jsonArrayFrom(
        eb
          .selectFrom("item")
          .innerJoin("crystal", "item.id", "crystal.itemId")
          .innerJoin("_crystalToplayer_special", "item.id", "_crystalToplayer_special.A")
          .whereRef("_crystalToplayer_special.B", "=", "player_special.id")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
          .selectAll(["item", "crystal"])
      ).as("crystalList"),
    schema: z.array(
      z.object({
        ...ItemSchema.shape,
        ...CrystalWithRelationsSchema.shape,
      })
    ).describe("水晶列表"),
  },
});

const playerSpecialRelationsFactory = makeRelations(playerSpecialSubRelationDefs);
export const PlayerSpecialWithRelationsSchema = z.object({
  ...PlayerSpecialSchema.shape,
  ...playerSpecialRelationsFactory.schema.shape,
});
export const playerSpecialSubRelations = playerSpecialRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findPlayerSpecialById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return (
    (await db.selectFrom("player_special").where("id", "=", id).selectAll("player_special").executeTakeFirst()) || null
  );
}

export async function findPlayerSpecials(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("player_special").selectAll("player_special").execute();
}

export async function insertPlayerSpecial(trx: Transaction<DB>, data: PlayerSpecialInsert) {
  return await trx.insertInto("player_special").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createPlayerSpecial(trx: Transaction<DB>, data: PlayerSpecialInsert) {
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
) {
  return await trx
    .updateTable("player_special")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerSpecial(trx: Transaction<DB>, id: string) {
  return (await trx.deleteFrom("player_special").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 4. 特殊查询方法
export async function findPlayerSpecialWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_special")
    .where("id", "=", id)
    .selectAll("player_special")
    .select((eb) => playerSpecialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type PlayerSpecialWithRelations = Awaited<ReturnType<typeof findPlayerSpecialWithRelations>>;
