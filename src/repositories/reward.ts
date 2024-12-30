import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, reward } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { defaultItems } from "./item";
import { TaskRewardType } from "./enums";

export type Reward = ModifyKeys<
  Awaited<ReturnType<typeof findRewardById>>,
  {
    type: TaskRewardType;
  }
>;
export type NewReward = Insertable<reward>;
export type RewardUpdate = Updateable<reward>;

export function rewardSubRelations(eb: ExpressionBuilder<DB, "reward">, id: Expression<string>) {
  return [jsonObjectFrom(eb.selectFrom("item").whereRef("item.id", "=", "reward.itemId").selectAll("item")).as("item")];
}

export async function findRewardById(id: string) {
  return await db
    .selectFrom("reward")
    .where("id", "=", id)
    .selectAll("reward")
    .select((eb) => rewardSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateReward(id: string, updateWith: RewardUpdate) {
  return await db.updateTable("reward").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteReward(id: string) {
  return await db.deleteFrom("reward").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultReward: Reward = {
  id: "defaultRewardId",
  type: "OneHandSword",
  value: 0,
  probability: 0,
  itemId: null,
  taskId: "",
  item: defaultItems.OneHandSword,
};

// Dictionary
export const RewardDic = (locale: Locale): ConvertToAllString<Reward> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "任务奖励",
        id: "ID",
        taskId: "任务ID",
        type: "类型",
        value: "数量",
        probability: "概率",
        itemId: "物品ID",
        item: "物品",
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
        item: "物品",
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "Task Reward",
        id: "ID",
        taskId: "Task ID",
        type: "Type",
        value: "Value",
        probability: "Probability",
        itemId: "Item ID",
        item: "Item",
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
        item: "アイテム",
      };
  }
};
