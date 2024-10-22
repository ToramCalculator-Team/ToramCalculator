import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultSkillEffect, skillEffectSubRelations } from "./skill_effect";
import { defaultSkillYield } from "./skill_yield";
import { defaultSkillCost } from "./skill_cost";

export type Skill = Awaited<ReturnType<typeof findSkillById>>;
export type NewSkill = Insertable<skill>;
export type SkillUpdate = Updateable<skill>;

export function skillSubRelations(eb: ExpressionBuilder<DB, "skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "skill.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonArrayFrom(
      eb
        .selectFrom("skill_effect")
        .where("id", "=", "skill.imageId")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    ).as("skillEffect"),
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
    const skill = await trx.insertInto("skill").values(newSkill).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values({
        ...defaultStatistics,
        skillId: skill.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const skillEffect = await trx
      .insertInto("skill_effect")
      .values({
        ...defaultSkillEffect,
        belongToskillId: skill.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const skillYield = await trx.insertInto("skill_yield").values({
      ...defaultSkillYield,
      skillEffectId: skillEffect.id,
    });

    const skillCost = await trx.insertInto("skill_cost").values({
      ...defaultSkillCost,
      skillEffectId: skillEffect.id,
    });
    return {
      ...skill,
      statistics,
      skillEffect: [
        {
          ...skillEffect,
          skillYield: [skillYield],
          skillCost: [skillCost],
        },
      ],
    };
  });
}

export async function deleteSkill(id: string) {
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkill: Skill = {
  id: "",
  name: "defaultSkill",
  skillDescription: "",
  skillTreeName: "BLADE",
  skillType: "ACTIVE_SKILL",
  weaponElementDependencyType: "EXTEND",
  element: "NO_ELEMENT",
  skillEffect: [defaultSkillEffect],
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
