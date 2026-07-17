import type { CharacterPersonalityType } from "@db/schema/enums";
import type { CharacterNumericField } from "./characterEditProtocol";

export type CharacterNumericState = Record<CharacterNumericField, number> & {
	personalityType: CharacterPersonalityType;
};

const assertFiniteInteger = (value: number, field: string): void => {
	if (!Number.isFinite(value) || !Number.isInteger(value)) {
		throw new Error(`${field} 必须是有限整数`);
	}
};

/** 按机体配置产品规则规范化单个数值；个人能力值同时依赖当前能力类型。 */
export function normalizeCharacterNumericValue(
	field: CharacterNumericField,
	value: number,
	personalityType: CharacterPersonalityType,
): number {
	assertFiniteInteger(value, field);
	if (field === "lv") return Math.max(1, Math.min(300, value));
	if (field === "personalityValue") {
		return personalityType === "None" ? 0 : Math.max(1, Math.min(255, value));
	}
	return Math.max(1, value);
}

export function adjustCharacterNumericValue(
	state: CharacterNumericState,
	field: CharacterNumericField,
	delta: -1 | 1,
): number {
	return normalizeCharacterNumericValue(field, state[field] + delta, state.personalityType);
}

export function normalizePersonalityTypeChange(
	currentValue: number,
	personalityType: CharacterPersonalityType,
): { personalityType: CharacterPersonalityType; personalityValue: number } {
	return {
		personalityType,
		personalityValue: normalizeCharacterNumericValue("personalityValue", currentValue, personalityType),
	};
}
