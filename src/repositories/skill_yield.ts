import { Insertable, Updateable } from "kysely";
import { db } from "./database";
import { skill_yield } from "~/repositories/db/types";

export type SkillYield = Awaited<ReturnType<typeof findSkillYieldById>>;
export type NewSkillYield = Insertable<skill_yield>;
export type SkillYieldUpdate = Updateable<skill_yield>;

export async function findSkillYieldById(id: string) {
  return await db
    .selectFrom("skill_yield")
    .where("id", "=", id)
    .selectAll("skill_yield")
    .executeTakeFirstOrThrow();
}

export async function updateSkillYield(id: string, updateWith: SkillYieldUpdate) {
  return await db.updateTable("skill_yield").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSkillYield(newSkillYield: NewSkillYield) {
  return await db.insertInto("skill_yield").values(newSkillYield).returningAll().executeTakeFirstOrThrow();
}

export async function deleteSkillYield(id: string) {
  return await db.deleteFrom("skill_yield").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkillYield: SkillYield = {
  id: "defaultSkillYieldId",
  name: "defaultSkillYielfName",
  yieldType: "ImmediateEffect",
  mutationTimingFormula: "",
  yieldFormula: "",
  skillEffectId: "defaultSkillEffect",
};