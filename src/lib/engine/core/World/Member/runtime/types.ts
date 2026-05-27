import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { MobWithRelations } from "@db/generated/repositories/mob";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { MobAttrKey } from "../types/Mob/MobAttrSchema";
import type { PlayerAttrKey } from "../types/Player/PlayerAttrSchema";

/**
 * 目标：把"共享运行时状态（可序列化，可进 checkpoint）"与"运行时服务（不可序列化）"分离。
 *
 * 设计说明：
 * - 所有字段一律扁平，命名直接对应 BT 黑板契约与 MDSL 引用（$currentSkill / $currentTimeMs 等）。
 * - BT 执行期直接消费这些字段；StatContainer、services、订阅器等成员组件通过 capabilities 注入。
 * - FSM 为这些字段的唯一写入方；BT action 通过 capabilities 请求外部组件执行副作用。
 */
export interface MemberSharedRuntime<TExtraAttrKey extends string = never> extends Record<string, unknown> {
	memberId: string;
	name: string;
	campId: string;
	teamId: string;
	tickIndex: number;
	currentTimeMs: number;
	deltaTimeMs: number;
	position: { x: number; y: number; z: number };
	targetId: string;
	statusTags: string[];
	skillCooldowns: number[];
	/** 当前正在处理的技能（FSM 在"添加待处理技能"时写入，"清空待处理技能"时清空）。 */
	currentSkill: {
		data: CharacterSkillWithRelations;
		activeVariant: SkillVariantWithRelations;
		lifecycle: {
			/** 当前技能生命周期的四段毫秒。 */
			startupMs: number;
			chargingMs: number;
			chantingMs: number;
			actionMs: number;
		};
	} | null;
	/** 上一次释放的技能，用于连击判定等。 */
	previousSkill: CharacterSkillWithRelations | null;
}

/** Player 专用 runtime 扩展。 */
export interface PlayerRuntime extends MemberSharedRuntime<PlayerAttrKey> {
	type: "Player";
	skillList: CharacterSkillWithRelations[];
	data: CharacterWithRelations | null;
}

/** Mob 专用 runtime 扩展。 */
export interface MobRuntime extends MemberSharedRuntime<MobAttrKey> {
	type: "Mob";
	skillList: CharacterSkillWithRelations[];
	data: MobWithRelations | null;
}
