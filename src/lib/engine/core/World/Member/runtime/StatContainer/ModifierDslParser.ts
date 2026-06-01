import { parse, tokenizer } from "acorn";
import { createLogger } from "~/lib/Logger";
import { type ModifierSource, ModifierType } from "./StatContainerTypes";

const log = createLogger("ModifierDslParser");

export type ModifierDslIdentifierResolver = (name: string) => number | string | boolean | undefined;

export interface ModifierDslCompileContext {
	source: ModifierSource;
	evaluateExpression?: (expression: string) => number | boolean;
	expressionScope?: Record<string, unknown>;
	resolveIdentifier?: ModifierDslIdentifierResolver;
}

/** DSL 编译结果直接对齐 `StatContainer.addModifier` 需要的业务参数。 */
export interface CompiledModifierDsl<TAttrKey extends string = string> {
	attribute: TAttrKey;
	modifierType: ModifierType;
	value: number;
	source: ModifierSource;
}

type ModifierDslToken = {
	type: { label: string };
	value?: string | number;
	start: number;
	end: number;
};

function tokenizeModifierDsl(line: string): ModifierDslToken[] {
	const tk = tokenizer(line, { ecmaVersion: 2020 });
	const tokens: ModifierDslToken[] = [];
	while (true) {
		const token = tk.getToken() as ModifierDslToken;
		tokens.push(token);
		if (token.type?.label === "eof") break;
	}
	return tokens;
}

function isComparisonToken(token: ModifierDslToken | undefined): boolean {
	const label = token?.type?.label;
	const value = token?.value;
	return (
		label === "==/!=" ||
		label === "</>" ||
		label === "<=" ||
		label === ">=" ||
		label === "==" ||
		label === "!=" ||
		label === "===" ||
		label === "!==" ||
		label === "<" ||
		label === ">" ||
		value === "==" ||
		value === "!=" ||
		value === "===" ||
		value === "!==" ||
		value === "<" ||
		value === ">" ||
		value === "<=" ||
		value === ">="
	);
}

function findTopLevelAnd(tokens: readonly ModifierDslToken[]): number {
	let depth = 0;
	for (let idx = 0; idx < tokens.length; idx++) {
		const label = tokens[idx].type?.label;
		if (label === "(") depth++;
		else if (label === ")") depth = Math.max(0, depth - 1);
		else if (depth === 0 && label === "&&") return idx;
	}
	return -1;
}

function formatLiteral(value: unknown): string {
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "string") return JSON.stringify(value);
	if (value === null) return "null";
	return "undefined";
}

function expressionToJs(
	node: any,
	scopeKeys: ReadonlySet<string>,
	resolveIdentifier?: ModifierDslIdentifierResolver,
): string {
	switch (node.type) {
		case "Program": {
			if (node.body.length !== 1 || node.body[0].type !== "ExpressionStatement") {
				throw new Error("invalid expression");
			}
			return expressionToJs(node.body[0].expression, scopeKeys, resolveIdentifier);
		}
		case "ExpressionStatement":
			return expressionToJs(node.expression, scopeKeys, resolveIdentifier);
		case "Literal": {
			if (typeof node.value === "string") {
				const resolved = resolveIdentifier?.(node.value);
				return formatLiteral(resolved ?? node.value);
			}
			return formatLiteral(node.value);
		}
		case "Identifier": {
			if (scopeKeys.has(node.name)) return node.name;
			if (node.name === "undefined" || node.name === "NaN" || node.name === "Infinity") return node.name;
			const resolved = resolveIdentifier?.(node.name);
			if (resolved !== undefined) return formatLiteral(resolved);
			throw new Error(`unknown identifier: ${node.name}`);
		}
		case "MemberExpression": {
			const object = expressionToJs(node.object, scopeKeys, resolveIdentifier);
			if (node.computed) {
				return `${object}[${expressionToJs(node.property, scopeKeys, resolveIdentifier)}]`;
			}
			if (node.property?.type !== "Identifier") {
				throw new Error("unsupported member expr");
			}
			return `${object}.${node.property.name}`;
		}
		case "UnaryExpression": {
			const gap = node.operator.length > 1 ? " " : "";
			return `(${node.operator}${gap}${expressionToJs(node.argument, scopeKeys, resolveIdentifier)})`;
		}
		case "BinaryExpression": {
			const left = expressionToJs(node.left, scopeKeys, resolveIdentifier);
			const right = expressionToJs(node.right, scopeKeys, resolveIdentifier);
			if (node.operator === "^") return `Math.pow(${left}, ${right})`;
			return `(${left} ${node.operator} ${right})`;
		}
		case "LogicalExpression":
			return `(${expressionToJs(node.left, scopeKeys, resolveIdentifier)} ${node.operator} ${expressionToJs(node.right, scopeKeys, resolveIdentifier)})`;
		case "ConditionalExpression":
			return `(${expressionToJs(node.test, scopeKeys, resolveIdentifier)} ? ${expressionToJs(node.consequent, scopeKeys, resolveIdentifier)} : ${expressionToJs(node.alternate, scopeKeys, resolveIdentifier)})`;
		case "ParenthesizedExpression":
			return `(${expressionToJs(node.expression, scopeKeys, resolveIdentifier)})`;
		default:
			throw new Error(`unsupported node: ${node.type}`);
	}
}

