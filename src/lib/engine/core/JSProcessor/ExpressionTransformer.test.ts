import { describe, expect, it } from "vitest";
import type { NestedSchema, SchemaAttribute } from "../World/Member/runtime/StatContainer/SchemaTypes";
import { ExpressionTransformer } from "./ExpressionTransformer";

// 构造一个合法叶子 SchemaAttribute（isSchemaAttribute 要求 displayName + expression 均为字符串）。
const leaf = (name: string): SchemaAttribute =>
	({ displayName: name, expression: "0" }) as unknown as SchemaAttribute;

// 测试用嵌套 schema：self 拥有 atk（叶子）与 mainWeapon.range（嵌套叶子）。
const selfSchema: NestedSchema = {
	atk: leaf("攻击"),
	mainWeapon: {
		range: leaf("射程"),
	},
} as unknown as NestedSchema;

describe("transform — 将访问器替换为数值字面量", () => {
	it("把 self.atk 替换为 valueProvider 返回的数字", () => {
		const r = ExpressionTransformer.transform("self.atk + 10", {
			replaceAccessor: "self",
			valueProvider: () => 200,
		});
		expect(r.success).toBe(true);
		expect(r.compiledExpression).toBe("200 + 10");
		expect(r.dependencies).toEqual(["atk"]);
	});

	it("只替换指定访问器，另一侧原样保留", () => {
		const r = ExpressionTransformer.transform("self.atk + target.def", {
			replaceAccessor: "self",
			valueProvider: () => 100,
		});
		expect(r.compiledExpression).toBe("100 + target.def");
		expect(r.dependencies).toEqual(["atk"]);
	});

	it("嵌套属性链只替换最外层，key 为完整路径", () => {
		const r = ExpressionTransformer.transform("self.mainWeapon.range * 2", {
			replaceAccessor: "self",
			valueProvider: () => 5,
		});
		expect(r.compiledExpression).toBe("5 * 2");
		expect(r.dependencies).toEqual(["mainWeapon.range"]);
	});

	it("布尔值格式化为 true/false", () => {
		const r = ExpressionTransformer.transform("self.atk", {
			replaceAccessor: "self",
			valueProvider: () => true,
		});
		expect(r.compiledExpression).toBe("true");
	});

	it("valueProvider 按 key 分发不同的值", () => {
		const r = ExpressionTransformer.transform("self.atk + self.mainWeapon.range", {
			replaceAccessor: "self",
			valueProvider: (key) => (key === "atk" ? 300 : 7),
		});
		expect(r.compiledExpression).toBe("300 + 7");
		expect(new Set(r.dependencies)).toEqual(new Set(["atk", "mainWeapon.range"]));
	});

	it("提供 schema 时，路径不存在则失败并报错", () => {
		const r = ExpressionTransformer.transform("self.nonexistent + 1", {
			replaceAccessor: "self",
			valueProvider: () => 1,
			schema: selfSchema,
		});
		expect(r.success).toBe(false);
		expect(r.error).toMatch(/无效的属性路径/);
	});

	it("提供 schema 且路径存在则成功", () => {
		const r = ExpressionTransformer.transform("self.mainWeapon.range", {
			replaceAccessor: "self",
			valueProvider: () => 12,
			schema: selfSchema,
		});
		expect(r.success).toBe(true);
		expect(r.compiledExpression).toBe("12");
	});

	it("语法错误的表达式返回 success=false 与错误信息", () => {
		const r = ExpressionTransformer.transform("self.atk +", {
			replaceAccessor: "self",
			valueProvider: () => 1,
		});
		expect(r.success).toBe(false);
		expect(r.error).toMatch(/转换失败/);
	});
});

describe("transformToGetValue — 改写为 statContainer.getValue 调用", () => {
	it("self.atk → self.statContainer.getValue('atk')", () => {
		const r = ExpressionTransformer.transformToGetValue("self.atk + 1");
		expect(r.success).toBe(true);
		expect(r.compiledExpression).toBe("self.statContainer.getValue('atk') + 1");
		expect(r.dependencies).toEqual(["atk"]);
	});

	it("基础值前缀 _ 改写为 getBaseValue 且 key 去前缀", () => {
		const r = ExpressionTransformer.transformToGetValue("self._atk");
		expect(r.compiledExpression).toBe("self.statContainer.getBaseValue('atk')");
		expect(r.dependencies).toEqual(["atk"]);
	});

	it("self 与 target 分别改写", () => {
		const r = ExpressionTransformer.transformToGetValue("self.atk - target.def");
		expect(r.compiledExpression).toBe(
			"self.statContainer.getValue('atk') - target.statContainer.getValue('def')",
		);
	});

	it("嵌套路径整体改写为单次 getValue", () => {
		const r = ExpressionTransformer.transformToGetValue("self.mainWeapon.range");
		expect(r.compiledExpression).toBe("self.statContainer.getValue('mainWeapon.range')");
	});

	it("schema 校验：路径不存在则失败", () => {
		const r = ExpressionTransformer.transformToGetValue("self.ghost", {
			schemas: { self: selfSchema },
		});
		expect(r.success).toBe(false);
		expect(r.error).toMatch(/无效的属性路径/);
	});
});

