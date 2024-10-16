import { Insertable, Updateable } from "kysely";
import { db } from "./database";
import { skill_cost } from "~/repositories/db/types";
import { defaultImage } from "./image";

export type SkillCost = Awaited<ReturnType<typeof findSkillCostById>>;
export type NewSkillCost = Insertable<skill_cost>;
export type SkillCostUpdate = Updateable<skill_cost>;

export async function findSkillCostById(id: string) {
  return await db
    .selectFrom("skill_cost")
    .where("id", "=", id)
    .selectAll("skill_cost")
    .executeTakeFirstOrThrow();
}

export async function updateSkillCost(id: string, updateWith: SkillCostUpdate) {
  return await db.updateTable("skill_cost").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSkillCost(newSkillCost: NewSkillCost) {
  return await db.insertInto("image").values(defaultImage).returningAll().executeTakeFirstOrThrow();
}

export async function deleteSkillCost(id: string) {
  return await db.deleteFrom("skill_cost").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkillCost: SkillCost = {
  id: "defaultSkillCost",
  name: "defaultSkillCost",
  costFormula: "",
  skillEffectId: "defaultSkillEffect",
};