import type { character } from "@db/generated/zod/index";
import type { CharacterPersonalityType, SkillTreeType } from "@db/schema/enums";

export const CHARACTER_NUMERIC_FIELDS = ["lv", "str", "int", "vit", "agi", "dex", "personalityValue"] as const;
export type CharacterNumericField = (typeof CHARACTER_NUMERIC_FIELDS)[number];

export type CharacterEditableFields = Pick<
	character,
	| "name"
	| "weaponId"
	| "subWeaponId"
	| "armorId"
	| "optionId"
	| "specialId"
	| "cooking"
	| "modifiers"
	| "partnerSkillAId"
	| "partnerSkillAType"
	| "partnerSkillBId"
	| "partnerSkillBType"
	| "details"
>;

/** 通用字段 patch 只开放无联动的绝对字段；数值和个人能力类型必须使用语义操作。 */
export type CharacterFieldPatch = Partial<CharacterEditableFields>;

export type CharacterSkillEdit =
	| { type: "skills.adjustLevel"; templateId: string; delta: -1 | 1 }
	| { type: "skills.removeTree"; treeType: SkillTreeType };

export type CharacterEdit =
	| { type: "character.fields.update"; patch: CharacterFieldPatch }
	| { type: "character.numeric.set"; field: CharacterNumericField; value: number }
	| { type: "character.numeric.adjust"; field: CharacterNumericField; delta: -1 | 1 }
	| { type: "character.personality.setType"; value: CharacterPersonalityType }
	| CharacterSkillEdit;
