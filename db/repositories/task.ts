import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, task } from "../generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Task = Selectable<task>;
export type TaskInsert = Insertable<task>;
export type TaskUpdate = Updateable<task>;
// 关联查询类型
export type TaskWithRelations = Awaited<ReturnType<typeof findTaskWithRelations>>;

// 2. 关联查询定义
export function taskSubRelations(eb: ExpressionBuilder<DB, "task">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("task_reward")
        .where("task_reward.taskId", "=", id)
        .selectAll("task_reward")
    ).as("rewards"),
  ];
}

// 3. 基础 CRUD 方法
export async function findTaskById(id: string): Promise<Task | null> {
  const db = await getDB();
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .executeTakeFirst() || null;
}

export async function findTasks(): Promise<Task[]> {
  const db = await getDB();
  return await db
    .selectFrom("task")
    .selectAll("task")
    .execute();
}

export async function insertTask(trx: Transaction<DB>, data: TaskInsert): Promise<Task> {
  return await trx
    .insertInto("task")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTask(trx: Transaction<DB>, data: TaskInsert): Promise<Task> {
  // 注意：createTask 内部自己处理事务，所以我们需要在外部事务中直接插入
  const task = await trx
    .insertInto("task")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return task;
}

export async function updateTask(trx: Transaction<DB>, id: string, data: TaskUpdate): Promise<Task> {
  return await trx
    .updateTable("task")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTask(trx: Transaction<DB>, id: string): Promise<Task | null> {
  return await trx
    .deleteFrom("task")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTaskWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .select((eb) => taskSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
