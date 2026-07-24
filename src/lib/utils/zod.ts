import type { ZodObject, ZodType, z } from "zod/v4";

/**
 * Form 和 ObjRenderer 共用的 Zod schema tree 读取工具。
 * 这里只描述 schema 的运行时结构，不包含表单字段路径或具体渲染规则。
 */

// 同一个 schema 会在递归渲染中被多次读取，因此缓存它的节点类型。
const schemaTypeCache = new WeakMap<ZodType, ZodType["type"]>();

/** 返回 schema 的节点类型；未传入 schema 时返回 `undefined`。 */
export function getZodType(schema?: ZodType) {
	if (!schema) return "undefined";

	const cachedType = schemaTypeCache.get(schema);
	if (cachedType) {
		return cachedType;
	}

	const type = schema.type;

	schemaTypeCache.set(schema, type);
	return type;
}

/** schema 去除 wrapper 后的真实节点，以及原有的空值和默认值信息。 */
export type SchemaWrapperInfo = {
	schema: ZodType;
	nullable: boolean;
	optional: boolean;
	hasDefault: boolean;
};

/**
 * ZodType 的基础类型没有暴露各节点共有的 tree 属性。这里集中描述 Zod v4
 * schema tree 的公开结构，让所有 schema 消费方使用同一套运行时读取规则。
 */
type SchemaWithPublicParts = ZodType & {
	unwrap?: () => ZodType;
	in?: ZodType;
	shape?: Record<string, ZodType>;
	element?: ZodType;
	options?: readonly ZodType[] | readonly string[];
	values?: Set<unknown>;
	def?: {
		discriminator?: string;
	};
};

function schemaParts(schema: ZodType): SchemaWithPublicParts {
	// 这些成员属于 Zod v4 的公开 schema tree，但没有统一声明在 ZodType 基类上。
	return schema as SchemaWithPublicParts;
}

/**
 * renderer 只消费真实数据节点，不把 nullable/default 等 wrapper 当成 UI 节点。
 * wrapper 信息单独返回，由编辑和只读展示分别决定空值行为。
 */
export function unwrapSchema(schema: ZodType): SchemaWrapperInfo {
	let current = schemaParts(schema);
	let nullable = false;
	let optional = false;
	let hasDefault = false;

	while (true) {
		const type = getZodType(current);
		if (type === "nullable" || type === "optional" || type === "default") {
			if (type === "nullable") nullable = true;
			if (type === "optional") optional = true;
			if (type === "default") hasDefault = true;

			const inner = current.unwrap?.();
			if (!inner) throw new Error(`Zod ${type} schema 缺少 unwrap()`);
			current = schemaParts(inner);
			continue;
		}

		if (type === "pipe") {
			if (!current.in) throw new Error("Zod pipe schema 缺少输入节点");
			current = schemaParts(current.in);
			continue;
		}

		return { schema: current, nullable, optional, hasDefault };
	}
}

/** 读取 object schema 的字段及其子 schema。 */
export function objectShape(schema: ZodType): Record<string, ZodType> {
	return schemaParts(schema).shape ?? {};
}

/** 读取 array schema 的元素 schema；传入的节点必须是 array。 */
export function arrayElement(schema: ZodType): ZodType {
	const element = schemaParts(schema).element;
	if (!element) throw new Error("Zod array schema 缺少元素节点");
	return element;
}

/** 读取 union schema 的所有分支 schema。 */
export function unionOptions(schema: ZodType): ZodType[] {
	return (schemaParts(schema).options ?? []).filter((option): option is ZodType => typeof option !== "string");
}

/** 读取 discriminated union 使用的判别字段名；普通 union 返回 undefined。 */
export function unionDiscriminator(schema: ZodType): string | undefined {
	return schemaParts(schema).def?.discriminator;
}

/** 读取 literal schema 的固定值。 */
export function literalValue(schema: ZodType): unknown {
	const values = schemaParts(schema).values;
	return values ? Array.from(values)[0] : undefined;
}

/** 读取 enum schema 中可选的字符串值。 */
export function enumOptions(schema: ZodType): string[] {
	return (schemaParts(schema).options ?? []).map(String);
}

/** 判断节点是否需要继续递归渲染或使用 JSON 编辑器。 */
export function isComplexType(type: string): boolean {
	return type === "object" || type === "array" || type === "union" || type === "record";
}

/**
 * 描述与对象数据 T 每个字段一一对应的 Zod object schema。
 * 约束为 object 而非 Record<string, unknown>，以兼容生成的精确对象类型（如 DB 表类型）。
 */
export type ZodSchemaFor<T extends object> = ZodObject<{
	[K in keyof T]: z.ZodType<T[K]>;
}>;
