import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill } from "~/../db/clientDB/kysely/kyesely";
import { defaultStatistics, insertStatistic, StatisticDic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultSkillEffect, SkillEffectDic, skillEffectSubRelations } from "./skillEffect";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { type Enums } from "./enums";
import { Locale } from "~/locales/i18n";

export type Skill = ModifyKeys<
  Awaited<ReturnType<typeof findSkillById>>,
  {
    treeType: Enums["SkillTreeType"];
  }
>;
export type NewSkill = Insertable<skill>;
export type SkillUpdate = Updateable<skill>;

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
    )
      .as("effects"),
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
  return (await db
    .selectFrom("skill")
    .selectAll("skill")
    .select((eb) => skillSubRelations(eb, eb.val("skill.id")))
    .execute()) as Skill[];
}

export async function updateSkill(id: string, updateWith: SkillUpdate) {
  return await db.updateTable("skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkill(trx: Transaction<DB>, newSkill: NewSkill) {
    const statistic = await insertStatistic(trx, defaultStatistics.Skill);
    const skill = await trx
      .insertInto('skill')
      .values({
        ...newSkill,
        statisticId: statistic.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  
    return skill as Skill;
}

export async function createSkill(newSkill: NewSkill) {
  return await db.transaction().execute(async (trx) => {
      return await insertSkill(trx, newSkill);
    });
}

export async function deleteSkill(id: string) {
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkill: Skill = {
  id: "defaultSkillId",
  name: "defaultSkill",
  treeType: "MagicSkill",
  posX: 0,
  posY: 0,
  tier: 0,
  isPassive: false,
  effects: [],
  dataSources: "",
  details: "",
  updatedByAccountId: "",
  createdByAccountId: "",
  statistic: defaultStatistics.Skill,
  statisticId: defaultStatistics.Skill.id,
};

export const SkillDic = (locale: Locale): ConvertToAllString<Skill> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "技能",
        treeType: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        isPassive: "是被动技能吗",
        effects: "技能效果",
        dataSources: "数据来源",
        details: "额外说明",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "技能"
      };
    case "zh-TW":
      return {
        id: "ID",
        name: "技能",
        treeType: "技能樹",
        posX: "水平坐標",
        posY: "垂直坐標",
        tier: "位階",
        isPassive: "是被動技能嗎",
        effects: "技能效果",
        dataSources: "資料來源",
        details: "額外說明",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "技能"
      };
    case "en":
      return {
        id: "ID",
        name: "Skill",
        treeType: "Skill Tree",
        posX: "Horizontal Coordinate",
        posY: "Vertical Coordinate",
        tier: "Tier",
        isPassive: "Is Passive Skill",
        effects: "Skill Effects",
        dataSources: "Data Sources",
        details: "Details",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "Skill"
      };
    case "ja":
      return {
        id: "ID",
        name: "スキル",
        treeType: "スキルツリー",
        posX: "水平座標",
        posY: "垂直座標",
        tier: "位階",
        isPassive: "パッシブスキルか",
        effects: "スキルエフェクト",
        dataSources: "データソース",
        details: "詳細",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "スキル"
      };
  }
};
