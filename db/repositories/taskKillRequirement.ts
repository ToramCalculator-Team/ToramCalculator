import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, task_kill_requirement } from "../generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type TaskKillRequirement = Selectable<task_kill_requirement>;
export type TaskKillRequirementInsert = Insertable<task_kill_requirement>;
export type TaskKillRequirementUpdate = Updateable<task_kill_requirement>;
// 关联查询类型
export type TaskKillRequirementWithRelations = Awaited<ReturnType<typeof findTaskKillRequirementWithRelations>>;

// 2. 关联查询定义
export function taskKillRequirementSubRelations(eb: ExpressionBuilder<DB, "task_kill_requirement">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("mob.id", "=", "task_kill_requirement.mobId")
        .selectAll("mob")
    ).as("mob"),
  ];
}

// 3. 基础 CRUD 方法
export async function findTaskKillRequirementById(id: string): Promise<TaskKillRequirement | null> {
  const db = await getDB();
  return await db
    .selectFrom("task_kill_requirement")
    .where("id", "=", id)
    .selectAll("task_kill_requirement")
    .executeTakeFirst() || null;
}

export async function findTaskKillRequirements(): Promise<TaskKillRequirement[]> {
  const db = await getDB();
  return await db
    .selectFrom("task_kill_requirement")
    .selectAll("task_kill_requirement")
    .execute();
}

export async function insertTaskKillRequirement(trx: Transaction<DB>, data: TaskKillRequirementInsert): Promise<TaskKillRequirement> {
  return await trx
    .insertInto("task_kill_requirement")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTaskKillRequirement(trx: Transaction<DB>, data: TaskKillRequirementInsert): Promise<TaskKillRequirement> {
  // 注意：createTaskKillRequirement 内部自己处理事务，所以我们需要在外部事务中直接插入
  const taskKillRequirement = await trx
    .insertInto("task_kill_requirement")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return taskKillRequirement;
}

export async function updateTaskKillRequirement(trx: Transaction<DB>, id: string, data: TaskKillRequirementUpdate): Promise<TaskKillRequirement> {
  return await trx
    .updateTable("task_kill_requirement")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTaskKillRequirement(trx: Transaction<DB>, id: string): Promise<TaskKillRequirement | null> {
  return await trx
    .deleteFrom("task_kill_requirement")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTaskKillRequirementWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("task_kill_requirement")
    .where("id", "=", id)
    .selectAll("task_kill_requirement")
    .select((eb) => taskKillRequirementSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
} 