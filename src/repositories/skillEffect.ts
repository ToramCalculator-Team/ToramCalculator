import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill_effect } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { ModifyKeys } from "./untils";
import { ArmorType, WeaponType } from "./enums";

export type SkillEffect = ModifyKeys<Awaited<ReturnType<typeof findSkillEffectById>>, {
  mainHand: WeaponType | "Empty"
  subHand: WeaponType | "Empty"
  armor: ArmorType | "Empty"
}>;
export type NewSkillEffect = Insertable<skill_effect>;
export type SkillEffectUpdate = Updateable<skill_effect>;

export function skillEffectSubRelations(eb: ExpressionBuilder<DB, "skill_effect">, id: Expression<string>) {
  return [];
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
    return skill_effect;
  });
}

export async function deleteSkillEffect(id: string) {
  return await db.deleteFrom("skill_effect").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkillEffect: SkillEffect = {
  id: "defaultSkillEffectId",
  mainHand: "Empty",
  subHand: "Empty",
  armor: "Normal",
  description: "",
  motionFixed: "",
  motionModified: "",
  chantingFixed: "",
  chantingModified: "",
  reservoirFixed: "",
  reservoirModified: "",
  startupFrames: "",
  cost: "",
  belongToskillId: "",
  details: {},
};
