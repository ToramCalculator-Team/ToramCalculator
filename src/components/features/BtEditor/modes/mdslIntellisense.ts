import { type ZodType, z } from "zod/v4";
import { DefaultAgent } from "~/components/features/simulator/core/Member/runtime/Agent/AgentContext";
import { CommonActions } from "~/components/features/simulator/core/Member/runtime/Agent/GlobalActions";
import { GlobalCondition } from "~/components/features/simulator/core/Member/runtime/Agent/GlobalCondition";

export type MdslPrimitiveType =
	| "string"
	| "number"
	| "boolean"
	| "null"
	| "unknown";

export type MdslTypeSpec =
	| { kind: "primitive"; type: MdslPrimitiveType }
	| { kind: "enum"; values: readonly string[] };

export type MdslParamSpec = {
	/** 仅用于提示/报错信息（MDSL 本身是位置参数） */
	label: string;
	type: MdslTypeSpec;
	/** 参数说明（来自 zod meta/description 或 agent 注释） */
	description?: string;
};

export type MdslCallableKind = "action" | "condition" | "callback" | "guard";

export type MdslCallableSpec = {
	kind: MdslCallableKind;
	name: string;
	/** 动作/条件说明（来自 zod meta/description 或 agent 注释） */
	description?: string;
	params: MdslParamSpec[];
};

export type MdslIntellisenseRegistry = {
	actions: Record<string, MdslCallableSpec>;
	conditions: Record<string, MdslCallableSpec>;
	/** entry/exit/step 这类回调，可先用 action+condition 的并集兜底 */
	callbacks: Record<string, MdslCallableSpec>;
	/** while/until 这类 guard，通常是 condition */
	guards: Record<string, MdslCallableSpec>;
	/** $xxx 的可用属性及其基础类型（不做 TS 级别推断） */
	properties: Record<string, MdslTypeSpec>;
};

const PRIMITIVE = (type: MdslPrimitiveType): MdslTypeSpec => ({
	kind: "primitive",
	type,
});

const getSchemaDescription = (schema: ZodType): string | undefined => {
	// v4: schema.description 是公开字段；另外允许 meta({ description })
	const meta = schema.meta() as unknown;
	if (meta && typeof meta === "object" && meta !== null) {
		const desc = (meta as Record<string, unknown>).description;
		if (typeof desc === "string" && desc.trim()) return desc.trim();
	}
	if (typeof schema.description === "string" && schema.description.trim()) {
		return schema.description.trim();
	}
	return undefined;
};

const isZodObject = (schema: ZodType): schema is z.ZodObject =>
	schema instanceof z.ZodObject;

/**
 * 去掉 optional/nullable/default/pipe 外壳，获得“最贴近输入侧”的基础 schema。
 * 约定：
 * - optional/nullable/default: 使用 v4 公共 API `.unwrap()`
 * - pipe: 取 `.in`（用户输入侧），避免把 transform 后的输出类型当作参数类型
 */
const unwrapSchema = (schema: ZodType): ZodType => {
	// KISS：只处理常见 wrapper，避免深入 Zod 内部实现。
	let current: ZodType = schema;
	const asZodType = (t: z.core.$ZodType): ZodType => t as unknown as ZodType;
	while (true) {
		if (current instanceof z.ZodOptional) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodNullable) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodDefault) {
			current = asZodType(current.unwrap());
			continue;
		}
		if (current instanceof z.ZodPipe) {
			current = asZodType(current.in);
			continue;
		}
		break;
	}
	return current;
};

const getEnumValues = (schema: ZodType): readonly string[] | null => {
	const unwrapped = unwrapSchema(schema);
	if (unwrapped instanceof z.ZodEnum) {
		// v4: options 可能包含 string | number（取 string 即可用于补全）
		return unwrapped.options.filter((v): v is string => typeof v === "string");
	}
	if (unwrapped instanceof z.ZodLiteral) {
		// v4: 使用 `.values`（Set）；`.value` 是 legacy 且多值会抛错
		const values = Array.from(unwrapped.values).filter(
			(v): v is string => typeof v === "string",
		);
		return values.length ? values : null;
	}
	if (unwrapped instanceof z.ZodUnion) {
		// v4: union.options 是公开 API
		const unionOptions = unwrapped.options as unknown as ZodType[];
		const values: string[] = [];
		for (const opt of unionOptions) {
			const v = getEnumValues(opt);
			if (!v) return null;
			values.push(...v);
		}
		return values;
	}
	return null;
};

