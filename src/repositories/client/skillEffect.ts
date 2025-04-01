import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { DB, skill_effect } from "~/../db/clientDB/kysely/kyesely";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface SkillEffect extends DataType<skill_effect> {
    MainTable: Awaited<ReturnType<typeof findSkillEffects>>[number]
    MainForm: skill_effect
}

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

export async function findSkillEffects() {
  return await db
    .selectFrom("skill_effect")
    .selectAll("skill_effect")
    .execute();
}

export async function updateSkillEffect(id: string, updateWith: SkillEffect["Update"]) {
  return await db.updateTable("skill_effect").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkillEffect(newSkillEffect: SkillEffect["Insert"]) {
  return await db.insertInto("skill_effect").values(newSkillEffect).returningAll().executeTakeFirstOrThrow();
}

export async function createSkillEffect(newSkillEffect: SkillEffect["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const skill_effect = await insertSkillEffect(newSkillEffect);
    return skill_effect;
  });
}

export async function deleteSkillEffect(id: string) {
  return await db.deleteFrom("skill_effect").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSkillEffect: SkillEffect["Select"] = {
  id: "",
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
  details: "",
  castingRange: 0,
  effectiveRange: 0,
  elementLogic: "",
  logic: {},
};

export const SkillEffectDic = (locale: Locale): ConvertToAllString<SkillEffect["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        condition: "条件",
        elementLogic: "元素逻辑",
        logic: "逻辑",
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
        selfName: "技能效果",
        castingRange: "施法距离",
        effectiveRange: "技能效果范围",
      };
    case "zh-TW":
      return {
        id: "ID",
        condition: "條件",
        elementLogic: "元素邏輯",
        logic: "邏輯",
        description: "文字描述",
        motionFixed: "固定動畫時長",
        motionModified: "可變動畫時長",
        chantingFixed: "固定咏唱時長",
        chantingModified: "可變咏唱時長",
        reservoirFixed: "固定蓄力時長",
        reservoirModified: "可變蓄力時長",
        startupFrames: "前摇幀數",
        cost: "技能消耗表達式",
        belongToskillId: "",
        details: "邏輯描述",
        selfName: "技能效果",
        castingRange: "施法距離",
        effectiveRange: "技能效果範圍",
      };
    case "en":
      return {
        id: "ID",
        condition: "Condition",
        elementLogic: "Element logic",
        logic: "Logic",
        description: "Text description",
        motionFixed: "Fixed animation duration",
        motionModified: "Variable animation duration",
        chantingFixed: "Fixed chanting duration",
        chantingModified: "Variable chanting duration",
        reservoirFixed: "Fixed reservoir duration",
        reservoirModified: "Variable reservoir duration",
        startupFrames: "Startup frames",
        cost: "Skill cost expression",
        belongToskillId: "",
        details: "Logic description",
        selfName: "Skill effect",
        castingRange: "Casting range",
        effectiveRange: "Skill effect range",
      };
    case "ja":
      return {
        id: "ID",
        condition: "条件",
        elementLogic: "元素ロジック",
        logic: "ロジック",
        description: "テキスト説明",
        motionFixed: "固定アニメーション時間",
        motionModified: "可変アニメーション時間",
        chantingFixed: "固定詠唱時間",
        chantingModified: "可変詠唱時間",
        reservoirFixed: "固定蓄積時間",
        reservoirModified: "可変蓄積時間",
        startupFrames: "開始フレーム",
        cost: "スキルコスト式",
        belongToskillId: "",
        details: "ロジック説明",
        selfName: "スキル効果",
        castingRange: "射程距離",
        effectiveRange: "スキル効果範囲",
      };
  }
};
