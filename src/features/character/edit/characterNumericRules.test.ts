import { describe, expect, it } from "vitest";
import {
	adjustCharacterNumericValue,
	normalizeCharacterNumericValue,
	normalizePersonalityTypeChange,
} from "./characterNumericRules";

describe("机体配置数值规则", () => {
	it("规范化等级、五维和个人能力边界", () => {
		expect(normalizeCharacterNumericValue("lv", 0, "None")).toBe(1);
		expect(normalizeCharacterNumericValue("lv", 301, "None")).toBe(300);
		expect(normalizeCharacterNumericValue("str", 0, "None")).toBe(1);
		expect(normalizeCharacterNumericValue("str", 510, "None")).toBe(510);
		expect(normalizeCharacterNumericValue("personalityValue", 255, "Luk")).toBe(255);
		expect(normalizeCharacterNumericValue("personalityValue", 300, "Luk")).toBe(255);
		expect(normalizeCharacterNumericValue("personalityValue", 200, "None")).toBe(0);
	});

	it("相对调整在执行时状态的边界饱和", () => {
		const state = {
			lv: 300,
			str: 1,
			int: 1,
			vit: 1,
			agi: 1,
			dex: 1,
			personalityValue: 0,
			personalityType: "None",
		} as const;
		expect(adjustCharacterNumericValue(state, "lv", 1)).toBe(300);
		expect(adjustCharacterNumericValue(state, "str", -1)).toBe(1);
	});

	it("个人能力类型和值共同变化", () => {
		expect(normalizePersonalityTypeChange(0, "Luk")).toEqual({ personalityType: "Luk", personalityValue: 1 });
		expect(normalizePersonalityTypeChange(200, "None")).toEqual({ personalityType: "None", personalityValue: 0 });
	});

	it("拒绝非有限整数", () => {
		expect(() => normalizeCharacterNumericValue("str", Number.NaN, "None")).toThrow("str 必须是有限整数");
		expect(() => normalizeCharacterNumericValue("str", 1.5, "None")).toThrow("str 必须是有限整数");
	});
});
