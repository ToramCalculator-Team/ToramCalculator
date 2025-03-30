import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill } from "~/../db/clientDB/kysely/kyesely";
import { defaultStatistics, insertStatistic, StatisticDic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import {
  createSkillEffect,
  defaultSkillEffect,
  SkillEffect,
  SkillEffectDic,
  skillEffectSubRelations,
} from "./skillEffect";
import { ConvertToAllString, DataType, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";

export interface Skill extends DataType<skill, typeof findSkills, typeof createSkill> {}

export function skillSubRelations(eb: ExpressionBuilder<DB, "skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "skill.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("skill_effect")
        .whereRef("skill_effect.belongToskillId", "=", "skill.id")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    ).as("effects"),
  ];
}

export async function findSkillById(id: string) {
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    .select((eb) => skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSkills() {
  return await db
    .selectFrom("skill")
    .selectAll("skill")
    .execute();
}

export async function updateSkill(id: string, updateWith: Skill["Update"]) {
  return await db.updateTable("skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkill(trx: Transaction<DB>, newSkill: Skill["Insert"]) {
  const statistic = await insertStatistic(trx);
  const skill = await trx
    .insertInto("skill")
    .values({
      ...newSkill,
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return skill;
}

export async function createSkill(newSkill: { skill: Skill["Insert"]; skillEffects: SkillEffect["Insert"][] }) {
  return await db.transaction().execute(async (trx) => {
    const skill = await insertSkill(trx, newSkill.skill);
    const skillEffects = await Promise.all(
      newSkill.skillEffects.map((skillEffect) => createSkillEffect({ ...skillEffect, belongToskillId: skill.id })),
    );
    return {
      skill,
      skillEffects,
    };
  });
}

export async function deleteSkill(id: string) {
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkill: Skill["Insert"] = {
  id: "defaultSkillId",
  name: "defaultSkill",
  treeType: "MagicSkill",
  posX: 0,
  posY: 0,
  tier: 0,
  chargingType: "Chanting",
  distanceType: "Both",
  targetType: "Enemy",
  isPassive: false,
  dataSources: "",
  details: "",
  updatedByAccountId: "",
  createdByAccountId: "",
  statisticId: defaultStatistics.Skill.id,
};

export const SkillDic = (locale: Locale): ConvertToAllString<Skill["MainForm"]["skill"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "技能",
        treeType: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        targetType: "目标类型",
        chargingType: "施法动作类型",
        distanceType: "距离威力类型",
        isPassive: "是被动技能吗",
        dataSources: "数据来源",
        details: "额外说明",
        updatedByAccountId: "",
        createdByAccountId: "",
        statisticId: "",
        selfName: "技能",
      };
    case "zh-TW":
      return {
        id: "ID",
        name: "技能",
        treeType: "技能樹",
        posX: "水平坐標",
        posY: "垂直坐標",
        tier: "位階",
        targetType: "目標類型",
        chargingType: "施法動作類型",
        distanceType: "距離威力類型",
        isPassive: "是被動技能嗎",
        dataSources: "資料來源",
        details: "額外說明",
        updatedByAccountId: "",
        createdByAccountId: "",
        statisticId: "",
        selfName: "技能",
      };
    case "en":
      return {
        id: "ID",
        name: "Skill",
        treeType: "Skill Tree",
        posX: "Horizontal Coordinate",
        posY: "Vertical Coordinate",
        tier: "Tier",
        targetType: "Target type",
        chargingType: "Charging type",
        distanceType: "Distance type",
        isPassive: "Is Passive Skill",
        dataSources: "Data Sources",
        details: "Details",
        updatedByAccountId: "",
        createdByAccountId: "",
        statisticId: "",
        selfName: "Skill",
      };
    case "ja":
      return {
        id: "ID",
        name: "スキル",
        treeType: "スキルツリー",
        posX: "水平座標",
        posY: "垂直座標",
        tier: "位階",
        targetType: "対象タイプ",
        chargingType: "施法アニメーションタイプ",
        distanceType: "距離威力タイプ",
        isPassive: "パッシブスキルか",
        dataSources: "データソース",
        details: "詳細",
        updatedByAccountId: "",
        createdByAccountId: "",
        statisticId: "",
        selfName: "スキル",
      };
  }
};
