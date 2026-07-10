import { describe, expect, it, vi } from "vitest";
import type { NestedSchema, SchemaAttribute } from "./SchemaTypes";
import { StatContainer } from "./StatContainer";
import { type ModifierSource, ModifierType } from "./StatContainerTypes";

// 便捷叶子构造器。
const attr = (displayName: string, expression: string, noBaseValue?: boolean): SchemaAttribute => ({
	displayName,
	expression,
	...(noBaseValue ? { noBaseValue } : {}),
});

const src = (id: string): ModifierSource => ({
	key: id,
	name: id,
	type: "equipment",
	chain: [
		{ kind: "member", id: "test-member" },
		{ kind: "equipment", id },
	],
});

describe("StatContainer — 基础值与常量表达式", () => {
	it("常量表达式作为基础值读取", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		expect(sc.getValue("atk")).toBe(100);
		expect(sc.getBaseValue("atk")).toBe(100);
	});

	it("读取不存在属性返回 0", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		expect(sc.getValue("ghost" as "atk")).toBe(0);
		expect(sc.hasKey("atk")).toBe(true);
		expect(sc.hasKey("ghost")).toBe(false);
	});

	it("getAllKeys 返回全部属性键", () => {
		const sc = new StatContainer<"atk" | "def">({
			atk: attr("攻击", "100"),
			def: attr("防御", "50"),
		} as NestedSchema);
		expect(new Set(sc.getAllKeys())).toEqual(new Set(["atk", "def"]));
	});
});

describe("StatContainer — 修饰符叠加公式 floor(base*(1+%/100)+fixed)", () => {
	it("固定值加算", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 50, src("eq1"));
		expect(sc.getValue("atk")).toBe(150);
	});

	it("百分比按基础值乘算", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_PERCENTAGE, 20, src("eq1"));
		// 100 * (1 + 20/100) = 120
		expect(sc.getValue("atk")).toBe(120);
	});

	it("百分比与固定值组合：base*(1+%)+fixed 再向下取整", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_PERCENTAGE, 25, src("p"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 7, src("f"));
		// floor(100 * 1.25 + 7) = 132
		expect(sc.getValue("atk")).toBe(132);
	});

	it("static 与 dynamic 百分比/固定值合并计算", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "200") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_PERCENTAGE, 10, src("sp"));
		sc.addModifier("atk", ModifierType.DYNAMIC_PERCENTAGE, 10, src("dp"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 5, src("sf"));
		sc.addModifier("atk", ModifierType.DYNAMIC_FIXED, 5, src("df"));
		// floor(200 * (1 + 20/100) + 10) = floor(250) = 250
		expect(sc.getValue("atk")).toBe(250);
	});

	it("结果向下取整（非整数被 floor）", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "10") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_PERCENTAGE, 15, src("p"));
		// floor(10 * 1.15) = floor(11.5) = 11
		expect(sc.getValue("atk")).toBe(11);
	});
});

