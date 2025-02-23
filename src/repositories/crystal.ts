import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { CrystalType } from "./enums";

export type Crystal = ModifyKeys<Awaited<ReturnType<typeof findCrystalById>>, {
  crystalType: CrystalType;
}>;
export type NewCrystal = Insertable<item>;
export type CrystalUpdate = Updateable<item>;

export function crystalSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_FrontRelation")
        .innerJoin("crystal", "_FrontRelation.B", "crystal.itemId")
        .where("_FrontRelation.A", "=", id)
        .selectAll("crystal"),
    ).as("front"),
    jsonArrayFrom(
      eb

        .selectFrom("_BackRelation")
        .innerJoin("crystal", "_BackRelation.B", "crystal.itemId")
        .where("_BackRelation.A", "=", id)
        .selectAll("crystal"),
    ).as("back"),
  ];
}

// 锻晶卡片需要的详细数据
export async function findCrystalById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "item.id", "crystal.itemId")
    .where("id", "=", id)
    .selectAll(["item", "crystal"])
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 锻晶列表
export async function findCrystals() {
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "item.id", "crystal.itemId")
    .selectAll(["item", "crystal"])
    .select((eb) => crystalSubRelations(eb, eb.val("item.id")))
    .select((eb) => itemSubRelations(eb, eb.val("item.id")))
    .execute() as Crystal[];
}

// 锻晶表单
export async function createCrystal(newCrystal: NewCrystal) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newCrystal).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}
export async function updateCrystal(id: string, updateWith: CrystalUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}
export async function deleteCrystalById(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCrystal: Record<CrystalType, Crystal> = {
  NormalCrystal: {
    name: "defaultNormalCrystal",
    id: "defaultNormalCrystalId",
    modifiers: [],
    itemId: "defaultNormalCrystalId",
    front: [],
    back: [],
    crystalType: "NormalCrystal",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.NormalCrystal,
    statisticId: defaultStatistics.NormalCrystal.id,
  },
  WeaponCrystal: {
    name: "defaultWeaponCrystal",
    id: "defaultWeaponCrystallId",
    modifiers: [],
    itemId: "defaultWeaponCrystalId",
    front: [],
    back: [],
    crystalType: "WeaponCrystal",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.WeaponCrystal,
    statisticId: defaultStatistics.WeaponCrystal.id,
  },
  ArmorCrystal: {
    name: "defaultArmorCrystal",
    id: "defaultArmorCrystalId",
    modifiers: [],
    itemId: "defaultArmorCrystalId",
    front: [],
    back: [],
    crystalType: "ArmorCrystal",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.ArmorCrystal,
    statisticId: defaultStatistics.ArmorCrystal.id,
  },
  AddEquipCrystal: {
    name: "defaultAddEquipCrystal",
    id: "defaultAddEquipCrystalId",
    modifiers: [],
    itemId: "defaultAddEquipCrystalId",
    front: [],
    back: [],
    crystalType: "AddEquipCrystal",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.AddEquipCrystal,
    statisticId: defaultStatistics.AddEquipCrystal.id,
  },
  SpecialCrystal: {
    name: "defaultSpecialCrystal",
    id: "defaultSpecialCrystalId",
    modifiers: [],
    itemId: "defaultSpecialCrystalId",
    front: [],
    back: [],
    crystalType: "SpecialCrystal",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.SpecialCrystal,
    statisticId: defaultStatistics.SpecialCrystal.id,
  }
};


// Dictionary
export const CrystalDic = (locale: Locale): ConvertToAllString<Crystal> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        modifiers: "属性",
        itemId: "所属道具ID",
        front: "前置锻晶",
        back: "可用强化锻晶",
        crystalType: "锻晶类型",
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
        selfName: "追加裝備",
        name: "名称",
        id: "ID",
        modifiers: "屬性",
        itemId: "所屬道具ID",
        front: "前置鑄晶",
        back: "可用強化鑄晶",
        crystalType: "鑄晶類型",
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
        selfName: "Additional Equipment",
        name: "Name",
        id: "ID",
        modifiers: "Modifiers",
        itemId: "ItemId",
        front: "Front Crystals",
        back: "Back Crystals",
        crystalType: "Crystal Type",
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
        selfName: "追加装備",
        name: "名前",
        id: "ID",
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        front: "前置鑄晶",
        back: "可用強化鑄晶",
        crystalType: "鑄晶種類",
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
