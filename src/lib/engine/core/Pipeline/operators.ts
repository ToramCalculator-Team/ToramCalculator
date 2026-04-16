import type { InstructionOp } from "./instruction";

/**
 * 运算符实现注册表。
 * 
 * 说明：
 * - get/eval/select 等需要访问 env/上下文的运算符不在此处实现
 * - 这里仅放“纯函数”数值运算
 */

export type BinaryOpImpl = (a: number, b: number) => number;
export type UnaryOpImpl = (a: number) => number;

export const unaryOperators: Record<Extract<InstructionOp, "floor" | "ceil" | "round" | "abs" | "not">, UnaryOpImpl> = {
	floor: (a) => Math.floor(a),
	ceil: (a) => Math.ceil(a),
	round: (a) => Math.round(a),
	abs: (a) => Math.abs(a),
	not: (a) => (a ? 0 : 1),
};

export const binaryOperators: Partial<Record<InstructionOp, BinaryOpImpl>> = {
	"+": (a, b) => a + b,
	"-": (a, b) => a - b,
	"*": (a, b) => a * b,
	"/": (a, b) => a / b,
	"%": (a, b) => a % b,
	"^": (a, b) => a ** b,
	max: (a, b) => Math.max(a, b),
	min: (a, b) => Math.min(a, b),
	">": (a, b) => (a > b ? 1 : 0),
	">=": (a, b) => (a >= b ? 1 : 0),
	"<": (a, b) => (a < b ? 1 : 0),
	"<=": (a, b) => (a <= b ? 1 : 0),
	"==": (a, b) => (a === b ? 1 : 0),
	"!=": (a, b) => (a !== b ? 1 : 0),
	and: (a, b) => (a && b ? 1 : 0),
	or: (a, b) => (a || b ? 1 : 0),
};

