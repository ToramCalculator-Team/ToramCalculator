import type {
	AnyChildNodeDefinition,
	AnyNodeDefinition,
	LottoWeightArgument,
	NodeArgument,
	NodeAttributeDefinition,
	NodeGuardDefinition,
	RootNodeDefinition,
	WaitDurationArgument,
} from "../BehaviourTreeDefinition";
import {
	isCompositeNodeDefinition,
	isDecoratorNodeDefinition,
	isLeafNodeDefinition,
} from "../BehaviourTreeDefinitionUtilities";

type PrinterOptions = {
	indent?: string;
};

const DEFAULT_INDENT = "    ";
const IDENTIFIER_DENYLIST = new Set(["true", "false", "null"]);

/**
 * 将 JSON AST 打印为规范化 MDSL。
 *
 * 设计说明：数据库持久化以 MDSL 作为源码格式，JSON AST 仅作为编辑器和运行时的中间结构。
 * printer 不保留历史排版和注释，只保证输出可读、稳定，并可被 MDSL parser 重新读回。
 */
export function convertJSONToMDSL(
	definition: RootNodeDefinition | RootNodeDefinition[],
	options: PrinterOptions = {},
): string {
	const roots = Array.isArray(definition) ? definition : [definition];
	if (roots.length === 0) throw new Error("MDSL printer expected at least one root definition");
	return roots.map((root) => printNode(root, 0, options.indent ?? DEFAULT_INDENT)).join("\n\n");
}

function printNode(node: AnyNodeDefinition, depth: number, indent: string): string {
	if (isCompositeNodeDefinition(node)) {
		return printBlock(printNodeStart(node), node.children ?? [], depth, indent);
	}
	if (isDecoratorNodeDefinition(node)) {
		return printBlock(printNodeStart(node), node.child ? [node.child] : [], depth, indent);
	}
	if (isLeafNodeDefinition(node)) {
		return `${indent.repeat(depth)}${printNodeStart(node)}`;
	}
	throw new Error("MDSL printer received unsupported node type");
}

function printBlock(header: string, children: AnyChildNodeDefinition[], depth: number, indent: string): string {
	const lineIndent = indent.repeat(depth);
	if (children.length === 0) {
		// 设计说明：结构编辑器允许暂存不完整容器，printer 仍输出可读草稿，严格有效性由 parser/保存校验阻断。
		return `${lineIndent}${header} {\n${lineIndent}}`;
	}
	const childLines = children.map((child) => printNode(child, depth + 1, indent)).join("\n");
	return `${lineIndent}${header} {\n${childLines}\n${lineIndent}}`;
}

function printNodeStart(node: AnyNodeDefinition): string {
	const attributes = printAttributes(node);
	switch (node.type) {
		case "root":
			return `root${node.id ? ` [${printIdentifierValue(node.id)}]` : ""}${attributes}`;
		case "sequence":
		case "selector":
		case "parallel":
		case "race":
		case "all":
			return `${node.type}${attributes}`;
		case "lotto":
			return `${node.type}${printOptionalArgumentList(node.weights)}${attributes}`;
		case "repeat":
			return `${node.type}${printOptionalArgumentList(toArray(node.iterations))}${attributes}`;
		case "retry":
			return `${node.type}${printOptionalArgumentList(toArray(node.attempts))}${attributes}`;
		case "flip":
		case "succeed":
		case "fail":
			return `${node.type}${attributes}`;
		case "action":
		case "condition":
			return `${node.type} [${[printIdentifierValue(node.call), ...(node.args ?? []).map(printArgument)].join(", ")}]${attributes}`;
		case "wait":
			return `${node.type}${printOptionalArgumentList(toArray(node.duration))}${attributes}`;
		case "branch":
			return `${node.type} [${printIdentifierValue(node.ref)}]${attributes}`;
		default:
			return assertNever(node);
	}
}

function printAttributes(node: AnyNodeDefinition): string {
	const parts: string[] = [];
	if (node.entry) parts.push(printAttribute("entry", node.entry));
	if (node.step) parts.push(printAttribute("step", node.step));
	if (node.exit) parts.push(printAttribute("exit", node.exit));
	if (node.while) parts.push(printAttribute("while", node.while));
	if (node.until) parts.push(printAttribute("until", node.until));
	return parts.length ? ` ${parts.join(" ")}` : "";
}

function printAttribute(name: "entry" | "step" | "exit", attribute: NodeAttributeDefinition): string;
function printAttribute(name: "while" | "until", attribute: NodeGuardDefinition): string;
function printAttribute(
	name: "entry" | "step" | "exit" | "while" | "until",
	attribute: NodeAttributeDefinition | NodeGuardDefinition,
): string {
	const args = [printIdentifierValue(attribute.call), ...(attribute.args ?? []).map(printArgument)];
	const guardSuffix =
		(name === "while" || name === "until") && (attribute as NodeGuardDefinition).succeedOnAbort ? " then succeed" : "";
	return `${name}(${args.join(", ")})${guardSuffix}`;
}

function printOptionalArgumentList(args?: NodeArgument[] | LottoWeightArgument[]): string {
	if (!args?.length) return "";
	return ` [${args.map(printArgument).join(", ")}]`;
}

function printArgument(argument: NodeArgument | LottoWeightArgument | WaitDurationArgument): string {
	if (argument === null) return "null";
	if (typeof argument === "string") return JSON.stringify(argument);
	if (typeof argument === "number") {
		if (!Number.isFinite(argument)) throw new Error("MDSL printer cannot print non-finite numeric argument");
		return String(argument);
	}
	if (typeof argument === "boolean") return String(argument);
	if (Array.isArray(argument)) {
		return `[${argument.map(printArgument).join(", ")}]`;
	}
	if (typeof argument === "object" && "$" in argument && typeof argument.$ === "string") {
		return `$${printPropertyReference(argument.$)}`;
	}
	if (typeof argument === "object") {
		const entries = Object.entries(argument).map(
			([k, v]) => `${isPlainIdentifier(k) ? k : JSON.stringify(k)}: ${printArgument(v as NodeArgument)}`,
		);
		return `{${entries.join(", ")}}`;
	}
	throw new Error(`MDSL printer cannot print unsupported argument '${JSON.stringify(argument)}'`);
}

function printIdentifierValue(value: string): string {
	if (isPlainIdentifier(value)) return value;
	return JSON.stringify(value);
}

function printPropertyReference(value: string): string {
	return value;
}

function isPlainIdentifier(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed || trimmed !== value) return false;
	if (IDENTIFIER_DENYLIST.has(trimmed) || !Number.isNaN(Number(trimmed)) || trimmed.startsWith("$")) return false;
	return !/[\s[\](){},"]/.test(trimmed);
}

function toArray<T>(value?: T | [T, T]): T[] | undefined {
	if (value === undefined) return undefined;
	return Array.isArray(value) ? value : [value];
}

function assertNever(value: never): never {
	throw new Error(`MDSL printer reached unsupported value '${JSON.stringify(value)}'`);
}
