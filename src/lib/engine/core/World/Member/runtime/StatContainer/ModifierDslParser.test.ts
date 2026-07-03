import { describe, expect, it } from "vitest";
import {
	compileModifierDslLine,
	compileModifierDslLines,
	evaluateModifierDslExpression,
	type ModifierDslCompileContext,
	type ModifierDslIdentifierResolver,
} from "./ModifierDslParser";
import { ModifierType, type ModifierSource } from "./StatContainerTypes";

// 测试用固定来源。
const SOURCE: ModifierSource = { id: "src-1", name: "测试来源", type: "equipment" };

// 便捷构造编译上下文；可选注入 resolver / scope。
const ctx = (over: Partial<ModifierDslCompileContext> = {}): ModifierDslCompileContext => ({
	source: SOURCE,
	...over,
});

describe("evaluateModifierDslExpression — 纯表达式求值", () => {
	it("空表达式返回 0", () => {
		expect(evaluateModifierDslExpression("")).toBe(0);
		expect(evaluateModifierDslExpression("   ")).toBe(0);
	});

	it("四则运算", () => {
		expect(evaluateModifierDslExpression("1 + 2 * 3")).toBe(7);
		expect(evaluateModifierDslExpression("(1 + 2) * 3")).toBe(9);
		expect(evaluateModifierDslExpression("10 / 4")).toBe(2.5);
	});

	it("^ 被编译为 Math.pow", () => {
		expect(evaluateModifierDslExpression("2 ^ 10")).toBe(1024);
	});

	it("一元负号", () => {
		expect(evaluateModifierDslExpression("-5")).toBe(-5);
		expect(evaluateModifierDslExpression("-(2 + 3)")).toBe(-5);
	});

	it("比较与逻辑运算返回布尔", () => {
		expect(evaluateModifierDslExpression("3 > 2")).toBe(true);
		expect(evaluateModifierDslExpression("1 == 2")).toBe(false);
		expect(evaluateModifierDslExpression("2 > 1 && 3 > 5")).toBe(false);
	});

	it("三元条件表达式", () => {
		expect(evaluateModifierDslExpression("3 > 2 ? 100 : 0")).toBe(100);
	});

	it("非有限数字（如除零）归零", () => {
		expect(evaluateModifierDslExpression("1 / 0")).toBe(0);
	});

	it("scope 变量参与运算", () => {
		expect(evaluateModifierDslExpression("base + bonus", { base: 100, bonus: 20 })).toBe(120);
	});

	it("成员访问表达式读取 scope 对象字段", () => {
		expect(evaluateModifierDslExpression("member.str * 2", { member: { str: 50 } })).toBe(100);
	});

	it("字符串数字结果被转为 number", () => {
		// runner 返回字符串时若可转有限数字则采用之。
		expect(evaluateModifierDslExpression('"42"', {})).toBe(42);
	});

	it("resolver 把裸标识符解析为数值", () => {
		const resolve: ModifierDslIdentifierResolver = (name) => (name === "Light" ? 3 : undefined);
		expect(evaluateModifierDslExpression("Light + 1", {}, resolve)).toBe(4);
	});

	it("resolver 未命中的未知标识符抛错", () => {
		expect(() => evaluateModifierDslExpression("unknownVar + 1", {})).toThrow(/unknown identifier/);
	});
});

describe("compileModifierDslLine — 基础值赋值（=）", () => {
	it("element = light → BASE_VALUE，值经 resolver 解析", () => {
		const resolve: ModifierDslIdentifierResolver = (n) => (n === "light" ? 2 : undefined);
		const r = compileModifierDslLine("element = light", ctx({ resolveIdentifier: resolve }));
		expect(r).toEqual({
			attribute: "element",
			modifierType: ModifierType.BASE_VALUE,
			value: 2,
			source: SOURCE,
		});
	});

	it("数值直接赋值", () => {
		const r = compileModifierDslLine("hp = 100", ctx());
		expect(r?.modifierType).toBe(ModifierType.BASE_VALUE);
		expect(r?.value).toBe(100);
	});
});

