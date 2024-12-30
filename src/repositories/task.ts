import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, task } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString } from "./untils";
import { Locale } from "~/locales/i18n";

export type Task = Awaited<ReturnType<typeof findTaskById>>;
export type NewTask = Insertable<task>;
export type TaskUpdate = Updateable<task>;

export function taskSubRelations(eb: ExpressionBuilder<DB, "task">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("reward").where("reward.taskId", "=", id).selectAll("reward")).as("rewards")];
}

export async function findTaskById(id: string) {
  return await db
    .selectFrom("task")
    .where("id", "=", id)
    .selectAll("task")
    .select((eb) => taskSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateTask(id: string, updateWith: TaskUpdate) {
  return await db.updateTable("task").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTask(id: string) {
  return await db.deleteFrom("task").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultTask: Task = {
  id: "defaultTaskId",
  name: "默认任务（缺省值）",
  lv: 0,
  npcId: "",
  rewards: [],
};

// Dictionary
export const TaskDic = (locale: Locale): ConvertToAllString<Task> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "任务",
        name: "名称",
        id: "ID",
        lv: "等级限制",
        npcId: "所属NPCID",
        rewards: "奖励列表",
      };
    case "zh-TW":
      return {
        selfName: "任務",
        name: "名稱",
        id: "ID",
        lv: "等級限制",
        npcId: "所屬NPCID",
        rewards: "獎勵列表",
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "Task",
        name: "Name",
        id: "ID",
        lv: "Level Limit",
        npcId: "NPC ID",
        rewards: "Rewards",
      };
    case "ja":
      return {
        selfName: "任務",
        name: "名前",
        id: "ID",
        lv: "レベル制限",
        npcId: "NPC ID",
        rewards: "報酬一覧",
      };
  }
};
