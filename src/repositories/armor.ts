import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { armor, DB } from "../../db/clientDB/kysely/kyesely";

export interface Armor extends DataType<armor, typeof findArmorById, typeof createArmor> {}

export function armorSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_armorTocrystal")
        .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
        .where("_armorTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

export async function findArmorById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("armor", "item.id", "armor.itemId")
    .where("id", "=", id)
    .selectAll(["item", "armor"])
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateArmor(id: string, updateWith: Armor["Update"]) {
  return await db.updateTable("armor").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function createArmor(newArmor: Armor["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const statistic = await trx
      .insertInto("statistic")
      .values({
        id: createId(),
        updatedAt: new Date(),
        createdAt: new Date(),
        usageTimestamps: [],
        viewTimestamps: [],
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const item = await trx
      .insertInto("item")
      .values({
        id: createId(),
        tableType: "armor",
        statisticId: statistic.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const armor = await trx
      .insertInto("armor")
      .values({
        ...newArmor,
        itemId: item.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return armor;
  });
}

export async function deleteArmor(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmor: Armor["MainTable"] = {
  name: "defaultArmor",
  id: "defaultArmorId",
  tableType: "armor",
  modifiers: [],
  itemId: "defaultArmorId",
  defaultCrystals: [],
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistics.Armor,
  statisticId: defaultStatistics.Armor.id,
};

// Dictionary
export const ArmorDic = (locale: Locale): ConvertToAllString<Armor["MainTable"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "防具装备",
        name: "名称",
        id: "ID",
        tableType: "",
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
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        name: "名称",
        id: "ID",
        tableType: "",
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
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
        statistic: StatisticDic(locale),
        statisticId: "統計信息ID",
      };
    case "en":
      return {
        selfName: "Armor",
        name: "Name",
        id: "ID",
        tableType: "",
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
        updatedByAccountId: "Updated By Account Id",
        createdByAccountId: "Created By Account Id",
        statistic: StatisticDic(locale),
        statisticId: "Statistic Id",
      };
    case "ja":
      return {
        selfName: "鎧",
        name: "名前",
        id: "ID",
        tableType: "",
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
        updatedByAccountId: "アカウントIDによって更新",
        createdByAccountId: "アカウントIDによって作成",
        statistic: StatisticDic(locale),
        statisticId: "統計ID",
      };
  }
};
