import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultSkillEffect, skillEffectSubRelations } from "./skillEffect";
import { ModifyKeys } from "./untils";
import { ElementType, SkillChargingType, SkillDistanceResistType, SkillTreeType, I18nString } from "./enums";

export type Skill = ModifyKeys<Awaited<ReturnType<typeof findSkillById>>, {
  name: I18nString;
  treeName: SkillTreeType;
  chargingType: SkillChargingType;
  distanceResist: SkillDistanceResistType;
  element: ElementType;
}>;
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
    ).$notNull().as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("skill_effect")
        .where("id", "=", "skill.imageId")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("skillEffect"),
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
        ...defaultStatistic,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const skill = await trx.insertInto("skill").values({
      ...newSkill,
      statisticId: statistic.id,
    }).returningAll().executeTakeFirstOrThrow();

    const skillEffect = await trx
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
      skillEffect
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
  skillEffect: [defaultSkillEffect],
  dataSources: "",
  details: "",

  updatedByAccountId: "",
  createdByAccountId: "",
  statistic: defaultStatistic,
  statisticId: "",
};
