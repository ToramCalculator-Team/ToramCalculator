import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultStatistics, StatisticDic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultSkillEffect, SkillEffectDic, skillEffectSubRelations } from "./skillEffect";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { ElementType, SkillChargingType, SkillDistanceResistType, SkillTreeType, I18nString } from "./enums";
import { Locale } from "~/locales/i18n";

export type Skill = ModifyKeys<
  Awaited<ReturnType<typeof findSkillById>>,
  {
    name: I18nString;
    treeName: SkillTreeType;
    chargingType: SkillChargingType;
    distanceResist: SkillDistanceResistType;
    element: ElementType;
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
        .where("id", "=", "skill.imageId")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
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

export async function updateSkill(id: string, updateWith: SkillUpdate) {
  return await db.updateTable("skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSkill(newSkill: NewSkill) {
  return await db.transaction().execute(async (trx) => {
    const statistic = await trx
      .insertInto("statistic")
      .values({
        ...defaultStatistics,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const skill = await trx
      .insertInto("skill")
      .values({
        ...newSkill,
        statisticId: statistic.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const effects = await trx
      .insertInto("skill_effect")
      .values({
        ...defaultSkillEffect,
        belongToskillId: skill.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...skill,
      statistic,
      effects,
    };
  });
}

export async function deleteSkill(id: string) {
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkill: Skill = {
  id: "",
  name: {
    "zh-CN": "默认技能",
    "zh-TW": "預設技能",
    en: "defaultSkill",
    ja: "デフォルトスキル",
  },
  treeName: "MagicSkill",
  posX: 0,
  posY: 0,
  tier: 0,
  isPassive: false,
  chargingType: "Reservoir",
  distanceResist: "None",
  element: "Normal",
  effects: [defaultSkillEffect],
  dataSources: "",
  details: "",

  updatedByAccountId: "",
  createdByAccountId: "",
  statistic: defaultStatistics,
  statisticId: "",
};

export const SkillDic = (locale: Locale): ConvertToAllString<Skill> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "技能",
        treeName: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        isPassive: "是被动技能吗",
        chargingType: "读条类型",
        distanceResist: "距离威力抗性",
        element: "自身元素属性",
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
        treeName: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        isPassive: "是被动技能吗",
        chargingType: "读条类型",
        distanceResist: "距离威力抗性",
        element: "自身元素属性",
        effects: "技能效果",
        dataSources: "数据来源",
        details: "额外说明",

        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "技能"
      };
    case "en":
      return {
        id: "ID",
        name: "技能",
        treeName: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        isPassive: "是被动技能吗",
        chargingType: "读条类型",
        distanceResist: "距离威力抗性",
        element: "自身元素属性",
        effects: "技能效果",
        dataSources: "数据来源",
        details: "额外说明",

        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "技能"
      };
    case "ja":
      return {
        id: "ID",
        name: "技能",
        treeName: "技能树",
        posX: "水平坐标",
        posY: "垂直坐标",
        tier: "位阶",
        isPassive: "是被动技能吗",
        chargingType: "读条类型",
        distanceResist: "距离威力抗性",
        element: "自身元素属性",
        effects: "技能效果",
        dataSources: "数据来源",
        details: "额外说明",

        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
        selfName: "技能"
      };
  }
};
