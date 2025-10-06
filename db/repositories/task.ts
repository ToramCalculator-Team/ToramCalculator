import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, task } from "../generated/kysely/kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { taskSchema, task_rewardSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Task = Selectable<task>;
export type TaskInsert = Insertable<task>;
export type TaskUpdate = Updateable<task>;

// 子关系定义
const taskSubRelationDefs = defineRelations({
  rewards: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("task_reward")
          .where("task_reward.taskId", "=", id)
          .selectAll("task_reward")
      ).as("rewards"),
    schema: z.array(task_rewardSchema).describe("任务奖励列表"),
  },
});

// 生成 factory
export const taskRelationsFactory = makeRelations<"task", typeof taskSubRelationDefs>(
  taskSubRelationDefs
);

// 构造关系Schema
export const TaskWithRelationsSchema = z.object({
  ...taskSchema.shape,
  ...taskRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const taskSubRelations = taskRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findTaskById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .executeTakeFirst() || null;
}

export async function findTasks(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("task")
    .selectAll("task")
    .execute();
}

export async function insertTask(trx: Transaction<DB>, data: TaskInsert) {
  return await trx
    .insertInto("task")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTask(trx: Transaction<DB>, data: TaskInsert) {
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

export async function updateTask(trx: Transaction<DB>, id: string, data: TaskUpdate) {
  return await trx
    .updateTable("task")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTask(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("task")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findTaskWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .select((eb) => taskSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type TaskWithRelations = Awaited<ReturnType<typeof findTaskWithRelations>>;