describe("StatContainer — 来源聚合与增删", () => {
	it("同属性多来源固定值累加", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 30, src("a"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 20, src("b"));
		expect(sc.getValue("atk")).toBe(150);
	});

	it("移除某来源后其贡献被扣除", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 30, src("a"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 20, src("b"));
		sc.removeModifier("atk", ModifierType.STATIC_FIXED, "a");
		expect(sc.getValue("atk")).toBe(120);
	});

	it("同来源多次 addModifier 累加到该来源", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 10, src("a"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 15, src("a"));
		expect(sc.getValue("atk")).toBe(125);
		// 移除该来源应一次性扣掉 25
		sc.removeModifier("atk", ModifierType.STATIC_FIXED, "a");
		expect(sc.getValue("atk")).toBe(100);
	});

	it("同来源累加到 0 时自动清除该来源条目", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 10, src("a"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, -10, src("a"));
		expect(sc.getValue("atk")).toBe(100);
		expect(sc.getModifiersBySourceKey("a")).toEqual([]);
	});

	it("getModifiersBySourceKey 返回该来源的全部条目和完整来源链", () => {
		const sc = new StatContainer<"atk" | "def">({
			atk: attr("攻击", "100"),
			def: attr("防御", "50"),
		} as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 10, src("ring"));
		sc.addModifier("def", ModifierType.STATIC_PERCENTAGE, 5, src("ring"));
		const entries = sc.getModifiersBySourceKey("ring");
		expect(entries).toHaveLength(2);
		expect(entries).toContainEqual({
			attr: "atk",
			targetType: ModifierType.STATIC_FIXED,
			source: src("ring"),
			value: 10,
		});
		expect(entries).toContainEqual({
			attr: "def",
			targetType: ModifierType.STATIC_PERCENTAGE,
			source: src("ring"),
			value: 5,
		});
	});

	it("同 key 的不同来源链拒绝合并", () => {
		const sc = new StatContainer<"atk" | "def">({
			atk: attr("攻击", "100"),
			def: attr("防御", "50"),
		} as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 10, src("same"));
		expect(() =>
			sc.addModifier("def", ModifierType.STATIC_PERCENTAGE, 5, {
				...src("same"),
				chain: [
					{ kind: "member", id: "another-member" },
					{ kind: "equipment", id: "same" },
				],
			}),
		).toThrow(/source key 冲突/);
	});
});

describe("StatContainer — updateModifiersBySource 覆盖语义", () => {
	it("覆盖更新：移除旧条目、写入新条目", () => {
		const sc = new StatContainer<"atk" | "def">({
			atk: attr("攻击", "100"),
			def: attr("防御", "100"),
		} as NestedSchema);
		sc.updateModifiersBySource(src("buff"), [{ attr: "atk", targetType: ModifierType.STATIC_FIXED, value: 10 }]);
		expect(sc.getValue("atk")).toBe(110);

		// 覆盖为只影响 def；atk 的旧贡献应被移除。
		sc.updateModifiersBySource(src("buff"), [{ attr: "def", targetType: ModifierType.STATIC_FIXED, value: 20 }]);
		expect(sc.getValue("atk")).toBe(100);
		expect(sc.getValue("def")).toBe(120);
	});

	it("removeModifiersBySourceKey 清空该来源全部影响", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 40, src("x"));
		sc.removeModifiersBySourceKey("x");
		expect(sc.getValue("atk")).toBe(100);
	});

	it("removeModifiersBySourceKeyPrefix 按前缀批量清理", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 10, src("passive.fire"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 20, src("passive.fire.stack.1"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 5, src("equipment.ring"));
		sc.removeModifiersBySourceKeyPrefix("passive.fire");
		// 只剩 equipment.ring 的 +5
		expect(sc.getValue("atk")).toBe(105);
	});
});

describe("StatContainer — 计算属性与依赖传播", () => {
	it("表达式引用其他属性", () => {
		const sc = new StatContainer<"str" | "atk">({
			str: attr("力量", "50"),
			atk: attr("攻击", "str * 2"),
		} as NestedSchema);
		expect(sc.getValue("atk")).toBe(100);
	});

	it("上游属性变更后下游计算属性自动更新", () => {
		const sc = new StatContainer<"str" | "atk">({
			str: attr("力量", "50"),
			atk: attr("攻击", "str * 2"),
		} as NestedSchema);
		expect(sc.getValue("atk")).toBe(100);
		// 给 str 加 modifier，atk 应随之变化。
		sc.addModifier("str", ModifierType.STATIC_FIXED, 10, src("buff"));
		expect(sc.getValue("str")).toBe(60);
		expect(sc.getValue("atk")).toBe(120);
	});

	it("多级依赖链传播", () => {
		const sc = new StatContainer<"a" | "b" | "c">({
			a: attr("A", "10"),
			b: attr("B", "a * 2"),
			c: attr("C", "b + 5"),
		} as NestedSchema);
		expect(sc.getValue("c")).toBe(25);
		sc.addModifier("a", ModifierType.STATIC_FIXED, 5, src("s"));
		// a=15 → b=30 → c=35
		expect(sc.getValue("c")).toBe(35);
	});
});

