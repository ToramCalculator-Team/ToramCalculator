import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { defaultRecipes, RecipeDic, recipeSubRelations } from "./recipe";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { WikiString } from "./enums";

export type Consumable = ModifyKeys<Awaited<ReturnType<typeof findConsumableById>>, {
  name: WikiString;
}>;
export type NewConsumable = Insertable<item>;
export type ConsumableUpdate = Updateable<item>;

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.consumableId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findConsumableById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "item.id", "consumable.itemId")
    .where("id", "=", id)
    .selectAll(["item", "consumable"])
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateConsumable(id: string, updateWith: ConsumableUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(newConsumable: NewConsumable) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newConsumable).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultConsumable: Consumable = {
  name: {
    "zh-CN": "默认消耗品（缺省值）",
    "zh-TW": "",
    "zh-HK": "",
    en: "",
    "en-US": "",
    "en-GB": "",
    ja: ""
  },
  id: "defaultConsumableId",
  itemId: "defaultConsumableId",
  type: "",
  effectDuration: 0,
  effects: [],
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.consumable,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
};

// Dictionary
export const ConsumableDic = (locale: Locale): ConvertToAllString<Consumable> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        itemId: "所属道具ID",
        type: "增益类型",
        effectDuration: "持续时间",
        effects: "效果",
        dataSources: "数据来源",
        details: "额外说明",
        dropBy: "掉落于怪物",
        rewardBy: "奖励于任务",
        recipe: RecipeDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        name: "名称",
        id: "ID",
        itemId: "所屬道具ID",
        type: "增益類型",
        effectDuration: "持續時間",
        effects: "效果",
        dataSources: "資料來源",
        details: "額外說明",
        dropBy: "掉落於怪物",
        rewardBy: "獎勵於任務",
        recipe: RecipeDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
        statistic: StatisticDic(locale),
        statisticId: "統計信息ID",
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "Additional Equipment",
        name: "Name",
        id: "ID",
        itemId: "ItemId",
        type: "Type",
        effectDuration: "Effect Duration",
        effects: "Effects",
        dataSources: "Data Sources",
        details: "Details",
        dropBy: "Drop By",
        rewardBy: "Reward By",
        recipe: RecipeDic(locale),
        updatedByAccountId: "Updated By Account Id",
        createdByAccountId: "Created By Account Id",
        statistic: StatisticDic(locale),
        statisticId: "Statistic Id",
      };
    case "ja":
      return {
        selfName: "追加装備",
        name: "名前",
        id: "ID",
        itemId: "所属アイテムID",
        type: "効果タイプ",
        effectDuration: "効果時間",
        effects: "効果",
        dataSources: "データソース",
        details: "追加詳細",
        dropBy: "ドロップバイ",
        rewardBy: "報酬バイ",
        recipe: RecipeDic(locale),
        updatedByAccountId: "アカウントIDによって更新",
        createdByAccountId: "アカウントIDによって作成",
        statistic: StatisticDic(locale),
        statisticId: "統計ID",
      };
  }
};
