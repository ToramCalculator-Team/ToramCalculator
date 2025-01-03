import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, mob } from "~/../db/clientDB/generated/kysely/kyesely";
import { createStatistic, defaultStatistic, insertStatistic, StatisticDic, statisticSubRelations } from "./statistic";
import { defaultImage, ImageDic } from "./image";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { ElementType, MobType, I18nString } from "./enums";

export type Mob = ModifyKeys<
  Awaited<ReturnType<typeof findMobById>>,
  {
    name: I18nString;
    mobType: MobType;
    element: ElementType;
  }
>;
export type NewMob = Insertable<mob>;
export type MobUpdate = Updateable<mob>;

export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_mobTozone")
        .innerJoin("zone", "_mobTozone.B", "zone.id")
        .where("_mobTozone.A", "=", id)
        .select("zone.name"),
    ).as("belongToZones"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("item", "item.id", "drop_item.itemId")
        .innerJoin("weapon", "item.id", "weapon.itemId")
        .innerJoin("armor", "item.id", "armor.itemId")
        .innerJoin("additional_equipment", "item.id", "additional_equipment.itemId")
        .innerJoin("special_equipment", "item.id", "special_equipment.itemId")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("consumable", "item.id", "consumable.itemId")
        .innerJoin("material", "item.id", "material.itemId")
        .where("drop_item.dropById", "=", id)
        .select([
          "weapon.name",
          "armor.name",
          "additional_equipment.name",
          "special_equipment.name",
          "crystal.name",
          "consumable.name",
          "material.name",
        ]),
    ).as("dropItems"),
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "mob.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
    jsonObjectFrom(eb.selectFrom("image").whereRef("id", "=", "mob.imageId").selectAll("image"))
      .$notNull()
      .as("image"),
  ];
}

export async function findMobById(id: string) {
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMobs() {
  return (await db
    .selectFrom("mob")
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val("mob.id")))
    .execute()) as Mob[];
}

export async function updateMob(id: string, updateWith: MobUpdate) {
  return (await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst()) as Mob;
}

