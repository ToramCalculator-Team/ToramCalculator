import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, task } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { WikiString } from "./enums";

export type Task = ModifyKeys<Awaited<ReturnType<typeof findTaskById>>, {
  name: WikiString;
  description: WikiString;
}>;
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
  name: {
    "zh-CN": "默认任务",
    "zh-TW": "預設任務",
    "en": "Default Task",
    "ja": "デフォルト任務",
  },
  lv: 0,
  npcId: "",
  rewards: [],
  type: "",
  description: {
    "zh-CN": "默认任务",
    "zh-TW": "預設任務",
    "en": "Default Task",
    "ja": "デフォルト任務",
  }
};

// Dictionary
export const TaskDic = (locale: Locale): ConvertToAllString<Task> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "任务",
        name: "名称",
        id: "ID",
        lv: "等级限制",
        npcId: "所属NPCID",
        rewards: "奖励列表",
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
        rewards: "獎勵列表",
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
        rewards: "Rewards",
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
        rewards: "報酬一覧",
        type: "任務タイプ",
        description: "任務説明",
      };
  }
};
