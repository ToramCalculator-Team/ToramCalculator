import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, task_reward } from "~/../db/kysely/kyesely";
import {  jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface TaskReward extends DataType<task_reward> {
  MainTable: Awaited<ReturnType<typeof findTaskRewards>>[number]
  MainForm: task_reward
}

export function taskRewardSubRelations(eb: ExpressionBuilder<DB, "task_reward">, id: Expression<string>) {
  return [jsonObjectFrom(eb.selectFrom("item").whereRef("item.id", "=", "task_reward.itemId").selectAll("item")).as("item")];
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
  return await db
    .selectFrom("task_reward")
    .selectAll("task_reward")
    .execute();
}

export async function updateTaskReward(id: string, updateWith: TaskReward["Update"]) {
  const db = await getDB();
  return await db.updateTable("task_reward").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteTaskReward(id: string) {
  const db = await getDB();
  return await db.deleteFrom("task_reward").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultReward: TaskReward["Select"] = {
  id: "",
  type: "Exp",
  value: 0,
  probability: 0,
  itemId: null,
  taskId: "",
};

// Dictionary
export const RewardDic = (locale: Locale): ConvertToAllString<TaskReward["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "任务奖励",
        id: "ID",
        taskId: "任务ID",
        type: "类型",
        value: "数量",
        probability: "概率",
        itemId: "物品ID",
      };
    case "zh-TW":
      return {
        selfName: "任務獎勵",
        id: "ID",
        taskId: "任務ID",
        type: "類型",
        value: "數量",
        probability: "概率",
        itemId: "物品ID",
      };
    case "en":
      return {
        selfName: "Task Reward",
        id: "ID",
        taskId: "Task ID",
        type: "Type",
        value: "Value",
        probability: "Probability",
        itemId: "Item ID",
      };
    case "ja":
      return {
        selfName: "任務報酬",
        id: "ID",
        taskId: "任務ID",
        type: "タイプ",
        value: "数値",
        probability: "確率",
        itemId: "アイテムID",
      };
  }
};
