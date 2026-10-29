import { describe, expect, it } from "vitest";
import {
	parseInstruction,
	parseOperand,
	parsePipeline,
	serializeInstruction,
	serializePipeline,
} from "./InstructionParser";
import type { PipelineInstruction } from "./instruction";

describe("parseOperand", () => {
	it("将整数字面量解析为 number", () => {
		expect(parseOperand("42")).toBe(42);
	});

	it("解析小数、正负号与科学计数法", () => {
		expect(parseOperand("3.14")).toBe(3.14);
		expect(parseOperand("-7")).toBe(-7);
		expect(parseOperand("+5")).toBe(5);
		expect(parseOperand(".5")).toBe(0.5);
		expect(parseOperand("1e3")).toBe(1000);
		expect(parseOperand("2.5E-2")).toBe(0.025);
	});

	it("去除首尾空白后再判定", () => {
		expect(parseOperand("  10  ")).toBe(10);
	});

	it("非数字 token 作为变量/路径字符串原样返回", () => {
		expect(parseOperand("hp")).toBe("hp");
		expect(parseOperand("member.str")).toBe("member.str");
	});

	it("剥离双引号与单引号包裹", () => {
		expect(parseOperand('"hello world"')).toBe("hello world");
		expect(parseOperand("'foo'")).toBe("foo");
	});

	it("被引号包裹的数字视为字符串内容但仍会被数字正则命中而转为 number", () => {
		// unquote 先剥引号，"3" → 3；这是当前约定的行为，锁定以防回归。
		expect(parseOperand('"3"')).toBe(3);
	});
});

describe("parseInstruction — 二元形式", () => {
	it("解析规范的 a op b", () => {
		expect(parseInstruction("hp = base + bonus")).toEqual<PipelineInstruction>({
			target: "hp",
			op: "+",
			a: "base",
			b: "bonus",
		});
	});

	it("数字操作数被转为 number", () => {
		expect(parseInstruction("x = 2 * 3")).toEqual<PipelineInstruction>({
			target: "x",
			op: "*",
			a: 2,
			b: 3,
		});
	});

	it("支持比较与逻辑运算符", () => {
		expect(parseInstruction("flag = a >= b").op).toBe(">=");
		expect(parseInstruction("flag = a == b").op).toBe("==");
		expect(parseInstruction("flag = a and b").op).toBe("and");
	});

	it("target 与 rhs 两侧空白被裁剪", () => {
		expect(parseInstruction("  total   =   a + b  ")).toEqual<PipelineInstruction>({
			target: "total",
			op: "+",
			a: "a",
			b: "b",
		});
	});

	it("b 侧含空白时，剩余 token 会被拼回", () => {
		// 第一个 = 之后为 rhs，tokens = [a, op, ...b]，b 用空格 join 回去。
		const instr = parseInstruction("r = a select 'yes no'");
		expect(instr.a).toBe("a");
		expect(instr.op).toBe("select");
		expect(instr.b).toBe("yes no");
	});
});

describe("parseInstruction — 一元形式", () => {
	it("解析函数式一元运算 op(x)", () => {
		expect(parseInstruction("y = floor(x)")).toEqual<PipelineInstruction>({
			target: "y",
			op: "floor",
			a: "x",
		});
	});

	it("函数式一元的实参可为数字", () => {
		expect(parseInstruction("y = abs(-5)")).toEqual<PipelineInstruction>({
			target: "y",
			op: "abs",
			a: -5,
		});
	});

	it("解析中缀式一元运算 op a（两 token）", () => {
		expect(parseInstruction("y = round 1.5")).toEqual<PipelineInstruction>({
			target: "y",
			op: "round",
			a: 1.5,
		});
	});

	it("支持全部一元运算符 floor/ceil/round/abs/not", () => {
		for (const op of ["floor", "ceil", "round", "abs", "not"] as const) {
			expect(parseInstruction(`y = ${op}(x)`).op).toBe(op);
		}
	});
});

