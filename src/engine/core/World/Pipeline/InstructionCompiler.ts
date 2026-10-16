import type { Operand, PipelineInstruction } from "./instruction";
import { binaryOperators, unaryOperators } from "./operators";
import type { PipelineValue, PipelineValues } from "./PipelineValues";

export type CompiledPipeline = (values: PipelineValues) => PipelineValues;

type Vars = Record<string, PipelineValue>;

function asNumber(value: PipelineValue | undefined, label: string): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	throw new Error(`PipelineInstruction: ${label} 不是有效 number（实际=${String(value)}）`);
}

function resolveValue(op: Operand, vars: Vars, values: PipelineValues): PipelineValue {
	if (typeof op === "number") return op;
	const numericLiteral = Number(op);
	if (op.trim() !== "" && Number.isFinite(numericLiteral)) return numericLiteral;
	if (Object.hasOwn(vars, op)) return vars[op];
	const key = op.startsWith("input.") ? op.slice("input.".length) : op;
	if (Object.hasOwn(values, key)) return values[key];
	throw new Error(`PipelineInstruction: 未找到值 ${op}`);
}

function resolveNumber(op: Operand, vars: Vars, values: PipelineValues): number {
	return asNumber(resolveValue(op, vars, values), String(op));
}

function parseCommaPair(value: string): [string, string] {
	const index = value.indexOf(",");
	if (index < 0) return [value.trim(), ""];
	return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
}

function resolveGet(who: Operand, path: Operand, values: PipelineValues): number {
	const whoKey = `${String(who)}.${String(path)}`;
	const value = values[whoKey] ?? values[String(path)];
	return asNumber(value, whoKey);
}

export function compilePipeline(instructions: readonly PipelineInstruction[]): CompiledPipeline {
	const frozenInstructions = instructions.map((instruction) => Object.freeze({ ...instruction }));

	return (values) => {
		const vars: Vars = Object.create(null);
		for (const instruction of frozenInstructions) {
			switch (instruction.op) {
				case "get":
					vars[instruction.target] = resolveGet(instruction.a, instruction.b ?? "", values);
					break;
				case "select": {
					const condition = resolveNumber(instruction.a, vars, values);
					if (typeof instruction.b === "number") {
						vars[instruction.target] = condition !== 0 ? instruction.b : 0;
						break;
					}
					const [whenTrue, whenFalse] = parseCommaPair(String(instruction.b ?? ""));
					vars[instruction.target] = resolveValue(condition !== 0 ? whenTrue : whenFalse, vars, values);
					break;
				}
				case "clamp": {
					const value = resolveNumber(instruction.a, vars, values);
					const [minValue, maxValue] =
						typeof instruction.b === "number"
							? [value, value]
							: (parseCommaPair(String(instruction.b ?? "")).map((item) => resolveNumber(item, vars, values)) as [
									number,
									number,
								]);
					vars[instruction.target] = Math.max(minValue, Math.min(value, maxValue));
					break;
				}
				default: {
					if (instruction.b === undefined && instruction.op in unaryOperators) {
						const operator = unaryOperators[instruction.op as keyof typeof unaryOperators];
						vars[instruction.target] = operator(resolveNumber(instruction.a, vars, values));
						break;
					}
					if (instruction.op === "eval") {
						throw new Error("PipelineInstruction: eval 需要由调用方预先转换为 PipelineValues");
					}
					const operator = binaryOperators[instruction.op];
					if (!operator) throw new Error(`PipelineInstruction: 未实现的操作符 ${instruction.op}`);
					vars[instruction.target] = operator(
						resolveNumber(instruction.a, vars, values),
						resolveNumber(instruction.b as Operand, vars, values),
					);
					break;
				}
			}
		}
		return { ...values, ...vars };
	};
}
