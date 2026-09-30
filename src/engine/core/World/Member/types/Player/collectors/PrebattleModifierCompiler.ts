import * as Enums from "@db/schema/enums";
import type { ModifierSource } from "../../../runtime/AttributeContainer/AttributeContainer";
import {
	compileModifierDslLines,
	type ModifierDslIdentifierResolver,
} from "../../../runtime/AttributeContainer/ModifierDslParser";

/** 战前 DSL 可读取的技能等级和角色装备环境。 */
export type PrebattleModifierEvalContext = {
	skill?: { lv: number };
	skillLv?: number;
	env?: Record<string, unknown>;
};

function buildEnumMap(): Map<string, number> {
	const mapping = new Map<string, number>();
	Object.entries(Enums).forEach(([key, value]) => {
		if (Array.isArray(value) && key.endsWith("_TYPE")) {
			(value as string[]).forEach((v, i) => {
				mapping.set(v, i);
				mapping.set(v.toLowerCase(), i);
			});
		}
	});
	return mapping;
}

// DSL 中的枚举标识符需要在编译阶段解析为 schema 数组索引。
const ENUM_MAP = buildEnumMap();

const resolvePrebattleEnumIdentifier: ModifierDslIdentifierResolver = (name) =>
	ENUM_MAP.get(name) ?? ENUM_MAP.get(name.toLowerCase());

/** 将角色数据中的枚举值转换为 DSL 使用的数值索引。 */
export function mapPrebattleEnumValueToIndex(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const mapped = ENUM_MAP.get(value) ?? ENUM_MAP.get(value.toLowerCase());
		if (mapped !== undefined) return mapped;
	}
	return 0;
}

function buildPrebattleModifierExpressionScope(ctx: PrebattleModifierEvalContext): Record<string, unknown> {
	const skillLv = Number(ctx.skillLv ?? ctx.skill?.lv ?? 0) || 0;
	return {
		...(ctx.env ?? {}),
		skill: { lv: skillLv },
		skillLv,
	};
}

/** 为一组 modifier DSL 注入统一上下文、枚举解析和来源 provenance。 */
export function compilePrebattleModifierLines<TAttrKey extends string>(
	lines: readonly string[],
	ctx: PrebattleModifierEvalContext,
	source: ModifierSource,
) {
	return compileModifierDslLines<TAttrKey>(lines, {
		source,
		expressionScope: buildPrebattleModifierExpressionScope(ctx),
		resolveIdentifier: resolvePrebattleEnumIdentifier,
	});
}
