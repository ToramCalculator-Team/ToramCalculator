import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, npc } from "@db/generated/zod/index";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { store } from "~/store";
import { NpcSchema, TaskSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Npc = Selectable<npc>;
export type NpcInsert = Insertable<npc>;
export type NpcUpdate = Updateable<npc>;

// 子关系定义
const npcSubRelationDefs = defineRelations({
  tasks: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("task")
          .where("task.belongToNpcId", "=", id)
          .selectAll("task")
      ).as("tasks"),
    schema: z.array(TaskSchema).describe("任务列表"),
  },
});

// 生成 factory
export const npcRelationsFactory = makeRelations(
  npcSubRelationDefs
);

// 构造关系Schema
export const NpcWithRelationsSchema = z.object({
  ...NpcSchema.shape,
  ...npcRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const npcSubRelations = npcRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findNpcById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .executeTakeFirst() || null;
}

export async function findNpcs(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("npc")
    .selectAll("npc")
    .execute();
}

export async function insertNpc(trx: Transaction<DB>, data: NpcInsert) {
  return await trx
    .insertInto("npc")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createNpc(trx: Transaction<DB>, data: NpcInsert) {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 npc 记录（复用 insertNpc）
  const npc = await insertNpc(trx, {
    ...data,
    id: data.id || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.account?.id,
    updatedByAccountId: store.session.account?.id,
  });
  
  return npc;
}

export async function updateNpc(trx: Transaction<DB>, id: string, data: NpcUpdate) {
  return await trx
    .updateTable("npc")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteNpc(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("npc")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findNpcWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => npcSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type NpcWithRelations = Awaited<ReturnType<typeof findNpcWithRelations>>;