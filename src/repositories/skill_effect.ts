import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill_effect } from "~/repositories/db/types";
import { defaultSkillYield } from "./skill_yield";
import { defaultSkillCost } from "./skill_cost";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export type SkillEffect = Awaited<ReturnType<typeof findSkillEffectById>>;
export type NewSkillEffect = Insertable<skill_effect>;
export type SkillEffectUpdate = Updateable<skill_effect>;

export function skillEffectSubRelations(eb: ExpressionBuilder<DB, "skill_effect">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("skill_yield").whereRef("skillEffectId", "=", "skill_effect.id").selectAll("skill_yield"),
    ).as("skillYield"),
    jsonArrayFrom(
      eb.selectFrom("skill_cost").where("skillEffectId", "=", "skill_effect.id").selectAll("skill_cost"),
    ).as("skillCost"),
  ];
}

export async function findSkillEffectById(id: string) {
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .select((eb) => skillEffectSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateSkillEffect(id: string, updateWith: SkillEffectUpdate) {
  return await db.updateTable("skill_effect").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSkillEffect(newSkillEffect: NewSkillEffect) {
  return await db.transaction().execute(async (trx) => {
    const skill_effect = await trx
      .insertInto("skill_effect")
      .values(newSkillEffect)
      .returningAll()
      .executeTakeFirstOrThrow();
    const skill_yield = await trx
      .insertInto("skill_yield")
      .values({
        ...defaultSkillYield,
        skillEffectId: skill_effect.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const skill_cost = await trx
      .insertInto("skill_cost")
      .values({
        ...defaultSkillCost,
        skillEffectId: skill_effect.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...skill_effect, skillYield: [skill_yield], skillCost: [skill_cost] };
  });
}

export async function deleteSkillEffect(id: string) {
  return await db.deleteFrom("skill_effect").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkillEffect: SkillEffect = {
  id: "",
  condition: "",
  description: "",
  actionBaseDurationFormula: "13",
  actionModifiableDurationFormula: "48",
  skillExtraActionType: "None",
  chargingBaseDurationFormula: "0",
  chargingModifiableDurationFormula: "0",
  chantingBaseDurationFormula: "0",
  chantingModifiableDurationFormula: "0",
  skillStartupFramesFormula: "0",
  skillCost: [defaultSkillCost],
  skillYield: [defaultSkillYield],
  belongToskillId: "",
};
