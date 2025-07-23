import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, npc } from "../generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "./statistic";
import { store } from "~/store";

// 1. 类型定义
export type Npc = Selectable<npc>;
export type NpcInsert = Insertable<npc>;
export type NpcUpdate = Updateable<npc>;
// 关联查询类型
export type NpcWithRelations = Awaited<ReturnType<typeof findNpcWithRelations>>;

// 2. 关联查询定义
export function npcSubRelations(eb: ExpressionBuilder<DB, "npc">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("task")
        .where("task.npcId", "=", id)
        .selectAll("task")
    ).as("tasks"),
  ];
}

// 3. 基础 CRUD 方法
export async function findNpcById(id: string): Promise<Npc | null> {
  const db = await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .executeTakeFirst() || null;
}

export async function findNpcs(): Promise<Npc[]> {
  const db = await getDB();
  return await db
    .selectFrom("npc")
    .selectAll("npc")
    .execute();
}

export async function insertNpc(trx: Transaction<DB>, data: NpcInsert): Promise<Npc> {
  return await trx
    .insertInto("npc")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createNpc(trx: Transaction<DB>, data: NpcInsert): Promise<Npc> {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 npc 记录（复用 insertNpc）
  const npc = await insertNpc(trx, {
    ...data,
    id: data.id || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.user.account?.id,
    updatedByAccountId: store.session.user.account?.id,
  });
  
  return npc;
}

export async function updateNpc(trx: Transaction<DB>, id: string, data: NpcUpdate): Promise<Npc> {
  return await trx
    .updateTable("npc")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteNpc(trx: Transaction<DB>, id: string): Promise<Npc | null> {
  return await trx
    .deleteFrom("npc")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findNpcWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => npcSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}