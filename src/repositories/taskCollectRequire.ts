import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, task_collect_require } from "../../db/generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface TaskCollectRequire extends DataType<task_collect_require> {
  MainTable: Awaited<ReturnType<typeof findTaskCollectRequires>>[number];
  MainForm: task_collect_require;
}

export function taskCollectRequireSubRelations(eb: ExpressionBuilder<DB, "task_collect_require">, id: Expression<string>) {
  return [
    jsonObjectFrom(eb.selectFrom("item").whereRef("item.id", "=", "task_collect_require.itemId").selectAll("item")).as("item"),
  ];
}

export async function findTaskCollectRequireById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_collect_require")
    .where("id", "=", id)
    .selectAll("task_collect_require")
    .select((eb) => taskCollectRequireSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTaskCollectRequires() {
  const db = await getDB();
  return await db.selectFrom("task_collect_require").selectAll("task_collect_require").execute();
}

export async function updateTaskCollectRequire(id: string, updateWith: TaskCollectRequire["Update"]) {
  const db = await getDB();
  return await db.updateTable("task_collect_require").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTaskCollectRequire(id: string) {
  const db = await getDB();
  return await db.deleteFrom("task_collect_require").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTaskCollectRequire(trx: Transaction<DB>, newTaskCollectRequire: TaskCollectRequire["Insert"]) {
  const taskCollectRequire = await trx.insertInto("task_collect_require").values({
    ...newTaskCollectRequire,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
  return taskCollectRequire;
} 