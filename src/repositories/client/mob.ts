import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { DB, mob } from "~/../db/clientDB/kysely/kyesely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Mob extends DataType<mob> {
  MainTable: Awaited<ReturnType<typeof findMobs>>[number];
  MainForm: mob;
}

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
        .where("drop_item.dropById", "=", id)
        .selectAll("item"),
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

export async function findMobsLike(searchString: string) {
  const results = await db.selectFrom("mob").where("name", "like", `%${searchString}%`).selectAll().execute();
  return results;
}

export async function findMobs() {
  const result = await db.selectFrom("mob").selectAll("mob").execute();
  return result;
}

export async function updateMob(id: string, updateWith: Mob["Update"]) {
  return await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMob(newMob: Mob["Insert"]) {
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
    const mob = await trx
      .insertInto("mob")
      .values({
        ...newMob,
        statisticId: statistic.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mob;
  });
}

export async function deleteMob(id: string) {
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob["Select"] = {
  id: "",
  name: "",
  type: "Boss",
  captureable: false,
  actions: [],
  baseLv: 0,
  experience: 0,
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
  initialElement: "Normal",
  details: "",
  dataSources: "",
  statisticId: "",
  updatedByAccountId: "",
  createdByAccountId: "",
};

// Dictionary
export const MobDic = (locale: Locale): ConvertToAllString<Mob["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "怪物",
        name: "名称",
        id: "ID",
        type: "怪物类型",
        captureable: "是否可捕获",
        actions: "行为",
        baseLv: "基础等级",
        experience: "经验",
        initialElement: "元素属性",
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
        details: "额外说明",
        dataSources: "数据来源",
        statisticId: "统计信息ID",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
      };
    case "zh-TW":
      return {
        selfName: "怪物",
        name: "名称",
        id: "ID",
        type: "怪物類型",
        captureable: "是否可捕獲",
        actions: "行為",
        baseLv: "基礎等級",
        experience: "經驗",
        initialElement: "元素屬性",
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
        details: "額外說明",
        dataSources: "數據來源",
        statisticId: "統計信息ID",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
      };
    case "en":
      return {
        selfName: "Mob",
        name: "Name",
        id: "ID",
        type: "Mob Type",
        captureable: "Captureable",
        actions: "Actions",
        baseLv: "Base Level",
        experience: "Experience",
        initialElement: "Element Type",
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
        details: "Details",
        dataSources: "Data Sources",
        statisticId: "Statistic ID",
        updatedByAccountId: "Updated By Account ID",
        createdByAccountId: "Created By Account ID",
      };
    case "ja":
      return {
        selfName: "モブ",
        name: "名前",
        id: "ID",
        type: "モブタイプ",
        captureable: "捕獲可能",
        actions: "行動",
        baseLv: "基本レベル",
        experience: "経験",
        initialElement: "要素",
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
        details: "追加情報",
        dataSources: "データソース",
        statisticId: "統計情報ID",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "作成者ID",
      };
  }
};
