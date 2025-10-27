import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_option } from "@db/generated/zod/index";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { crystalSubRelations, CrystalWithRelationsSchema } from "./crystal";
import { z } from "zod/v4";
import { PlayerOptionSchema, ItemSchema } from "@db/generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type PlayerOption = Selectable<player_option>;
export type PlayerOptionInsert = Insertable<player_option>;
export type PlayerOptionUpdate = Updateable<player_option>;

// 2. 关联查询定义
const playerOptionSubRelationDefs = defineRelations({
  crystalList: {
    build: (eb: ExpressionBuilder<DB, "player_option">, id: Expression<string>) => 
      jsonArrayFrom(
        eb
          .selectFrom("item")
          .innerJoin("crystal", "item.id", "crystal.itemId")
          .innerJoin("_crystalToplayer_option", "item.id", "_crystalToplayer_option.A")
          .whereRef("_crystalToplayer_option.B", "=", "player_option.id")
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

const playerOptionRelationsFactory = makeRelations(playerOptionSubRelationDefs);
export const PlayerOptionWithRelationsSchema = z.object({
  ...PlayerOptionSchema.shape,
  ...playerOptionRelationsFactory.schema.shape,
});
export const playerOptionSubRelations = playerOptionRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findPlayerOptionById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .executeTakeFirst() || null;
}

export async function findPlayerOptions(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_option")
    .selectAll("player_option")
    .execute();
}

export async function insertPlayerOption(trx: Transaction<DB>, data: PlayerOptionInsert) {
  return await trx
    .insertInto("player_option")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerOption(trx: Transaction<DB>, data: PlayerOptionInsert) {
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

export async function updatePlayerOption(trx: Transaction<DB>, id: string, data: PlayerOptionUpdate) {
  return await trx
    .updateTable("player_option")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerOption(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("player_option")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerOptionWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .select((eb) => playerOptionSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type PlayerOptionWithRelations = Awaited<ReturnType<typeof findPlayerOptionWithRelations>>;
