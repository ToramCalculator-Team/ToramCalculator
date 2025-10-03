import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, task_reward } from "../generated/kysely/kysely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type TaskReward = Selectable<task_reward>;
export type TaskRewardInsert = Insertable<task_reward>;
export type TaskRewardUpdate = Updateable<task_reward>;
// 关联查询类型
export type TaskRewardWithRelations = Awaited<ReturnType<typeof findTaskRewardWithRelations>>;

// 2. 关联查询定义
export function taskRewardSubRelations(eb: ExpressionBuilder<DB, "task_reward">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .whereRef("item.id", "=", "task_reward.itemId")
        .selectAll("item")
    ).as("item"),
  ];
}

// 3. 基础 CRUD 方法
export async function findTaskRewardById(id: string): Promise<TaskReward | null> {
  const db = await getDB();
  return await db
    .selectFrom("task_reward")
    .where("id", "=", id)
    .selectAll("task_reward")
    .executeTakeFirst() || null;
}

export async function findTaskRewards(): Promise<TaskReward[]> {
  const db = await getDB();
  return await db
    .selectFrom("task_reward")
    .selectAll("task_reward")
    .execute();
}

export async function insertTaskReward(trx: Transaction<DB>, data: TaskRewardInsert): Promise<TaskReward> {
  return await trx
    .insertInto("task_reward")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTaskReward(trx: Transaction<DB>, data: TaskRewardInsert): Promise<TaskReward> {
  // 注意：createTaskReward 内部自己处理事务，所以我们需要在外部事务中直接插入
  const taskReward = await trx
    .insertInto("task_reward")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return taskReward;
}

export async function updateTaskReward(trx: Transaction<DB>, id: string, data: TaskRewardUpdate): Promise<TaskReward> {
  return await trx
    .updateTable("task_reward")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTaskReward(trx: Transaction<DB>, id: string): Promise<TaskReward | null> {
  return await trx
    .deleteFrom("task_reward")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTaskRewardWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_reward")
    .where("id", "=", id)
    .selectAll("task_reward")
    .select((eb) => taskRewardSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
