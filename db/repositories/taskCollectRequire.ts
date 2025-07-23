import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, task_collect_require } from "../generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type TaskCollectRequire = Selectable<task_collect_require>;
export type TaskCollectRequireInsert = Insertable<task_collect_require>;
export type TaskCollectRequireUpdate = Updateable<task_collect_require>;
// 关联查询类型
export type TaskCollectRequireWithRelations = Awaited<ReturnType<typeof findTaskCollectRequireWithRelations>>;

// 2. 关联查询定义
export function taskCollectRequireSubRelations(eb: ExpressionBuilder<DB, "task_collect_require">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .whereRef("item.id", "=", "task_collect_require.itemId")
        .selectAll("item")
    ).as("item"),
  ];
}

// 3. 基础 CRUD 方法
export async function findTaskCollectRequireById(id: string): Promise<TaskCollectRequire | null> {
  const db = await getDB();
  return await db
    .selectFrom("task_collect_require")
    .where("id", "=", id)
    .selectAll("task_collect_require")
    .executeTakeFirst() || null;
}

export async function findTaskCollectRequires(): Promise<TaskCollectRequire[]> {
  const db = await getDB();
  return await db
    .selectFrom("task_collect_require")
    .selectAll("task_collect_require")
    .execute();
}

export async function insertTaskCollectRequire(trx: Transaction<DB>, data: TaskCollectRequireInsert): Promise<TaskCollectRequire> {
  return await trx
    .insertInto("task_collect_require")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTaskCollectRequire(trx: Transaction<DB>, data: TaskCollectRequireInsert): Promise<TaskCollectRequire> {
  // 注意：createTaskCollectRequire 内部自己处理事务，所以我们需要在外部事务中直接插入
  const taskCollectRequire = await trx
    .insertInto("task_collect_require")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return taskCollectRequire;
}

export async function updateTaskCollectRequire(trx: Transaction<DB>, id: string, data: TaskCollectRequireUpdate): Promise<TaskCollectRequire> {
  return await trx
    .updateTable("task_collect_require")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTaskCollectRequire(trx: Transaction<DB>, id: string): Promise<TaskCollectRequire | null> {
  return await trx
    .deleteFrom("task_collect_require")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTaskCollectRequireWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_collect_require")
    .where("id", "=", id)
    .selectAll("task_collect_require")
    .select((eb) => taskCollectRequireSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
} 