describe("analyzeBareHasBuffArgs — 提取裸 hasBuff 字面量参数", () => {
	it("提取单个 hasBuff('X') 参数", () => {
		expect(ExpressionTransformer.analyzeBareHasBuffArgs("hasBuff('鼓舞') ? 1 : 0")).toEqual(["鼓舞"]);
	});

	it("多个不同参数去重收集", () => {
		const r = ExpressionTransformer.analyzeBareHasBuffArgs("hasBuff('A') && hasBuff('B') && hasBuff('A')");
		expect(new Set(r)).toEqual(new Set(["A", "B"]));
	});

	it("忽略 self.hasBuff(...) 这类成员调用形态", () => {
		expect(ExpressionTransformer.analyzeBareHasBuffArgs("self.hasBuff('X')")).toEqual([]);
	});

	it("非字符串字面量参数不被提取", () => {
		expect(ExpressionTransformer.analyzeBareHasBuffArgs("hasBuff(someVar)")).toEqual([]);
	});

	it("无 hasBuff 调用返回空数组", () => {
		expect(ExpressionTransformer.analyzeBareHasBuffArgs("self.atk + 1")).toEqual([]);
	});

	it("解析失败返回空数组（不抛错）", () => {
		expect(ExpressionTransformer.analyzeBareHasBuffArgs("hasBuff(")).toEqual([]);
	});
});

describe("analyzeDependencies — 依赖分析", () => {
	it("区分 self 计算值与基础值（_ 前缀去除）", () => {
		const r = ExpressionTransformer.analyzeDependencies("self.atk + self._def");
		expect(r.selfDependencies).toEqual(["atk"]);
		expect(r.selfBaseValueDependencies).toEqual(["def"]);
	});

	it("区分 target 计算值与基础值", () => {
		const r = ExpressionTransformer.analyzeDependencies("target.res + target._hp");
		expect(r.targetDependencies).toEqual(["res"]);
		expect(r.targetBaseValueDependencies).toEqual(["hp"]);
	});

	it("同一路径去重", () => {
		const r = ExpressionTransformer.analyzeDependencies("self.atk + self.atk * 2");
		expect(r.selfDependencies).toEqual(["atk"]);
	});

	it("嵌套路径只记录最外层完整路径", () => {
		const r = ExpressionTransformer.analyzeDependencies("self.mainWeapon.range");
		expect(r.selfDependencies).toEqual(["mainWeapon.range"]);
	});

	it("识别 distance / targetCount 独立标识符", () => {
		const r = ExpressionTransformer.analyzeDependencies("distance * targetCount");
		expect(r.hasDistance).toBe(true);
		expect(r.hasTargetCount).toBe(true);
	});

	it("识别 skill.lv", () => {
		const r = ExpressionTransformer.analyzeDependencies("skill.lv * 10");
		expect(r.hasSkillLv).toBe(true);
	});

	it("无相关标识符时对应标志为 false", () => {
		const r = ExpressionTransformer.analyzeDependencies("self.atk + 1");
		expect(r.hasDistance).toBe(false);
		expect(r.hasTargetCount).toBe(false);
		expect(r.hasSkillLv).toBe(false);
	});

	it("解析失败时返回全空依赖（不抛错）", () => {
		const r = ExpressionTransformer.analyzeDependencies("self.atk +++");
		expect(r.selfDependencies).toEqual([]);
		expect(r.hasSkillLv).toBe(false);
	});
});

describe("底层工具方法", () => {
	it("formatValue：整数、小数、布尔", () => {
		expect(ExpressionTransformer.formatValue(42)).toBe("42");
		expect(ExpressionTransformer.formatValue(3.5)).toBe("3.5");
		expect(ExpressionTransformer.formatValue(true)).toBe("true");
		expect(ExpressionTransformer.formatValue(false)).toBe("false");
	});

	it("applyReplacements：从后往前替换，位置不串位", () => {
		const out = ExpressionTransformer.applyReplacements("aXbYc", [
			{ start: 1, end: 2, replacement: "1" },
			{ start: 3, end: 4, replacement: "22" },
		]);
		expect(out).toBe("a1b22c");
	});

	it("pathExistsInSchema：叶子存在、嵌套存在、超出叶子不存在", () => {
		expect(ExpressionTransformer.pathExistsInSchema("atk", selfSchema)).toBe(true);
		expect(ExpressionTransformer.pathExistsInSchema("mainWeapon.range", selfSchema)).toBe(true);
		expect(ExpressionTransformer.pathExistsInSchema("mainWeapon.range.deep", selfSchema)).toBe(false);
		expect(ExpressionTransformer.pathExistsInSchema("nope", selfSchema)).toBe(false);
	});
});
