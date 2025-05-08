import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, task_kill_requirement } from "~/../db/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface TaskKillRequirement extends DataType<task_kill_requirement> {
  MainTable: Awaited<ReturnType<typeof findTaskKillRequirements>>[number];
  MainForm: task_kill_requirement;
}

export function taskKillRequirementSubRelations(eb: ExpressionBuilder<DB, "task_kill_requirement">, id: Expression<string>) {
  return [
    jsonObjectFrom(eb.selectFrom("mob").whereRef("mob.id", "=", "task_kill_requirement.mobId").selectAll("mob")).as("mob"),
  ];
}

export async function findTaskKillRequirementById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_kill_requirement")
    .where("id", "=", id)
    .selectAll("task_kill_requirement")
    .select((eb) => taskKillRequirementSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTaskKillRequirements() {
  const db = await getDB();
  return await db.selectFrom("task_kill_requirement").selectAll("task_kill_requirement").execute();
}

export async function updateTaskKillRequirement(id: string, updateWith: TaskKillRequirement["Update"]) {
  const db = await getDB();
  return await db.updateTable("task_kill_requirement").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTaskKillRequirement(id: string) {
  const db = await getDB();
  return await db.deleteFrom("task_kill_requirement").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTaskKillRequirement(trx: Transaction<DB>, newTaskKillRequirement: TaskKillRequirement["Insert"]) {
  const taskKillRequirement = await trx.insertInto("task_kill_requirement").values({
    ...newTaskKillRequirement,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
  return taskKillRequirement;
} 