describe("compileModifierDslLine — 固定值加减（+ / -）", () => {
	it("atk + 6 → STATIC_FIXED，正值", () => {
		const r = compileModifierDslLine("atk + 6", ctx());
		expect(r).toEqual({
			attribute: "atk",
			modifierType: ModifierType.STATIC_FIXED,
			value: 6,
			source: SOURCE,
		});
	});

	it("atk - 6 → STATIC_FIXED，负值", () => {
		const r = compileModifierDslLine("atk - 6", ctx());
		expect(r?.modifierType).toBe(ModifierType.STATIC_FIXED);
		expect(r?.value).toBe(-6);
	});

	it("atk + -6 → 表达式求值为 -6", () => {
		const r = compileModifierDslLine("atk + -6", ctx());
		expect(r?.value).toBe(-6);
	});
});

describe("compileModifierDslLine — 百分比（%）", () => {
	it("atk.p + 6% → STATIC_PERCENTAGE", () => {
		const r = compileModifierDslLine("atk.p + 6%", ctx());
		expect(r).toEqual({
			attribute: "atk.p",
			modifierType: ModifierType.STATIC_PERCENTAGE,
			value: 6,
			source: SOURCE,
		});
	});

	it("减号百分比取负", () => {
		const r = compileModifierDslLine("atk.p - 10%", ctx());
		expect(r?.modifierType).toBe(ModifierType.STATIC_PERCENTAGE);
		expect(r?.value).toBe(-10);
	});
});

describe("compileModifierDslLine — 点分属性路径", () => {
	it("多段属性名被拼成 a.b.c", () => {
		const r = compileModifierDslLine("distanceDmg.short + 11%", ctx());
		expect(r?.attribute).toBe("distanceDmg.short");
		expect(r?.value).toBe(11);
	});
});

describe("compileModifierDslLine — 条件（&&）", () => {
	it("条件为真时编译右侧 modifier", () => {
		// armor.ability == Light 用 resolver 让两边相等 → 条件真。
		const resolve: ModifierDslIdentifierResolver = (n) => {
			if (n === "Light") return 1;
			return undefined;
		};
		const r = compileModifierDslLine(
			"Light == 1 && distanceDmg.short + 11%",
			ctx({ resolveIdentifier: resolve }),
		);
		expect(r).not.toBeNull();
		expect(r?.attribute).toBe("distanceDmg.short");
		expect(r?.modifierType).toBe(ModifierType.STATIC_PERCENTAGE);
	});

	it("条件为假时返回 null（不产生 modifier）", () => {
		const r = compileModifierDslLine("1 == 2 && atk + 6", ctx());
		expect(r).toBeNull();
	});
});

describe("compileModifierDslLine — 边界与报错", () => {
	it("空行返回 null", () => {
		expect(compileModifierDslLine("", ctx())).toBeNull();
		expect(compileModifierDslLine("   ", ctx())).toBeNull();
	});

	it("纯比较表达式（无 +/-/= 运算）返回 null", () => {
		// isComparisonToken 命中 → 不是一条赋值型 modifier。
		expect(compileModifierDslLine("atk == 5", ctx())).toBeNull();
	});

	it("属性名后缺少运算符抛错", () => {
		expect(() => compileModifierDslLine("atk", ctx())).toThrow(/op expected/);
	});

	it("使用注入的 evaluateExpression 覆盖默认求值器", () => {
		const r = compileModifierDslLine("atk + foo", ctx({ evaluateExpression: () => 999 }));
		expect(r?.value).toBe(999);
	});
});

describe("compileModifierDslLines — 批量编译", () => {
	it("过滤掉返回 null 的行，只保留有效 modifier", () => {
		const lines = ["atk + 6", "", "1 == 2 && atk + 1", "atk.p + 10%"];
		const out = compileModifierDslLines(lines, ctx());
		expect(out).toHaveLength(2);
		expect(out[0].attribute).toBe("atk");
		expect(out[1].attribute).toBe("atk.p");
	});
});