const getTypeSpec = (schema: ZodType): MdslTypeSpec => {
	const unwrapped = unwrapSchema(schema);
	const enumValues = getEnumValues(unwrapped);
	if (enumValues) return { kind: "enum", values: enumValues };
	if (unwrapped instanceof z.ZodString) return PRIMITIVE("string");
	if (unwrapped instanceof z.ZodNumber) return PRIMITIVE("number");
	if (unwrapped instanceof z.ZodBoolean) return PRIMITIVE("boolean");
	if (unwrapped instanceof z.ZodNull) return PRIMITIVE("null");
	return PRIMITIVE("unknown");
};

const getZodObjectShape = (schema: z.ZodObject): Record<string, ZodType> => {
	// v4: ZodObject.shape 是公开字段
	return schema.shape as unknown as Record<string, ZodType>;
};

const flattenObjectSchemaToParams = (
	schema: ZodType,
	prefix = "",
): MdslParamSpec[] => {
	const unwrapped = unwrapSchema(schema);
	if (!isZodObject(unwrapped)) {
		// 非 object：在 MDSL 里仍然只能用位置参数表示，先给一个 unknown 占位提示
		return [{ label: prefix || "input", type: getTypeSpec(unwrapped) }];
	}

	const shape = getZodObjectShape(unwrapped);
	const result: MdslParamSpec[] = [];
	for (const [key, child] of Object.entries(shape)) {
		const label = prefix ? `${prefix}.${key}` : key;
		const childUnwrapped = unwrapSchema(child);
		if (isZodObject(childUnwrapped)) {
			result.push(...flattenObjectSchemaToParams(childUnwrapped, label));
		} else {
			result.push({
				label,
				type: getTypeSpec(childUnwrapped),
				description: getSchemaDescription(childUnwrapped),
			});
		}
	}
	return result;
};

const buildCallableSpec = (
	kind: MdslCallableKind,
	name: string,
	inputSchema: ZodType,
): MdslCallableSpec => {
	return {
		kind,
		name,
		description: getSchemaDescription(inputSchema),
		params: flattenObjectSchemaToParams(inputSchema),
	};
};

const inferPropertyTypesFromDefaultAgent = (): Record<string, MdslTypeSpec> => {
	const props: Record<string, MdslTypeSpec> = {};
	for (const [key, value] of Object.entries(DefaultAgent)) {
		if (typeof value === "string") props[key] = PRIMITIVE("string");
		else if (typeof value === "number") props[key] = PRIMITIVE("number");
		else if (typeof value === "boolean") props[key] = PRIMITIVE("boolean");
		else if (value === null) props[key] = PRIMITIVE("unknown");
		else props[key] = PRIMITIVE("unknown");
	}
	return props;
};

export const defaultMdslIntellisenseRegistry = (): MdslIntellisenseRegistry => {
	const actions: Record<string, MdslCallableSpec> = {};
	for (const [name, action] of Object.entries(CommonActions)) {
		const inputSchema = action[0] as ZodType;
		actions[name] = buildCallableSpec("action", name, inputSchema);
	}

	const conditions: Record<string, MdslCallableSpec> = {};
	for (const [name, cond] of Object.entries(GlobalCondition)) {
		const inputSchema = cond[0] as ZodType;
		conditions[name] = buildCallableSpec("condition", name, inputSchema);
	}

	// 轻量策略：callback = action ∪ condition；guard = condition
	const callbacks: Record<string, MdslCallableSpec> = {
		...actions,
		...conditions,
	};
	const guards: Record<string, MdslCallableSpec> = { ...conditions };

	return {
		actions,
		conditions,
		callbacks,
		guards,
		properties: inferPropertyTypesFromDefaultAgent(),
	};
};

/**
 * 轻量解析用户 Agent（class Agent { ... }）：
 * - 提取方法名 + 参数名（用于补全与 signature help）
 * - 提取字段 / getter / setter 名（用于 $xxx 补全）
 *
 * 注意：这是“编辑器体验”用途，不追求 100% 语法完备。
 */
