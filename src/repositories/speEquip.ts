import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, RecipeDic, recipeSubRelations } from "./recipe";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { I18nString } from "./enums";
import { Locale } from "~/locales/i18n";
import { mobSubRelations } from "./mob";

export type SpeEquip = ModifyKeys<Awaited<ReturnType<typeof findSpeEquipById>>, {
  name: I18nString
}>;
export type NewSpeEquip = Insertable<item>;
export type SpeEquipUpdate = Updateable<item>;

export function speEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTospecial_equipment")
        .innerJoin("crystal", "_crystalTospecial_equipment.A", "crystal.itemId")
        .where("_crystalTospecial_equipment.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
    jsonArrayFrom(
      eb
        .selectFrom("mob")
        .innerJoin("drop_item","drop_item.dropById","mob.id")
        .where("drop_item.itemId", "=", id)
        .selectAll("mob")
        .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id"))),
    ).as("dropBy"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.speEquipId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findSpeEquipById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("special_equipment", "item.id", "special_equipment.itemId")
    .where("id", "=", id)
    .selectAll(["item", "special_equipment"])
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateSpeEquip(id: string, updateWith: SpeEquipUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createSpeEquip(newSpeEquip: NewSpeEquip) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newSpeEquip).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteSpeEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSpeEquip: SpeEquip = {
  name: {
    "zh-CN": "默认特殊装备",
    "zh-TW": "默认特殊裝備",
    en: "defaultSpeEquip",
    ja: "デフォルトの特殊装備",
  },
  id: "defaultSpeEquipId",
  modifiers: [],
  itemId: "defaultSpeEquipId",
  baseDef: 0,
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.SpeEquip,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistics.SpeEquip,
  statisticId: defaultStatistics.SpeEquip.id,
  defaultCrystals: []
};

// Dictionary
export const SpeEquipDic = (locale: Locale): ConvertToAllString<SpeEquip> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        modifiers: "属性",
        itemId: "所属道具ID",
        defaultCrystals: "附加锻晶",
        baseDef: "防御力",
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
      return {
        selfName: "Additional Equipment",
        name: "Name",
        id: "ID",
        modifiers: "Modifiers",
        itemId: "ItemId",
        defaultCrystals: "Default Crystals",
        baseDef: "Base Def",
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
