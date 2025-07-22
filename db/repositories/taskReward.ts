import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, task_reward } from "../generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface TaskReward extends DataType<task_reward> {
  MainTable: Awaited<ReturnType<typeof findTaskRewards>>[number];
  MainForm: task_reward;
}

export function taskRewardSubRelations(eb: ExpressionBuilder<DB, "task_reward">, id: Expression<string>) {
  return [
    jsonObjectFrom(eb.selectFrom("item").whereRef("item.id", "=", "task_reward.itemId").selectAll("item")).as("item"),
  ];
}

export async function findTaskRewardById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_reward")
    .where("id", "=", id)
    .selectAll("task_reward")
    .select((eb) => taskRewardSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTaskRewards() {
  const db = await getDB();
  return await db.selectFrom("task_reward").selectAll("task_reward").execute();
}

export async function updateTaskReward(id: string, updateWith: TaskReward["Update"]) {
  const db = await getDB();
  return await db.updateTable("task_reward").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTaskReward(id: string) {
  const db = await getDB();
  return await db.deleteFrom("task_reward").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTaskReward(trx: Transaction<DB>, newTaskReward: TaskReward["Insert"]) {
  const taskReward = await trx.insertInto("task_reward").values({
    ...newTaskReward,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
  return taskReward;
}
