import type { EngineCharacter, EngineMember } from "../../../../engineScenarioSchema";
import type { RuntimeAttachment } from "../../attachments/RuntimeAttachment";
import { collectCharacterPrebattleAttachments } from "./collectors/CharacterPrebattleCollector";
import { collectRegistletAttachments } from "./collectors/RegistletCollector";

/**
 * Player 战前 attachment 的唯一汇总入口。
 * 各来源 collector 只翻译数据，不直接修改 Member；安装由 RuntimeAttachmentInstaller 负责。
 */
export function collectPlayerRuntimeAttachments<TAttrKey extends string = string>(
	activeCharacter: EngineCharacter,
	memberData: EngineMember,
): RuntimeAttachment<TAttrKey>[] {
	return [
		...collectCharacterPrebattleAttachments<TAttrKey>(memberData, activeCharacter),
		...collectRegistletAttachments(activeCharacter, memberData),
	] as RuntimeAttachment<TAttrKey>[];
}