/**
 * 计算 modifier DSL 内部的纯表达式片段。
 *
 * 设计说明：
 * - 本函数不解析整条 modifier DSL，调用方必须先剥离外层 `+/-/=` 与尾部 `%`。
 * - 裸枚举与字符串枚举通过 resolver 转成数值，保留旧战前 modifier 数据的写法。
 */
export function evaluateModifierDslExpression(
	expression: string,
	scope: Record<string, unknown> = {},
	resolveIdentifier?: ModifierDslIdentifierResolver,
): number | boolean {
	const trimmed = expression.trim();
	if (!trimmed) return 0;
	const ast = parse(trimmed, { ecmaVersion: 2020, sourceType: "script" });
	const scopeKeys = new Set(Object.keys(scope));
	const compiledExpression = expressionToJs(ast, scopeKeys, resolveIdentifier);
	const names = Object.keys(scope);
	const values = names.map((name) => scope[name]);
	const runner = new Function(...names, `"use strict"; return (${compiledExpression});`) as (
		...args: unknown[]
	) => unknown;
	const value = runner(...values);
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return 0;
}

function evaluateExpressionFragment(expression: string, context: ModifierDslCompileContext): number | boolean {
	if (context.evaluateExpression) return context.evaluateExpression(expression);
	return evaluateModifierDslExpression(expression, context.expressionScope ?? {}, context.resolveIdentifier);
}

function coerceExpressionNumber(value: number | boolean, expression: string): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "boolean") return value ? 1 : 0;
	log.warn(`modifier DSL 表达式结果不是有限数字，按 0 处理: ${expression}`);
	return 0;
}

function readModifierDslOperator(source: string, token: ModifierDslToken): "+" | "-" | "=" | null {
	const raw = source.slice(token.start, token.end).trim();
	if (raw === "+" || raw === "-" || raw === "=") return raw;
	if (token.value === "+" || token.value === "-" || token.value === "=") return token.value;
	if (token.type?.label === "=") return "=";
	return null;
}

/**
 * 编译一条 modifier DSL。
 *
 * 支持示例：
 * - `element = light`
 * - `atk.p + 6%`
 * - `atk + -6`
 * - `armor.ability == Light && distanceDmg.short + 11%`
 */
export function compileModifierDslLine<TAttrKey extends string = string>(
	line: string,
	context: ModifierDslCompileContext,
): CompiledModifierDsl<TAttrKey> | null {
	const source = context.source;
	const s = String(line || "").trim();
	if (!s) return null;
	const tokens = tokenizeModifierDsl(s);

	const andIndex = findTopLevelAnd(tokens);
	if (andIndex !== -1) {
		const condExpr = s.slice(0, tokens[andIndex].start).trim();
		const rhsStart = tokens[andIndex + 1]?.start;
		const rhsExpr = typeof rhsStart === "number" ? s.slice(rhsStart).trim() : "";
		const condValue = Number(evaluateExpressionFragment(condExpr, context));
		if (!condValue) return null;
		return compileModifierDslLine<TAttrKey>(rhsExpr, context);
	}

	let i = 0;
	const expect = (label: string) => tokens[i] && tokens[i].type?.label === label;
	const take = () => tokens[i++];

	if (!expect("name")) throw new Error("attr expected");
	let attr = String(tokens[i].value) as TAttrKey;
	take();
	while (expect(".")) {
		take();
		if (!expect("name")) throw new Error("attr segment expected");
		attr = `${attr}.${String(tokens[i].value)}` as TAttrKey;
		take();
	}

	if (isComparisonToken(tokens[i])) return null;

	const opTokenCandidate = tokens[i];
	const op = opTokenCandidate ? readModifierDslOperator(s, opTokenCandidate) : null;
	if (!op) {
		log.warn("modifier DSL operator expected after attr", {
			line: s,
			attr,
			next: tokens[i]?.type?.label,
			tokens: tokens.map((t) => t.type.label).join(" "),
		});
		throw new Error("op expected");
	}

	const opToken = take();

	const exprStart = opToken.end;
	let j = tokens.length - 2;
	while (j >= 0 && tokens[j].type?.label === ";") j--;
	let isPercentage = false;
	if (j >= 0 && tokens[j].type?.label === "%") {
		isPercentage = true;
		j--;
	}
	if (j < 0) throw new Error("value expected");
	const exprEnd = tokens[j].end;
	const exprCode = s.slice(exprStart, exprEnd).trim();
	const value = exprCode ? coerceExpressionNumber(evaluateExpressionFragment(exprCode, context), exprCode) : 0;

	if (op === "=") {
		return { attribute: attr, modifierType: ModifierType.BASE_VALUE, value, source };
	}

	return {
		attribute: attr,
		modifierType: isPercentage ? ModifierType.STATIC_PERCENTAGE : ModifierType.STATIC_FIXED,
		value: op === "-" ? -value : value,
		source,
	};
}

/** 编译同一来源的一组 modifier DSL，供 RuntimeAttachment collector 复用。 */
export function compileModifierDslLines<TAttrKey extends string = string>(
	lines: readonly string[],
	context: ModifierDslCompileContext,
): CompiledModifierDsl<TAttrKey>[] {
	const modifiers: CompiledModifierDsl<TAttrKey>[] = [];
	for (const line of lines) {
		const compiled = compileModifierDslLine<TAttrKey>(line, context);
		if (compiled) modifiers.push(compiled);
	}
	return modifiers;
}
