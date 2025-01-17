import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, weapon_enchantment_attributes } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultUser } from "./user";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic, statisticSubRelations } from "./statistic";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type WeaponEncAttributes = Awaited<ReturnType<typeof findWeaponEncAttributesById>>;
export type NewWeaponEncAttributes = Insertable<weapon_enchantment_attributes>;
export type WeaponEncAttributesUpdate = Updateable<weapon_enchantment_attributes>;

export function weaponEncAttrsSubRelations(
  eb: ExpressionBuilder<DB, "weapon_enchantment_attributes">,
  id: Expression<string>,
) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .where("statistic.id", "=", "weapon_enchantment_attributes.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

export async function findWeaponEncAttributesById(id: string) {
  return await db
    .selectFrom("weapon_enchantment_attributes")
    .where("id", "=", id)
    .selectAll("weapon_enchantment_attributes")
    .select((eb) => weaponEncAttrsSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateWeaponEncAttributes(id: string, updateWith: WeaponEncAttributesUpdate) {
  return await db
    .updateTable("weapon_enchantment_attributes")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createWeaponEncAttributes(newWeaponEncAttributes: NewWeaponEncAttributes) {
  return await db.transaction().execute(async (trx) => {
    const weapon_enchantment_attributes = await trx
      .insertInto("weapon_enchantment_attributes")
      .values(newWeaponEncAttributes)
      .returningAll()
      .executeTakeFirstOrThrow();
    return weapon_enchantment_attributes;
  });
}

export async function deleteWeaponEncAttributes(id: string) {
  return await db.deleteFrom("weapon_enchantment_attributes").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultWeaponEncAttributes: WeaponEncAttributes = {
  id: "defaultWeaponEncAttributes",
  name: "默认武器附魔",
  modifiers: [],
  details: "",
  dataSources: "",
  statistic: defaultStatistics.WeaponEncAttrs,
  statisticId: defaultStatistics.WeaponEncAttrs.id,
  updatedByAccountId: defaultUser.id,
  createdByAccountId: defaultUser.id,
};

// Dictionary
export const WeaponEncAttrDic = (locale: Locale): ConvertToAllString<WeaponEncAttributes> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "武器附魔",
        id: "ID",
        name: "名称",
        modifiers: "词条",
        details: "额外说明",
        dataSources: "数据来源",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
      };
    case "zh-TW":
      return {
        selfName: "武器附魔",
        id: "ID",
        name: "名称",
        modifiers: "語項",
        details: "額外說明",
        dataSources: "資料來源",
        statistic: StatisticDic(locale),
        statisticId: "統計資訊ID",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
      }
    case "en":
      return {
        selfName: "Weapon Enchantment",
        id: "ID",
        name: "Name",
        modifiers: "Modifiers",
        details: "Details",
        dataSources: "Data Sources",
        statistic: StatisticDic(locale),
        statisticId: "Statistic ID",
        updatedByAccountId: "Updated By Account ID",
        createdByAccountId: "Created By Account ID",
      }
    case "ja":
      return {
        selfName: "武器附魔",
        id: "ID",
        name: "名前",
        modifiers: "修飾子",
        details: "詳細",
        dataSources: "データソース",
        statistic: StatisticDic(locale),
        statisticId: "統計情報ID",
        updatedByAccountId: "更新者アカウントID",
        createdByAccountId: "作成者アカウントID",
      };
  }
};
