import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { character, DB, mercenary, player } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { CharacterWithRelationsSchema, characterSubRelations } from "./character";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { createCharacter } from "./character";
import { createPlayer } from "./player";
import { store } from "~/store";
import { z } from "zod/v3";
import { mercenarySchema } from "@db/generated/zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Mercenary = Selectable<mercenary>;
export type MercenaryInsert = Insertable<mercenary>;
export type MercenaryUpdate = Updateable<mercenary>;

// 2. 关联查询定义
const mercenarySubRelationDefs = defineRelations({
  template: {
    build: (eb: ExpressionBuilder<DB, "mercenary">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("character")
          .whereRef("character.id", "=", "mercenary.templateId")
          .selectAll("character")
          .select((subEb) => characterSubRelations(subEb, subEb.val("character.id")))
      ).$notNull().as("template"),
    schema: CharacterWithRelationsSchema.describe("模板角色"),
  },
});

const mercenaryRelationsFactory = makeRelations(mercenarySubRelationDefs);
export const MercenaryWithRelationsSchema = z.object({
  ...mercenarySchema.shape,
  ...mercenaryRelationsFactory.schema.shape,
});
export const mercenarySubRelations = mercenaryRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findMercenaryById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("mercenary")
    .where("mercenary.templateId", "=", id)
    .selectAll("mercenary")
    .executeTakeFirst() || null;
}

export async function findMercenarys(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("mercenary")
    .selectAll("mercenary")
    .execute();
}

export async function insertMercenary(trx: Transaction<DB>, data: MercenaryInsert) {
  return await trx
    .insertInto("mercenary")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createMercenary(trx: Transaction<DB>, data: MercenaryInsert, characterData: Omit<Insertable<character>, 'id' | 'statisticId' | 'masterId'>, playerData: Omit<Insertable<player>, 'id' | 'accountId'>) {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 player 记录（注意：createPlayer 内部自己处理事务，所以我们需要在外部事务中直接插入）
  const accountId = store.session.user.account?.id;
  if (!accountId) {
    throw new Error("User account not found");
  }
  
  const player = await trx
    .insertInto("player")
    .values({
      ...playerData,
      id: createId(),
      accountId,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  // 3. 创建 character 记录
  const character = await createCharacter(trx, {
    ...characterData,
    id: data.templateId || createId(),
    statisticId: statistic.id,
    masterId: player.id,
  });
  
  // 4. 创建 mercenary 记录（复用 insertMercenary）
  const mercenary = await insertMercenary(trx, {
    ...data,
    templateId: character.id,
  });
  
  return mercenary;
}

export async function updateMercenary(trx: Transaction<DB>, id: string, data: MercenaryUpdate) {
  return await trx
    .updateTable("mercenary")
    .set(data)
    .where("mercenary.templateId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMercenary(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("mercenary")
    .where("mercenary.templateId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findMercenaryWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("mercenary")
    .where("mercenary.templateId", "=", id)
    .selectAll("mercenary")
    .select((eb) => mercenarySubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type MercenaryWithRelations = Awaited<ReturnType<typeof findMercenaryWithRelations>>;