import { createLogger } from "~/lib/logger";
import type { EngineCharacter, EngineMember } from "../../../../../engineScenarioSchema";
import { BUILT_IN_REGISTLETS_BY_ID, type RegistletRow } from "../../../attachments/BuiltInRegistlets";
import type { RuntimeAttachment } from "../../../attachments/RuntimeAttachment";
import { compilePrebattleModifierLines } from "./PrebattleModifierCompiler";

const log = createLogger("RegistletCollector");

/** 运行输入中的托环只携带实例数据，模板可能来自内置表或内联数据。 */
type CharacterRegistletWithMaybeTemplate = EngineCharacter["registlets"][number] & {
	template?: Partial<RegistletRow> | null;
};

/** 优先使用内置模板，否则校验并规范化输入中的模板快照。 */
function resolveTemplate(ring: CharacterRegistletWithMaybeTemplate): RegistletRow | null {
	const builtIn = BUILT_IN_REGISTLETS_BY_ID.get(ring.templateId);
	if (builtIn) return builtIn;
	const template = ring.template;
	if (!template?.id || !template.name || typeof template.maxLevel !== "number") return null;
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

/** 将托环等级注入 modifier DSL；其它表达式仍交给编译器处理。 */
function substituteLevel(line: string, level: number): string {
	return line.replace(/\{level\}/g, String(level)).replace(/\{levelRate\}/g, String(level / 100));
}

/** 收集托环的 modifier、pipeline、订阅和阈值声明。 */
export function collectRegistletAttachments(
	activeCharacter: EngineCharacter,
	memberData: EngineMember,
): RuntimeAttachment[] {
	const attachments: RuntimeAttachment[] = [];
	const seenTemplateIds = new Set<string>();
	for (const [index, ringValue] of (activeCharacter.registlets ?? []).entries()) {
		const ring = ringValue as CharacterRegistletWithMaybeTemplate;
		const template = resolveTemplate(ring);
		if (!template) {
			log.debug(`托环模板未登记，跳过: ${ring.templateId}`);
			continue;
		}
		// sourceId 以模板 id 为边界，重复模板会互相覆盖和清理，因此显式拒绝。
		if (seenTemplateIds.has(template.id)) {
			log.error(`角色安装了重复托环，跳过重复项: ${template.id} (index=${index})`);
			continue;
		}
		seenTemplateIds.add(template.id);
		const level = Math.max(0, Math.min(ring.level, template.maxLevel));
		const sourceId = `registlet.${template.id}`;
		const modifiers = compilePrebattleModifierLines<string>(
			template.attrModifiers.map((line) => substituteLevel(line, level)),
			{ skill: { lv: level }, skillLv: level },
			{
				key: sourceId,
				name: template.name,
				type: "registlet",
				chain: [
					{ kind: "member", id: memberData.id },
					{ kind: "registlet", id: template.id },
				],
			},
		);
		attachments.push({
			source: { id: template.id, name: template.name, type: "registlet", level, maxLevel: template.maxLevel, sourceId },
			modifiers,
			pipelinePatches: template.pipelinePatches,
			subscriptions: template.subscriptions,
			thresholdWatchers: template.thresholdWatchers as RuntimeAttachment["thresholdWatchers"],
		});
	}
	return attachments;
}
