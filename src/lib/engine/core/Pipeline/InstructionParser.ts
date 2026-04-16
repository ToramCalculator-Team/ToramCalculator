import type { InstructionOp, Operand, PipelineInstruction, PipelineInstructionString } from "./instruction";

/**
 * 指令解析/序列化。
 * 
 * 支持的输入形式：
 * - 规范形式：`target = a op b`
 * - 一元函数形式：`target = floor(x)` / `target = abs(x)` / `target = not(x)`
 *
 * 约定：
 * - 若字符串操作数包含空白字符，序列化时会用 JSON 字符串（双引号）包裹。
 */

const unaryOps = new Set<InstructionOp>(["floor", "ceil", "round", "abs", "not"]);

const numberRe = /^[+-]?(?:\d+\.?\d*|\d*\.?\d+)(?:e[+-]?\d+)?$/i;

const unquote = (s: string): string => {
	const t = s.trim();
	if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
		return t.slice(1, -1);
	}
	return t;
};

export const parseOperand = (token: string): Operand => {
	const t = token.trim();
	const v = unquote(t);
	if (numberRe.test(v)) {
		return Number(v);
	}
	return v;
};

const tokenize = (s: string): string[] => {
	const out: string[] = [];
	let cur = "";
	let quote: '"' | "'" | null = null;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (quote) {
			cur += ch;
			if (ch === quote) quote = null;
			continue;
		}
		if (ch === '"' || ch === "'") {
			cur += ch;
			quote = ch;
			continue;
		}
		if (/\s/.test(ch)) {
			if (cur) {
				out.push(cur);
				cur = "";
			}
			continue;
		}
		cur += ch;
	}
	if (cur) out.push(cur);
	return out;
};

export function parseInstruction(line: PipelineInstructionString): PipelineInstruction {
	const raw = line.trim();
	if (!raw) {
		throw new Error("指令为空行");
	}

	const eqIndex = raw.indexOf("=");
	if (eqIndex < 0) {
		throw new Error(`指令缺少 "="：${raw}`);
	}

	const target = raw.slice(0, eqIndex).trim();
	const rhs = raw.slice(eqIndex + 1).trim();
	if (!target) throw new Error(`指令缺少 target：${raw}`);
	if (!rhs) throw new Error(`指令缺少右侧表达式：${raw}`);

	// 一元函数形式：op(x)
	const fnMatch = rhs.match(/^([A-Za-z_]\w*)\s*\(\s*(.+?)\s*\)$/);
	if (fnMatch) {
		const op = fnMatch[1] as InstructionOp;
		if (!unaryOps.has(op)) {
			throw new Error(`不支持的函数式一元运算符：${op}`);
		}
		const a = parseOperand(fnMatch[2]);
		return { target, op, a };
	}

	const tokens = tokenize(rhs);
	if (tokens.length === 2) {
		// 允许：op a
		const op = tokens[0] as InstructionOp;
		if (!unaryOps.has(op)) {
			throw new Error(`无法解析指令（期望一元 op 或二元 a op b）：${raw}`);
		}
		return { target, op, a: parseOperand(tokens[1]) };
	}

	if (tokens.length < 3) {
		throw new Error(`无法解析指令（token 不足）：${raw}`);
	}

	// 二元形式：a op b（b 允许包含空白，因此拼回去）
	const aToken = tokens[0];
	const opToken = tokens[1] as InstructionOp;
	const bToken = tokens.slice(2).join(" ");

	return {
		target,
		op: opToken,
		a: parseOperand(aToken),
		b: parseOperand(bToken),
	};
}

export function parsePipeline(text: string): PipelineInstruction[] {
	const lines = text
		.split(/\r?\n/g)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));
	return lines.map(parseInstruction);
}

const serializeOperand = (op: Operand): string => {
	if (typeof op === "number") return String(op);
	// 保持原样，但若包含空白则用 JSON 字符串包裹
	return /\s/.test(op) ? JSON.stringify(op) : op;
};

export function serializeInstruction(instr: PipelineInstruction): PipelineInstructionString {
	const target = instr.target.trim();
	if (!target) throw new Error("serializeInstruction: target 为空");

	if (unaryOps.has(instr.op) && instr.b === undefined) {
		return `${target} = ${instr.op}(${serializeOperand(instr.a)})`;
	}

	if (instr.b === undefined) {
		return `${target} = ${serializeOperand(instr.a)} ${instr.op}`;
	}

	return `${target} = ${serializeOperand(instr.a)} ${instr.op} ${serializeOperand(instr.b)}`;
}

export function serializePipeline(instrs: readonly PipelineInstruction[]): string {
	return instrs.map(serializeInstruction).join("\n");
}

