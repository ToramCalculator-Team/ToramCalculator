import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, character_skill } from "~/../db/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
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

export const defaultCharacterSkill: CharacterSkill["Select"] = {
  id: "",
  lv: 0,
  isStarGem: false,
  templateId: "",
  characterId: "",
};

// Dictionary
export const CharacterSkillDic = (locale: Locale): ConvertToAllString<CharacterSkill["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        characterId: "角色ID",
      };
    case "zh-TW":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        characterId: "角色ID",
      };
    case "en":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        characterId: "角色ID",
      };
    case "ja":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        characterId: "角色ID",
      };
  }
};
