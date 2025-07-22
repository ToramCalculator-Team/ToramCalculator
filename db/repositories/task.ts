import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, task } from "../generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Task extends DataType<task> {
  MainTable: Awaited<ReturnType<typeof findTasks>>[number];
  MainForm: task;
}

export function taskSubRelations(eb: ExpressionBuilder<DB, "task">, id: Expression<string>) {
  return [
    jsonArrayFrom(eb.selectFrom("task_reward").where("task_reward.taskId", "=", id).selectAll("task_reward")).as(
      "rewards",
    ),
  ];
}

export async function findTaskById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .select((eb) => taskSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTasks() {
  const db = await getDB();
  return await db.selectFrom("task").selectAll("task").execute();
}

export async function updateTask(id: string, updateWith: Task["Update"]) {
  const db = await getDB();
  return await db.updateTable("task").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTask(id: string) {
  const db = await getDB();
  return await db.deleteFrom("task").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTask(trx: Transaction<DB>, newTask: Task["Insert"]) {
  const task = await trx.insertInto("task").values({
    ...newTask,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
  return task;
}
