import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, skill_effect } from "../../db/generated/kysely/kyesely";
import { DataType } from "./untils";

export interface SkillEffect extends DataType<skill_effect> {
  MainTable: Awaited<ReturnType<typeof findSkillEffects>>[number];
  MainForm: skill_effect;
}

export function skillEffectSubRelations(eb: ExpressionBuilder<DB, "skill_effect">, id: Expression<string>) {
  return [];
}

export async function findSkillEffectById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .select((eb) => skillEffectSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSkillEffects() {
  const db = await getDB();
  return await db.selectFrom("skill_effect").selectAll("skill_effect").execute();
}

export async function updateSkillEffect(id: string, updateWith: SkillEffect["Update"]) {
  const db = await getDB();
  return await db.updateTable("skill_effect").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkillEffect(newSkillEffect: SkillEffect["Insert"]) {
  const db = await getDB();
  return await db.insertInto("skill_effect").values(newSkillEffect).returningAll().executeTakeFirstOrThrow();
}

export async function createSkillEffect(newSkillEffect: SkillEffect["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const skill_effect = await insertSkillEffect(newSkillEffect);
    return skill_effect;
  });
}

export async function deleteSkillEffect(id: string) {
  const db = await getDB();
  return await db.deleteFrom("skill_effect").where("id", "=", id).returningAll().executeTakeFirst();
}
