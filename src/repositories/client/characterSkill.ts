import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character_skill } from "~/../db/clientDB/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { defaultSkill, Skill, SkillDic, skillSubRelations } from "./skill";

export type CharacterSkill = ModifyKeys<Awaited<ReturnType<typeof findCharacterSkillById>>, {
  template: Skill;
}>;
export type NewCharacterSkill = Insertable<character_skill>;
export type CharacterSkillUpdate = Updateable<character_skill>;

export function character_skillSubRelations(eb: ExpressionBuilder<DB, "character_skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb.selectFrom("skill").whereRef("skill.id", "=", "character_skill.templateId")
        .select((subEb) => skillSubRelations(subEb, subEb.val(id))).selectAll("skill"),
    ).as("template"),
  ];
}

export async function findCharacterSkillById(id: string) {
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .select((eb) => character_skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCharacterSkill(id: string, updateWith: CharacterSkillUpdate) {
  return await db.updateTable("character_skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteCharacterSkill(id: string) {
  return await db.deleteFrom("character_skill").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCharacterSkill: CharacterSkill = {
  id: "defaultCharacterSkillId",
  lv: 0,
  isStarGem: false,
  templateId: "",
  template: defaultSkill,
};

// Dictionary
export const CharacterSkillDic = (locale: Locale): ConvertToAllString<CharacterSkill> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        template: SkillDic(locale),
      };
    case "zh-TW":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        template: SkillDic(locale),
      };
    case "en":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        template: SkillDic(locale),
      };
    case "ja":
      return {
        selfName: "角色技能",
        id: "ID",
        lv: "技能等级",
        isStarGem: "是否作为星石使用",
        templateId: "模板技能ID",
        template: SkillDic(locale),
      };
  }
};
