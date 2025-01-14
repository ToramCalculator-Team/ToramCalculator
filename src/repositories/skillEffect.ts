import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, skill_effect } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { ArmorType, WeaponType } from "./enums";
import { Locale } from "~/locales/i18n";

export type SkillEffect = ModifyKeys<Awaited<ReturnType<typeof findSkillEffectById>>, {
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
  condition: "",
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

export const SkillEffectDic = (locale: Locale): ConvertToAllString<SkillEffect> => {  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        condition: "条件",
        description: "文字描述",
        motionFixed: "固定动画时长",
        motionModified: "可变动画时长",
        chantingFixed: "固定咏唱时长",
        chantingModified: "可变咏唱时长",
        reservoirFixed: "固定蓄力时长",
        reservoirModified: "可变蓄力时长",
        startupFrames: "前摇帧数",
        cost: "技能消耗表达式",
        belongToskillId: "",
        details: "逻辑描述",
        selfName: "技能效果"
      };
    case "zh-TW":
      return {
        id: "ID",
        condition: "条件",
        description: "文字描述",
        motionFixed: "固定动画时长",
        motionModified: "可变动画时长",
        chantingFixed: "固定咏唱时长",
        chantingModified: "可变咏唱时长",
        reservoirFixed: "固定蓄力时长",
        reservoirModified: "可变蓄力时长",
        startupFrames: "前摇帧数",
        cost: "技能消耗表达式",
        belongToskillId: "",
        details: "逻辑描述",
        selfName: "技能效果"
      };
    case "en":
      return {
        id: "ID",
        condition: "条件",
        description: "文字描述",
        motionFixed: "固定动画时长",
        motionModified: "可变动画时长",
        chantingFixed: "固定咏唱时长",
        chantingModified: "可变咏唱时长",
        reservoirFixed: "固定蓄力时长",
        reservoirModified: "可变蓄力时长",
        startupFrames: "前摇帧数",
        cost: "技能消耗表达式",
        belongToskillId: "",
        details: "逻辑描述",
        selfName: "技能效果"
      };
    case "ja":
      return {
        id: "ID",
        condition: "条件",
        description: "文字描述",
        motionFixed: "固定动画时长",
        motionModified: "可变动画时长",
        chantingFixed: "固定咏唱时长",
        chantingModified: "可变咏唱时长",
        reservoirFixed: "固定蓄力时长",
        reservoirModified: "可变蓄力时长",
        startupFrames: "前摇帧数",
        cost: "技能消耗表达式",
        belongToskillId: "",
        details: "逻辑描述",
        selfName: "技能效果"
      };
  }}
