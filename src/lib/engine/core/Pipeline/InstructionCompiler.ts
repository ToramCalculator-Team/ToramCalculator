import type { Operand, PipelineInstruction } from "./instruction";
import { binaryOperators, unaryOperators } from "./operators";
import type { StageData, StageEnv } from "./stageEnv";

/** 
 * 目标：
 * - 把 `PipelineInstruction[]` 预编译成单个 closure，提高执行性能
 * - 严格保持“纯计算”：除 `env.*` 查询外，不产生副作用
 */

export type CompiledPipeline = (env: StageEnv, input: StageData) => StageData;

type Vars = Record<string, number>;

const asNumber = (v: unknown, label: string): number => {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	throw new Error(`指令执行期：${label} 不是有效 number（实际=${String(v)}）`);
};

const resolveOperand = (op: Operand, vars: Vars, input: StageData, env: StageEnv): number => {
	if (typeof op === "number") return op;

	// 1) 已计算变量
	if (Object.hasOwn(vars, op)) return vars[op]!;

	// 2) env.frame 便捷读取
	if (op === "env.frame" || op === "frame") return env.frame;

	// 3) 显式 input.xxx
	if (op.startsWith("input.")) {
		const key = op.slice("input.".length);
		return asNumber((input as Record<string, unknown>)[key], `input.${key}`);
	}

	// 4) 直接从 input 取同名 key
	if (Object.hasOwn(input, op)) {
		return asNumber((input as Record<string, unknown>)[op], `input.${op}`);
	}

	// 5) fallback：未定义变量默认 0（便于渐进迁移；后续可收紧）
	return 0;
};

const parseCommaPair = (s: string): [string, string] => {
	const idx = s.indexOf(",");
	if (idx < 0) return [s.trim(), ""];
	return [s.slice(0, idx).trim(), s.slice(idx + 1).trim()];
};

export function compilePipeline(instructions: readonly PipelineInstruction[]): CompiledPipeline {
	const instrs = [...instructions];

	return (env, input) => {
		const vars: Vars = Object.create(null);

		for (const instr of instrs) {
			switch (instr.op) {
				case "get": {
					const who = String(instr.a); // 约定："self" | "target"
					const path = String(instr.b ?? "");
					vars[instr.target] = env.stats(who, path);
					break;
				}
				case "eval": {
					const expr = typeof instr.a === "string" ? instr.a : String(instr.a);
					vars[instr.target] = env.eval(expr, { ...input, ...vars });
					break;
				}
				case "select": {
					const cond = resolveOperand(instr.a, vars, input, env);
					const b = instr.b;
					if (typeof b === "number") {
						vars[instr.target] = cond ? b : 0;
						break;
					}
					const [tVal, fVal] = parseCommaPair(String(b ?? ""));
					const chosen = cond ? tVal : fVal;
					vars[instr.target] = resolveOperand(chosen, vars, input, env);
					break;
				}
				case "clamp": {
					const a = resolveOperand(instr.a, vars, input, env);
					if (typeof instr.b === "number") {
						vars[instr.target] = a;
						break;
					}
					const [minToken, maxToken] = parseCommaPair(String(instr.b ?? ""));
					const minV = resolveOperand(minToken, vars, input, env);
					const maxV = resolveOperand(maxToken, vars, input, env);
					vars[instr.target] = Math.max(minV, Math.min(a, maxV));
					break;
				}
				default: {
					// 一元
					if (instr.b === undefined && instr.op in unaryOperators) {
						const a = resolveOperand(instr.a, vars, input, env);
						const impl = unaryOperators[instr.op as keyof typeof unaryOperators];
						vars[instr.target] = impl(a);
						break;
					}

					// 二元（默认）
					const impl = binaryOperators[instr.op];
					if (!impl) {
						throw new Error(`未实现的运算符：${instr.op}`);
					}
					const a = resolveOperand(instr.a, vars, input, env);
					const b = resolveOperand(instr.b as Operand, vars, input, env);
					vars[instr.target] = impl(a, b);
				}
			}
		}

		return { ...input, ...vars };
	};
}