describe("parseInstruction — 报错路径", () => {
	it("空行报错", () => {
		expect(() => parseInstruction("   ")).toThrow(/空行/);
	});

	it("缺少 = 报错", () => {
		expect(() => parseInstruction("hp + bonus")).toThrow(/缺少 "="/);
	});

	it("缺少 target 报错", () => {
		expect(() => parseInstruction(" = a + b")).toThrow(/缺少 target/);
	});

	it("缺少右侧表达式报错", () => {
		expect(() => parseInstruction("hp =   ")).toThrow(/右侧表达式/);
	});

	it("函数式使用了非一元运算符报错", () => {
		// max 是合法标识符、能命中函数式正则，但不属于一元运算符集合，应被拒绝。
		expect(() => parseInstruction("y = max(x)")).toThrow(/不支持的函数式一元运算符/);
	});

	it("两 token 但首个不是一元运算符报错", () => {
		expect(() => parseInstruction("y = + x")).toThrow(/期望一元 op 或二元/);
	});

	it("单 token（右侧只有一个操作数）报错", () => {
		expect(() => parseInstruction("y = x")).toThrow(/token 不足/);
	});
});

describe("parsePipeline", () => {
	it("逐行解析多条指令", () => {
		const src = "a = 1 + 2\nb = a * 3";
		expect(parsePipeline(src)).toHaveLength(2);
	});

	it("忽略空行、# 注释与 // 注释", () => {
		const src = ["# 头部注释", "", "a = 1 + 2", "  // 行内说明", "b = a * 3", "   "].join("\n");
		const instrs = parsePipeline(src);
		expect(instrs).toHaveLength(2);
		expect(instrs[0].target).toBe("a");
		expect(instrs[1].target).toBe("b");
	});

	it("兼容 CRLF 换行", () => {
		expect(parsePipeline("a = 1 + 2\r\nb = 3 - 1")).toHaveLength(2);
	});
});

describe("serializeInstruction", () => {
	it("序列化二元指令", () => {
		expect(serializeInstruction({ target: "hp", op: "+", a: "base", b: 10 })).toBe("hp = base + 10");
	});

	it("序列化函数式一元指令（b 省略）", () => {
		expect(serializeInstruction({ target: "y", op: "floor", a: "x" })).toBe("y = floor(x)");
	});

	it("非一元且 b 省略时序列化为后缀式 a op", () => {
		expect(serializeInstruction({ target: "y", op: "get", a: "x" })).toBe("y = x get");
	});

	it("含空白的字符串操作数用 JSON 引号包裹", () => {
		expect(serializeInstruction({ target: "r", op: "select", a: "c", b: "yes no" })).toBe('r = c select "yes no"');
	});

	it("空 target 报错", () => {
		expect(() => serializeInstruction({ target: "  ", op: "+", a: 1, b: 2 })).toThrow(/target 为空/);
	});
});

describe("往返（round-trip）不变性", () => {
	const cases: PipelineInstruction[] = [
		{ target: "hp", op: "+", a: "base", b: "bonus" },
		{ target: "x", op: "*", a: 2, b: 3 },
		{ target: "y", op: "floor", a: "x" },
		{ target: "r", op: "select", a: "cond", b: "two words" },
		{ target: "z", op: "clamp", a: -1.5, b: 100 },
	];

	it.each(cases)("parse(serialize(%o)) 还原为等价指令", (instr) => {
		expect(parseInstruction(serializeInstruction(instr))).toEqual(instr);
	});

	it("整段管线序列化再解析保持等价", () => {
		const instrs: PipelineInstruction[] = [
			{ target: "a", op: "+", a: 1, b: 2 },
			{ target: "b", op: "*", a: "a", b: 3 },
			{ target: "c", op: "floor", a: "b" },
		];
		expect(parsePipeline(serializePipeline(instrs))).toEqual(instrs);
	});

	it("中缀一元 op a 序列化时被规范化为函数式 op(a)，语义不变", () => {
		// parse "round 1.5" → {round, a:1.5}; serialize → "round(1.5)"; 再 parse 应一致。
		const first = parseInstruction("y = round 1.5");
		const roundTripped = parseInstruction(serializeInstruction(first));
		expect(roundTripped).toEqual(first);
		expect(serializeInstruction(first)).toBe("y = round(1.5)");
	});
});