export async function insertMob(trx: Transaction<DB>, newMob: NewMob) {
  const statistic = await insertStatistic(trx, defaultStatistic);
  const image = await trx.insertInto("image").values(defaultImage).returningAll().executeTakeFirstOrThrow();
  const mob = await trx
    .insertInto("mob")
    .values({
      ...newMob,
      statisticId: statistic.id,
      imageId: image.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return mob as Mob;
}

export async function createMob(newMob: NewMob) {
  return await db.transaction().execute(async (trx) => {
    return await insertMob(trx, newMob);
  });
}

export async function deleteMob(id: string) {
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob = {
  id: "defaultMobId",
  name: {
    "zh-CN": "默认怪物（缺省值）",
    "zh-TW": "默认怪物（缺省值）",
    en: "defaultMobName",
    ja: "デフォルトのモブ",
  },
  mobType: "Boss",
  captureable: false,
  actions: [],
  baseLv: 0,
  experience: 0,
  element: "Normal",
  radius: 0,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  partsExperience: 0,
  belongToZones: [],
  dropItems: [],
  details: "defaultExtraDetails",
  dataSources: "defaultDataSources",
  statisticId: defaultStatistic.id,
  statistic: defaultStatistic,
  imageId: defaultImage.id,
  image: defaultImage,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};

// Dictionary
export const MobDic = (locale: Locale): ConvertToAllString<Mob> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "怪物",
        name: "名称",
        id: "ID",
        mobType: "怪物类型",
        captureable: "是否可捕获",
        actions: "行为",
        baseLv: "基础等级",
        experience: "经验",
        element: "元素属性",
        radius: "半径",
        maxhp: "最大生命值",
        physicalDefense: "物理防御",
        physicalResistance: "物理抗性",
        magicalDefense: "魔法防御",
        magicalResistance: "魔法抗性",
        criticalResistance: "暴击抗性",
        avoidance: "回避",
        dodge: "闪躲率",
        block: "格挡率",
        normalAttackResistanceModifier: "一般伤害惯性变动率",
        physicalAttackResistanceModifier: "物理伤害惯性变动率",
        magicalAttackResistanceModifier: "魔法伤害惯性变动率",
        partsExperience: "部件经验",
        belongToZones: "所属区域",
        dropItems: "掉落道具",
        details: "额外说明",
        dataSources: "数据来源",
        statisticId: "统计信息ID",
        statistic: StatisticDic(locale),
        imageId: "图片ID",
        image: ImageDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
      };
    case "zh-TW":
      return {
        selfName: "怪物",
        name: "名称",
        id: "ID",
        mobType: "怪物類型",
        captureable: "是否可捕獲",
        actions: "行為",
        baseLv: "基礎等級",
        experience: "經驗",
        element: "元素屬性",
        radius: "半徑",
        maxhp: "最大生命值",
        physicalDefense: "物理防禦",
        physicalResistance: "物理抗性",
        magicalDefense: "魔法防禦",
        magicalResistance: "魔法抗性",
        criticalResistance: "暴擊抗性",
        avoidance: "回避",
        dodge: "閃避率",
        block: "格擋率",
        normalAttackResistanceModifier: "一般傷害惡性變動率",
        physicalAttackResistanceModifier: "物理傷害惡性變動率",
        magicalAttackResistanceModifier: "魔法傷害惡性變動率",
        partsExperience: "部件經驗",
        belongToZones: "所屬區域",
        dropItems: "掉落道具",
        details: "額外說明",
        dataSources: "數據來源",
        statisticId: "統計信息ID",
        statistic: StatisticDic(locale),
        imageId: "圖片ID",
        image: ImageDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
      };
    case "en":
      return {
        selfName: "Mob",
        name: "Name",
        id: "ID",
        mobType: "Mob Type",
        captureable: "Captureable",
        actions: "Actions",
        baseLv: "Base Level",
        experience: "Experience",
        element: "Element",
        radius: "Radius",
        maxhp: "Max HP",
        physicalDefense: "Physical Defense",
        physicalResistance: "Physical Resistance",
        magicalDefense: "Magical Defense",
        magicalResistance: "Magical Resistance",
        criticalResistance: "Critical Resistance",
        avoidance: "Avoidance",
        dodge: "Dodge",
        block: "Block",
        normalAttackResistanceModifier: "Normal Attack Resistance Modifier",
        physicalAttackResistanceModifier: "Physical Attack Resistance Modifier",
        magicalAttackResistanceModifier: "Magical Attack Resistance Modifier",
        partsExperience: "Parts Experience",
        belongToZones: "Belong To Zones",
        dropItems: "Drop Items",
        details: "Details",
        dataSources: "Data Sources",
        statisticId: "Statistic ID",
        statistic: StatisticDic(locale),
        imageId: "Image ID",
        image: ImageDic(locale),
        updatedByAccountId: "Updated By Account ID",
        createdByAccountId: "Created By Account ID",
      };
    case "ja":
      return {
        selfName: "モブ",
        name: "名前",
        id: "ID",
        mobType: "モブタイプ",
        captureable: "捕獲可能",
        actions: "行動",
        baseLv: "基本レベル",
        experience: "経験",
        element: "要素",
        radius: "半径",
        maxhp: "最大HP",
        physicalDefense: "物理的防御",
        physicalResistance: "物理的抵抗",
        magicalDefense: "魔法防御",
        magicalResistance: "魔法耐性",
        criticalResistance: "クリティカル抵抗",
        avoidance: "避ける",
        dodge: "かわす",
        block: "ブロック率",
        normalAttackResistanceModifier: "一般攻撃耐性変動率",
        physicalAttackResistanceModifier: "物理攻撃耐性変動率",
        magicalAttackResistanceModifier: "魔法攻撃耐性変動率",
        partsExperience: "部品経験",
        belongToZones: "所属ゾーン",
        dropItems: "ドロップアイテム",
        details: "追加情報",
        dataSources: "データソース",
        statisticId: "統計情報ID",
        statistic: StatisticDic(locale),
        imageId: "画像ID",
        image: ImageDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "作成者ID",
      };
  }
};