describe("StatContainer — noBaseValue 纯加法路径", () => {
	it("noBaseValue 属性百分比只做加法而非乘算", () => {
		const sc = new StatContainer<"crit">({ crit: attr("暴击", "0", true) } as NestedSchema);
		sc.addModifier("crit", ModifierType.STATIC_PERCENTAGE, 30, src("a"));
		sc.addModifier("crit", ModifierType.STATIC_FIXED, 5, src("b"));
		// noBaseValue: base(0) + fixed(5) + percentage(30) = 35（不做 *(1+%)）
		expect(sc.getValue("crit")).toBe(35);
	});
});

describe("StatContainer — onChange 订阅", () => {
	it("构造期初始化不触发（未观测过），后续变更才触发", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		const listener = vi.fn();
		sc.onChange("atk", listener);
		// 先观测一次（0→100 的首次不报，因为订阅前尚未观测；这里读取即观测）
		sc.getValue("atk");
		listener.mockClear();

		sc.addModifier("atk", ModifierType.STATIC_FIXED, 50, src("s"));
		sc.flushDirtyValues();
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(100, 150, "atk");
	});

	it("取消订阅后不再触发", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		const listener = vi.fn();
		const unsub = sc.onChange("atk", listener);
		sc.getValue("atk");
		unsub();
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 50, src("s"));
		sc.flushDirtyValues();
		expect(listener).not.toHaveBeenCalled();
	});

	it("值未变化不触发", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		const listener = vi.fn();
		sc.onChange("atk", listener);
		sc.getValue("atk");
		listener.mockClear();
		// 加 0 被 addModifier 提前 return，值不变。
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 0, src("s"));
		sc.flushDirtyValues();
		expect(listener).not.toHaveBeenCalled();
	});
});

describe("StatContainer — 导出", () => {
	it("exportFlatValues 返回扁平数值映射", () => {
		const sc = new StatContainer<"atk" | "def">({
			atk: attr("攻击", "100"),
			def: attr("防御", "50"),
		} as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 20, src("s"));
		expect(sc.exportFlatValues()).toEqual({ atk: 120, def: 50 });
	});

	it("exportModifierDetails 按来源分类列出条目", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.BASE_VALUE, 5, src("base"));
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 20, src("eq"));
		const details = sc.exportModifierDetails();
		expect(details.atk.baseSources).toContainEqual({ source: src("base"), value: 5 });
		expect(details.atk.static.fixed).toContainEqual({ source: src("eq"), value: 20 });
	});

	it("exportNestedValues 保留基础值来源", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.BASE_VALUE, 5, src("base"));
		expect(sc.exportNestedValues()).toMatchObject({
			atk: { baseSources: [{ source: src("base"), value: 5 }] },
		});
	});
});

describe("StatContainer — checkpoint 往返", () => {
	it("capture/restore 保持值与修饰符来源", () => {
		const sc = new StatContainer<"atk">({ atk: attr("攻击", "100") } as NestedSchema);
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 50, src("a"));
		expect(sc.getValue("atk")).toBe(150);
		const cp = sc.captureCheckpoint();
		expect(cp.modifierSources[0]?.entries[0]?.sources[0]?.source).toEqual(src("a"));

		// 继续改动，然后恢复。
		sc.addModifier("atk", ModifierType.STATIC_FIXED, 100, src("b"));
		expect(sc.getValue("atk")).toBe(250);

		sc.restoreCheckpoint(cp);
		expect(sc.getValue("atk")).toBe(150);
		expect(sc.getModifiersBySourceKey("a")[0]?.source).toEqual(src("a"));
		// 来源索引也应恢复：移除 a 应回到 100。
		sc.removeModifier("atk", ModifierType.STATIC_FIXED, "a");
		expect(sc.getValue("atk")).toBe(100);
	});
});
