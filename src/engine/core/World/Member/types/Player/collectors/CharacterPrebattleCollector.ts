import type { EngineCharacter, EngineMember } from "../../../../../engineScenarioSchema";
import type { RuntimeAttachment } from "../../../attachments/RuntimeAttachment";
import { runtimeAttachmentSourceId } from "../../../attachments/RuntimeAttachmentSource";
import type { ModifierSource, ModifierType } from "../../../runtime/AttributeContainer/AttributeContainer";
import { compilePrebattleModifierLines, mapPrebattleEnumValueToIndex } from "./PrebattleModifierCompiler";

/** 兼容 schema 中可能出现的动态数组值，避免非字符串值进入 DSL 编译器。 */
function toStringArray(value: unknown): string[] {
	return Array.isArray(value) ? (value as string[]) : [];
}

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

/** 将数据树路径转换为可解释且稳定的 attachment source key。 */
function formatRootedPathFromCharacter(segments: string[]): string {
	const formatted = formatPathSegments(segments);
	const root = segments[0];
	if (root && new Set(["weapon", "subWeapon", "armor", "option", "special"]).has(root)) {
		return `equipment.${formatted}`;
	}
	return formatted || "character";
}

/** 收集装备、料理和被动技能的战前 modifier，尚未写入运行时。 */
function collectModifiers<TAttrKey extends string>(memberData: EngineMember, character: EngineCharacter) {
	const all: {
		attribute: TAttrKey;
		modifierType: ModifierType;
		value: number;
		source: ModifierSource;
	}[] = [];
	const env = {
		armor: { ability: mapPrebattleEnumValueToIndex(character.armor?.ability) },
		mainWeapon: { type: mapPrebattleEnumValueToIndex(character.weapon?.type) },
		subWeapon: { type: mapPrebattleEnumValueToIndex(character.subWeapon?.type) },
	};

	const visit = (node: unknown, path: string[] = []) => {
		if (!node || typeof node !== "object") return;
		for (const [key, value] of Object.entries(node)) {
			if ((key === "modifiers" || key === "cooking") && Array.isArray(value)) {
				const sourceId = formatRootedPathFromCharacter(path);
				all.push(
					...compilePrebattleModifierLines<TAttrKey>(
						toStringArray(value),
						{ env },
						{
							key: sourceId,
							name: sourceId,
							type: "equipment",
							chain: [
								{ kind: "member", id: memberData.id },
								{ kind: "equipment", id: sourceId },
							],
						},
					),
				);
			}
			// logic 只属于被动技能模板，由下面的技能分支按等级和来源单独处理。
			if (Array.isArray(value) && key !== "logic") {
				value.forEach((item, index) => {
					visit(item, [...path, key, index.toString()]);
				});
			} else if (typeof value === "object" && key !== "logic") {
				visit(value, [...path, key]);
			}
		}
	};
	visit(character);

	for (const skill of Array.isArray(character.skills) ? character.skills : []) {
		const current = skill as typeof skill & {
			template?: {
				id?: unknown;
				name?: unknown;
				isPassive?: unknown;
				passive?: unknown;
				logic?: unknown;
				modifiers?: unknown;
			};
		};
		const template = current.template;
		if (!template || !(template.isPassive ?? template.passive)) continue;
		const level = Number(current.lv ?? 0) || 0;
		const id = String(template.id ?? current.id ?? "unknown");
		all.push(
			...compilePrebattleModifierLines<TAttrKey>(
				[...toStringArray(template.logic), ...toStringArray(template.modifiers)],
				{ skill: { lv: level }, skillLv: level, env },
				{
					key: `skill:${id}`,
					name: String(template.name ?? "passive"),
					type: "passive",
					chain: [
						{ kind: "member", id: memberData.id },
						{ kind: "passive", id },
					],
				},
			),
		);
	}
	return all;
}

/** 将角色来源的 modifier 按 source key 合并为 RuntimeAttachment。 */
export function collectCharacterPrebattleAttachments<TAttrKey extends string = string>(
	memberData: EngineMember,
	activeCharacter?: EngineCharacter | null,
): RuntimeAttachment<TAttrKey>[] {
	const character = activeCharacter ?? memberData.character;
	if (!character) return [];
	type MutableAttachment = Omit<RuntimeAttachment<TAttrKey>, "modifiers"> & {
		modifiers: NonNullable<RuntimeAttachment<TAttrKey>["modifiers"]>[number][];
	};
	const grouped = new Map<string, MutableAttachment>();
	for (const modifier of collectModifiers<TAttrKey>(memberData, character)) {
		const sourceId = runtimeAttachmentSourceId({
			id: modifier.source.chain.at(-1)?.id ?? modifier.source.key,
			name: modifier.source.name,
			type: modifier.source.type,
			sourceId: modifier.source.key,
		});
		let attachment = grouped.get(sourceId);
		if (!attachment) {
			attachment = {
				source: {
					id: modifier.source.chain.at(-1)?.id ?? modifier.source.key,
					name: modifier.source.name,
					type: modifier.source.type,
					sourceId,
				},
				modifiers: [],
			};
			grouped.set(sourceId, attachment);
		}
		attachment.modifiers.push(modifier);
	}
	return [...grouped.values()];
}
