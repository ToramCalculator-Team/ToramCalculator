import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { armor_enchantment_attributes, DB } from "~/../db/clientDB/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic, statisticSubRelations } from "./statistic";
import { defaultAccount } from "./account";
import { ConvertToAllString } from "./untils";
import { Locale } from "~/locales/i18n";

export type ArmorEncAttributes = Awaited<ReturnType<typeof findArmorEncAttributesById>>;
export type NewArmorEncAttributes = Insertable<armor_enchantment_attributes>;
export type ArmorEncAttributesUpdate = Updateable<armor_enchantment_attributes>;

export function armorEncAttrsSubRelations(eb: ExpressionBuilder<DB, "armor_enchantment_attributes">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .where("statistic.id", "=", "armor_enchantment_attributes.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("statistic")
  ];
}

export async function findArmorEncAttributesById(id: string) {
  return await db
    .selectFrom("armor_enchantment_attributes")
    .where("id", "=", id)
    .selectAll("armor_enchantment_attributes")
    .select((eb) => armorEncAttrsSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateArmorEncAttributes(id: string, updateWith: ArmorEncAttributesUpdate) {
  return await db
    .updateTable("armor_enchantment_attributes")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createArmorEncAttributes(newArmorEncAttributes: NewArmorEncAttributes) {
  return await db.transaction().execute(async (trx) => {
    const armor_enchantment_attributes = await trx
      .insertInto("armor_enchantment_attributes")
      .values(newArmorEncAttributes)
      .returningAll()
      .executeTakeFirstOrThrow();
    return armor_enchantment_attributes;
  });
}

export async function deleteArmorEncAttributes(id: string) {
  return await db.deleteFrom("armor_enchantment_attributes").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmorEncAttributes: ArmorEncAttributes = {
  id: "defaultArmorEncAttributes",
  name: "默认防具附魔",
  modifiers: [],
  details: "",
  dataSources: "",
  statistic: defaultStatistics.ArmorEncAttrs,
  statisticId: defaultStatistics.ArmorEncAttrs.id,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};

// Dictionary
export const ArmorEncAttributesDic = (locale: Locale): ConvertToAllString<ArmorEncAttributes> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "防具装备",
        name: "名称",
        id: "ID",
        modifiers: "附魔步骤",
        dataSources: "数据来源",
        details: "额外说明",
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
        modifiers: "附魔步骤",
        dataSources: "資料來源",
        details: "額外說明",
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
        modifiers: "Steps",
        dataSources: "Data Sources",
        details: "Details",
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
        modifiers: "ステップ",
        dataSources: "データソース",
        details: "追加詳細",
        updatedByAccountId: "アカウントIDによって更新",
        createdByAccountId: "アカウントIDによって作成",
        statistic: StatisticDic(locale),
        statisticId: "統計ID",
      };
  }
};

