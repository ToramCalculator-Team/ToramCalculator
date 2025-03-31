import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, task } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";

export interface Task extends DataType<task> {
  MainTable: Awaited<ReturnType<typeof findTasks>>[number]
  MainForm: task
}

export function taskSubRelations(eb: ExpressionBuilder<DB, "task">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("task_reward").where("task_reward.taskId", "=", id).selectAll("task_reward")).as("rewards")];
}

export async function findTaskById(id: string) {
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .select((eb) => taskSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTasks() {
  return await db
    .selectFrom("task")
    .selectAll("task")
    .execute();
}

export async function updateTask(id: string, updateWith: Task["Update"]) {
  return await db.updateTable("task").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTask(id: string) {
  return await db.deleteFrom("task").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultTask: Task["Insert"] = {
  id: "defaultTaskId",
  name: "defaultTask",
  lv: 0,
  npcId: "",
  type: "Collect",
  description: "defaultTask description",
};

// Dictionary
export const TaskDic = (locale: Locale): ConvertToAllString<Task["Insert"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "任务",
        name: "名称",
        id: "ID",
        lv: "等级限制",
        npcId: "所属NPCID",
        type: "任务类型",
        description: "任务描述",
      };
    case "zh-TW":
      return {
        selfName: "任務",
        name: "名稱",
        id: "ID",
        lv: "等級限制",
        npcId: "所屬NPCID",
        type: "任務類型",
        description: "任務描述",
      };
    case "en":
      return {
        selfName: "Task",
        name: "Name",
        id: "ID",
        lv: "Level Limit",
        npcId: "NPC ID",
        type: "Task Type",
        description: "Task Description",
      };
    case "ja":
      return {
        selfName: "任務",
        name: "名前",
        id: "ID",
        lv: "レベル制限",
        npcId: "NPC ID",
        type: "任務タイプ",
        description: "任務説明",
      };
  }
};
