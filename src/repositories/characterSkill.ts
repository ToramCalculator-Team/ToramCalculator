import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, character_skill } from "~/../db/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import {DataType } from "./untils";
import { skillSubRelations } from "./skill";

export interface CharacterSkill extends DataType<character_skill> {
  MainTable: Awaited<ReturnType<typeof findCharacterSkills>>[number];
  MainForm: character_skill;
}

export function character_skillSubRelations(eb: ExpressionBuilder<DB, "character_skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("skill")
        .whereRef("skill.id", "=", "character_skill.templateId")
        .select((subEb) => skillSubRelations(subEb, subEb.val(id)))
        .selectAll("skill"),
    ).as("template"),
  ];
}

export async function findCharacterSkillById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .select((eb) => character_skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findCharacterSkills() {
  const db = await getDB();
  return await db.selectFrom("character_skill").selectAll("character_skill").execute();
}

export async function updateCharacterSkill(id: string, updateWith: CharacterSkill["Update"]) {
  const db = await getDB();
  return await db.updateTable("character_skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteCharacterSkill(id: string) {
  const db = await getDB();
  return await db.deleteFrom("character_skill").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertCharacterSkill(trx: Transaction<DB>, insertWith: CharacterSkill["Insert"]) {
  return await trx.insertInto("character_skill").values(insertWith).returningAll().executeTakeFirst();
}