import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import * as Enums from "@db/schema/enums";
import type { RuntimeAttachment } from "../../attachments/RuntimeAttachment";
import {
	compileModifierDslLines,
	type ModifierDslIdentifierResolver,
} from "../../runtime/StatContainer/ModifierDslParser";
import type { ModifierSource, ModifierType } from "../../runtime/StatContainer/StatContainer";

/**
 * Prebattle modifier collector
 * - 收集装备与被动技能的战前常驻 modifier DSL
 * - 将业务来源、表达式上下文和枚举解析注入 DSL parser
 * - 输出 RuntimeAttachment，运行时安装仍由 RuntimeAttachmentInstaller 统一处理
 */

/** 战前 modifier 表达式上下文（支持 skill.lv / skillLv 与装备环境对象）。 */
export type PrebattleModifierEvalContext = {
	skill?: { lv: number };
	skillLv?: number;
	env?: Record<string, unknown>;
};

/** 枚举字符串到数字索引映射（大小写不敏感）。 */
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

const ENUM_MAP = buildEnumMap();

export const resolvePrebattleEnumIdentifier: ModifierDslIdentifierResolver = (name) =>
	ENUM_MAP.get(name) ?? ENUM_MAP.get(name.toLowerCase());

function mapEnumValueToIndex(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const mapped = ENUM_MAP.get(value) ?? ENUM_MAP.get(value.toLowerCase());
		if (mapped !== undefined) return mapped;
	}
	return 0;
}

export function buildPrebattleModifierExpressionScope(ctx: PrebattleModifierEvalContext): Record<string, unknown> {
	const skillLv = Number(ctx.skillLv ?? ctx.skill?.lv ?? 0) || 0;
	return {
		...(ctx.env ?? {}),
		skill: { lv: skillLv },
		skillLv,
	};
}

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

/** 仅接受 string[]，其它类型返回空数组。 */
function toStringArray(value: unknown): string[] {
	return Array.isArray(value) ? (value as string[]) : [];
}

/** 将路径片段格式化为点路径，并将数组索引渲染为 [i] 形式。 */
function formatPathSegments(segments: string[]): string {
	const parts: string[] = [];
	for (const seg of segments) {
		if (/^\d+$/.test(seg) && parts.length > 0) {
			parts[parts.length - 1] = `${parts[parts.length - 1]}[${seg}]`;
		} else {
			parts.push(seg);
		}
	}
	return parts.join(".");
}

/**
 * 为来源生成更语义化的路径：
 * - 装备相关（weapon/subWeapon/armor/option/special）前缀为 equipment.
 * - 其他保持原始路径（如 avatar.top / consumables[0]）。
 */
function formatRootedPathFromCharacter(segments: string[]): string {
	const formatted = formatPathSegments(segments);
	const root = segments[0];
	const equipmentRoots = new Set(["weapon", "subWeapon", "armor", "option", "special"]);
	if (root && equipmentRoots.has(root)) {
		return `equipment.${formatted}`;
	}
	return formatted || "character";
}

/**
 * 收集战前常驻修正：
 * - 装备节点下的 `modifiers: string[]`
 * - 被动技能模板下的 `logic: string[]` 与 `modifiers: string[]`
 */
function collectPrebattleAttachmentModifiers<TAttrKey extends string>(
	memberData: MemberWithRelations,
	activeCharacter?: CharacterWithRelations | null,
) {
	const character = activeCharacter ?? memberData.player?.characters?.[0] ?? null;
	const all: {
		attribute: TAttrKey;
		modifierType: ModifierType;
		value: number;
		source: ModifierSource;
	}[] = [];

	const env = {
		armor: {
			ability: mapEnumValueToIndex(character?.armor?.ability),
		},
		mainWeapon: {
			type: mapEnumValueToIndex(character?.weapon?.type),
		},
		subWeapon: {
			type: mapEnumValueToIndex(character?.subWeapon?.type),
		},
	} as const;

	const visit = (node: unknown, path: string[] = []) => {
		if (!node || typeof node !== "object") return;
		for (const [k, v] of Object.entries(node)) {
			if ((k === "modifiers" || k === "cooking") && Array.isArray(v)) {
				const fullPath = formatRootedPathFromCharacter(path);
				all.push(...compilePrebattleModifierLines<TAttrKey>(toStringArray(v), { env }, {
					id: fullPath,
					name: fullPath,
					type: "equipment" as const,
				}));
			}

			if (Array.isArray(v) && k !== "logic") {
				v.forEach((item, index) => {
					visit(item, [...path, k, index.toString()]);
				});
			} else if (typeof v === "object" && k !== "logic") {
				visit(v, [...path, k]);
			}
		}
	};
	visit(character);

	const skills: unknown[] = Array.isArray(character?.skills) ? character.skills : [];
	for (const skill of skills) {
		const s = skill as {
			id?: unknown;
			lv?: unknown;
			level?: unknown;
			template?: {
				id?: unknown;
				name?: unknown;
				isPassive?: unknown;
				passive?: unknown;
				logic?: unknown;
				modifiers?: unknown;
			};
		};
		const tpl = s.template;
		const isPassive = Boolean(tpl?.isPassive ?? tpl?.passive);
		if (!tpl || !isPassive) continue;
		const lv = Number(s.lv ?? s.level ?? 0) || 0;
		all.push(
			...compilePrebattleModifierLines<TAttrKey>(
				[...toStringArray(tpl.logic), ...toStringArray(tpl.modifiers)],
				{ skill: { lv }, skillLv: lv, env },
				{
					id: `skill:${tpl.id ?? s.id ?? "unknown"}`,
					name: String(tpl.name ?? "passive"),
					type: "skill" as const,
				},
			),
		);
	}

	return all;
}

/**
 * 将战前常驻修正收敛为 RuntimeAttachment。
 *
 * 设计说明：
 * - 同一 ModifierSource 合并为一个 attachment，卸载前缀与历史 source.id 保持一致。
 * - installer 统一写入 StatContainer，避免 Player 构造函数直接修改运行时组件。
 */
export function collectPrebattleModifierAttachments<TAttrKey extends string>(
	memberData: MemberWithRelations,
	activeCharacter?: CharacterWithRelations | null,
): RuntimeAttachment<TAttrKey>[] {
	type MutableModifierAttachment = RuntimeAttachment<TAttrKey> & {
		modifiers: {
			attribute: TAttrKey;
			modifierType: ModifierType;
			value: number;
			source: ModifierSource;
		}[];
	};
	const grouped = new Map<string, MutableModifierAttachment>();
	for (const modifier of collectPrebattleAttachmentModifiers<TAttrKey>(memberData, activeCharacter)) {
		let attachment = grouped.get(modifier.source.id);
		if (!attachment) {
			attachment = {
				source: {
					id: modifier.source.id,
					name: modifier.source.name,
					type: modifier.source.type,
					sourceId: modifier.source.id,
				},
				modifiers: [],
			};
			grouped.set(modifier.source.id, attachment);
		}
		attachment.modifiers.push(modifier);
	}
	return Array.from(grouped.values());
}