export const mergeMdslRegistryWithAgentSource = (
	base: MdslIntellisenseRegistry,
	agentSource: string,
): MdslIntellisenseRegistry => {
	const src = agentSource ?? "";
	const classMatch = src.match(/class\s+Agent\b[\s\S]*?\{([\s\S]*)\}\s*$/m);
	const body = classMatch?.[1] ?? src;

	const next: MdslIntellisenseRegistry = {
		actions: { ...base.actions },
		conditions: { ...base.conditions },
		callbacks: { ...base.callbacks },
		guards: { ...base.guards },
		properties: { ...base.properties },
	};

	// ========= 轻量 top-level 扫描（避免把方法体内的 if/for/switch 当成“方法声明”） =========
	// 允许中文方法名：使用 Unicode 属性类（JS/TS 标识符的子集）
	const IDENT_START = String.raw`[\p{L}_$]`;
	const IDENT_PART = String.raw`[\p{L}\p{N}_$]`;
	const IDENT = `${IDENT_START}${IDENT_PART}*`;

	const stripLine = (line: string) => {
		// 去掉行注释
		const noLineComment = line.replace(/\/\/.*$/, "");
		// 粗略去掉字符串，避免大括号计数被干扰
		return noLineComment
			.replace(/"([^"\\]|\\.)*"/g, '""')
			.replace(/'([^'\\]|\\.)*'/g, "''")
			.replace(/`([^`\\]|\\.)*`/g, "``");
	};

	const countChar = (s: string, ch: string) => {
		let c = 0;
		for (let i = 0; i < s.length; i++) if (s[i] === ch) c++;
		return c;
	};

	const blockedNames = new Set([
		"if",
		"for",
		"while",
		"switch",
		"catch",
		"try",
		"else",
		"return",
		"function",
	]);

	let pendingDoc: string | undefined;
	let inDoc = false;
	let docLines: string[] = [];
	let depth = 0;

	const applyMemberDoc = () => {
		const desc = pendingDoc;
		pendingDoc = undefined;
		return desc;
	};

	const lines = body.split("\n");
	for (const rawLine of lines) {
		const line = rawLine;
		const trimmed = line.trim();

		// JSDoc accumulate at top-level
		if (depth === 0) {
			if (!inDoc && trimmed.startsWith("/**")) {
				inDoc = true;
				docLines = [trimmed];
			} else if (inDoc) {
				docLines.push(trimmed);
				if (trimmed.includes("*/")) {
					inDoc = false;
					pendingDoc = docLines
						.join("\n")
						.replace(/^\/\*\*/g, "")
						.replace(/\*\/$/g, "")
						.split("\n")
						.map((l) => l.replace(/^\s*\*\s?/, "").trim())
						.filter(Boolean)
						.join("\n");
				}
			}
		}

		// 只在 depth===0 的情况下识别成员
		if (depth === 0 && !inDoc) {
			// getter/setter
			{
				const m = trimmed.match(
					new RegExp(`^(get|set)\\s+(${IDENT})\\s*\\(`, "u"),
				);
				if (m) {
					const name = m[2] ?? "";
					if (name && !blockedNames.has(name)) {
						next.properties[name] = PRIMITIVE("unknown");
					}
				}
			}

			// 字段：foo = ... 或 foo: type = ...
			{
				const m = trimmed.match(
					new RegExp(`^(${IDENT})\\s*(?::[^=;\\n]+)?=\\s*`, "u"),
				);
				if (m) {
					const name = m[1] ?? "";
					if (name && name !== "constructor" && !blockedNames.has(name)) {
						next.properties[name] = PRIMITIVE("unknown");
					}
				}
			}

			// 方法（含 async / 访问修饰符），排除 constructor/关键字
			{
				const m = trimmed.match(
					new RegExp(
						`^(?:public|private|protected)?\\s*(?:async\\s+)?(${IDENT})\\s*\\(([^)]*)\\)\\s*\\{`,
						"u",
					),
				);
				if (m) {
					const name = (m[1] ?? "").trim();
					if (name && name !== "constructor" && !blockedNames.has(name)) {
						const argsRaw = (m[2] ?? "").trim();
						const argNames = argsRaw
							? argsRaw
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean)
									.map((s) => s.replace(/=.*$/, "").trim())
									.map((s) => s.replace(/:\s*[\s\S]*$/, "").trim())
							: [];

						const spec: MdslCallableSpec = {
							kind: "action",
							name,
							description: applyMemberDoc(),
							params: argNames.map((p) => ({
								label: p,
								type: PRIMITIVE("unknown"),
							})),
						};

						next.actions[name] = spec;
						next.conditions[name] = { ...spec, kind: "condition" };
						next.callbacks[name] = { ...spec, kind: "callback" };
						next.guards[name] = { ...spec, kind: "guard" };
					}
				}
			}
		}

		// update depth
		const safe = stripLine(line);
		depth += countChar(safe, "{");
		depth -= countChar(safe, "}");
		if (depth < 0) depth = 0;
	}

	return next;
};
