import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { defaultRecipes, RecipeDic, recipeSubRelations } from "./recipe";
import { crystalSubRelations } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type AddEquip = Awaited<ReturnType<typeof findAddEquipById>>;
export type NewAddEquip = Insertable<item>;
export type AddEquipUpdate = Updateable<item>;

export function addEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_additional_equipmentTocrystal")
        .innerJoin("crystal", "_additional_equipmentTocrystal.B", "crystal.itemId")
        .where("_additional_equipmentTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.addEquipId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findAddEquipById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("additional_equipment", "item.id", "additional_equipment.itemId")
    .where("id", "=", id)
    .selectAll(["item", "additional_equipment"])
    .select((eb) => addEquipSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAddEquip(id: string, updateWith: AddEquipUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createAddEquip(newAddEquip: NewAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newAddEquip).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteAddEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAddEquip: AddEquip = {
  name: "默认追加（缺省值）",
  id: "defaultAddEquipId",
  modifiers: [],
  itemId: "defaultAddEquipId",
  defaultCrystals: [],
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.addEquip,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
};

// Dictionary
export const AddEquipDic = (locale: Locale): ConvertToAllString<AddEquip> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        modifiers: "属性",
        itemId: "所属道具ID",
        defaultCrystals: "附加锻晶",
        baseDef: "防御力",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
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
        modifiers: "屬性",
        itemId: "所屬道具ID",
        defaultCrystals: "附加鑽晶",
        baseDef: "防禦力",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
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
        modifiers: "Modifiers",
        itemId: "ItemId",
        defaultCrystals: "Default Crystals",
        baseDef: "Base Def",
        colorA: "Color A",
        colorB: "Color B",
        colorC: "Color C",
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
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        defaultCrystals: "デフォルトクリスタル",
        baseDef: "防御力",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
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
