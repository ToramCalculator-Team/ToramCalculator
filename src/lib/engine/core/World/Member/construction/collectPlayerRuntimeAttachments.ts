import { createLogger } from "~/lib/Logger";
import type { EngineCharacter, EngineMember } from "../../../engineScenarioSchema";
import { BUILT_IN_REGISTLETS_BY_ID, type RegistletRow } from "../attachments/BuiltInRegistlets";
import type { RuntimeAttachment } from "../attachments/RuntimeAttachment";
import {
	collectPrebattleModifierAttachments,
	compilePrebattleModifierLines,
} from "../types/Player/PrebattleModifierCollector";

const log = createLogger("PlayerRuntimeAttachments");

type CharacterRegistletWithMaybeTemplate = EngineCharacter["registlets"][number] & {
	template?: Partial<RegistletRow> | null;
};

function substituteRegistletLevel(line: string, level: number): string {
	const levelRate = level / 100;
	return line.replace(/\{level\}/g, String(level)).replace(/\{levelRate\}/g, String(levelRate));
}

function resolveRegistletTemplate(ring: CharacterRegistletWithMaybeTemplate): RegistletRow | null {
	const builtIn = BUILT_IN_REGISTLETS_BY_ID.get(ring.templateId);
	if (builtIn) return builtIn;

	const template = ring.template;
	if (!template?.id || !template.name || typeof template.maxLevel !== "number") {
		return null;
	}

	return {
		id: template.id,
		name: template.name,
		maxLevel: template.maxLevel,
		attrModifiers: Array.isArray(template.attrModifiers) ? template.attrModifiers : [],
		pipelinePatches: Array.isArray(template.pipelinePatches) ? template.pipelinePatches : [],
		skillBranchActivators: Array.isArray(template.skillBranchActivators) ? template.skillBranchActivators : [],
		subscriptions: Array.isArray(template.subscriptions) ? template.subscriptions : [],
		thresholdWatchers: Array.isArray(template.thresholdWatchers) ? template.thresholdWatchers : [],
	} as RegistletRow;
}

function collectRegistletAttachments(activeCharacter: EngineCharacter, memberData: EngineMember): RuntimeAttachment[] {
	const attachments: RuntimeAttachment[] = [];
	for (const ring of activeCharacter.registlets as CharacterRegistletWithMaybeTemplate[]) {
		const template = resolveRegistletTemplate(ring);
		if (!template) {
			log.debug(`托环模板未登记，跳过: ${ring.templateId}`);
			continue;
		}

		const level = Math.max(0, Math.min(ring.level, template.maxLevel));
		const sourceId = `registlet.${template.id}`;
		const modifiers = compilePrebattleModifierLines<string>(
			template.attrModifiers.map((line) => substituteRegistletLevel(line, level)),
			{ skill: { lv: level }, skillLv: level },
			{
				key: sourceId,
				name: template.name,
				type: "registlet" as const,
				chain: [
					{ kind: "member", id: memberData.id },
					{ kind: "registlet", id: template.id },
				],
			},
		);

		attachments.push({
			source: {
				id: template.id,
				name: template.name,
				type: "registlet",
				level,
				maxLevel: template.maxLevel,
				sourceId,
			},
			modifiers,
			pipelinePatches: template.pipelinePatches,
			subscriptions: template.subscriptions,
			thresholdWatchers: template.thresholdWatchers as RuntimeAttachment["thresholdWatchers"],
		});
	}
	return attachments;
}

/**
 * 收集 Player 的战前运行时附加效果。
 *
 * 设计说明：
 * - 来源 collector 只翻译数据，不写运行时组件。
 * - installer 在 MemberManager 注入 EventCatalog / evaluator 后统一安装。
 */
export function collectPlayerRuntimeAttachments<TAttrKey extends string = string>(
	activeCharacter: EngineCharacter,
	memberData: EngineMember,
): RuntimeAttachment<TAttrKey>[] {
	return [
		...collectPrebattleModifierAttachments<TAttrKey>(memberData, activeCharacter),
		...collectRegistletAttachments(activeCharacter, memberData),
	] as RuntimeAttachment<TAttrKey>[];
}
