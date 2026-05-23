import type { ZodType } from "zod/v4";

export type SchemaWrapperInfo = {
	schema: ZodType;
	nullable: boolean;
	optional: boolean;
	hasDefault: boolean;
};

type SchemaWithPublicParts = ZodType & {
	type: string;
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

export function schemaType(schema: ZodType): string {
	return (schema as SchemaWithPublicParts).type;
}

/**
 * 表单只消费 Zod v4 的公开 schema tree 结构，不把 nullable/default 等 wrapper
 * 当成真实 UI 节点。wrapper 信息单独返回，用于“创建/清空”和默认值生成。
 */
export function unwrapSchema(schema: ZodType): SchemaWrapperInfo {
	let current = schema as SchemaWithPublicParts;
	let nullable = false;
	let optional = false;
	let hasDefault = false;

	while (true) {
		switch (current.type) {
			case "nullable":
				nullable = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "optional":
				optional = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "default":
				hasDefault = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "pipe":
				current = current.in as SchemaWithPublicParts;
				continue;
			default:
				return { schema: current, nullable, optional, hasDefault };
		}
	}
}

export function objectShape(schema: ZodType): Record<string, ZodType> {
	return ((schema as SchemaWithPublicParts).shape ?? {}) as Record<string, ZodType>;
}

export function arrayElement(schema: ZodType): ZodType {
	return (schema as SchemaWithPublicParts).element as ZodType;
}

export function unionOptions(schema: ZodType): ZodType[] {
	return ((schema as SchemaWithPublicParts).options ?? []) as ZodType[];
}

export function unionDiscriminator(schema: ZodType): string | undefined {
	return (schema as SchemaWithPublicParts).def?.discriminator;
}

export function literalValue(schema: ZodType): unknown {
	const values = (schema as SchemaWithPublicParts).values;
	return values ? Array.from(values)[0] : undefined;
}

export function enumOptions(schema: ZodType): string[] {
	return ((schema as SchemaWithPublicParts).options ?? []).map(String);
}

export function isComplexType(type: string): boolean {
	return type === "object" || type === "array" || type === "union" || type === "record";
}

function arrayMinimumLength(schema: ZodType): number {
	const emptyResult = schema.safeParse([]);
	if (emptyResult.success) return 0;
	const minimums = emptyResult.error.issues.map((issue) => {
		if (issue.code !== "too_small" || issue.path.length !== 0) return 0;
		const detail = issue as { origin?: unknown; minimum?: unknown };
		return detail.origin === "array" && typeof detail.minimum === "number" ? detail.minimum : 0;
	});
	return Math.max(0, ...minimums);
}

/**
 * 根据 schema 构造“开始编辑”时的最小值。
 * `.default()` 优先交还给 Zod 计算；没有默认值时只补齐可编辑结构，
 * 数组会读取 Zod 的 min length 检查来补足必需项，让“创建”出来的对象尽量是合法起点。
 */
export function createSchemaDefaultValue(schema: ZodType): unknown {
	const defaultResult = schema.safeParse(undefined);
	if (defaultResult.success) return defaultResult.data;

	const { schema: unwrapped, optional } = unwrapSchema(schema);
	switch (schemaType(unwrapped)) {
		case "string":
			return "";
		case "number":
			return 0;
		case "boolean":
			return false;
		case "null":
			return null;
		case "enum":
			return enumOptions(unwrapped)[0] ?? "";
		case "literal":
			return literalValue(unwrapped);
		case "array":
			return Array.from({ length: arrayMinimumLength(unwrapped) }, () =>
				createSchemaDefaultValue(arrayElement(unwrapped)),
			);
		case "object": {
			const value: Record<string, unknown> = {};
			for (const [key, childSchema] of Object.entries(objectShape(unwrapped))) {
				const childValue = createSchemaDefaultValue(childSchema);
				const childInfo = unwrapSchema(childSchema);
				if (childValue !== undefined || !childInfo.optional) {
					value[key] = childValue;
				}
			}
			const parsed = schema.safeParse(value);
			return parsed.success ? parsed.data : value;
		}
		case "union":
			return createSchemaDefaultValue(unionOptions(unwrapped)[0] ?? unwrapped);
		case "record":
			return {};
		default:
			return optional ? undefined : null;
	}
}
