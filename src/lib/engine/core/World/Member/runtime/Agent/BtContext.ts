import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { Member } from "../../Member";

/**
 * BT 执行期上下文的最小公共形状。
 *
 * 说明：
 * - BT 上下文由 `BtManager.buildBtContext()` 构建，以 `member.runtime` 作为原型链父节点。
 * - 字段全部扁平，直接对应 `MemberSharedRuntime` 的同名字段，MDSL 可直接 `$字段名` 引用。
 * - FSM 是这些字段的唯一写入方；BT 仅读取。
 */
export interface BtContext {
	owner?: Member<any, any, any, any>;
	statusTags: string[];
	targetId: string;
	position: { x: number; y: number; z: number };

	currentSkill?: CharacterSkillWithRelations | null;
	previousSkill?: CharacterSkillWithRelations | null;
	currentSkillVariant?: SkillVariantWithRelations | null;
	currentSkillParams?: Record<string, number>;

	/** 当前技能生命周期的四段帧数（FSM 在"执行技能中"进入时由管线计算一次，BT 只读）。 */
	currentSkillStartupFrames?: number;
	currentSkillChargingFrames?: number;
	currentSkillChantingFrames?: number;
	currentSkillActionFrames?: number;
}
