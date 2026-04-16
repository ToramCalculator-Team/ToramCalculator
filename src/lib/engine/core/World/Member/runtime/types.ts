import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";

/**
 * 目标：把"共享运行时状态（可序列化，可进 checkpoint）"与"运行时服务（不可序列化）"分离。
 *
 * 设计说明：
 * - 所有字段一律扁平，命名直接对应 BT 契约（BtContext）与 MDSL 引用（$currentSkill* / $currentFrame 等）。
 * - BT 执行期通过 `Object.create(runtime)` 作为原型链父节点直接消费这些字段，无需再做一层 get/set 映射。
 * - FSM 为这些字段的唯一写入方；BT 仅读取。
 */
export interface MemberSharedRuntime {
	currentFrame: number;
	position: { x: number; y: number; z: number };
	targetId: string;
	statusTags: string[];
}

/** Player 专用 runtime 扩展。 */
export interface PlayerRuntime extends MemberSharedRuntime {
	type: "Player";
	skillList: CharacterSkillWithRelations[];
	skillCooldowns: number[];

	/** 当前正在处理的技能（FSM 在"添加待处理技能"时写入，"清空待处理技能"时清空）。 */
	currentSkill: CharacterSkillWithRelations | null;
	/** 上一次释放的技能，用于连击判定等。 */
	previousSkill: CharacterSkillWithRelations | null;
	/** 当前技能基于武器/副手/防具类型选出的变体。 */
	currentSkillVariant: SkillVariantWithRelations | null;
	/** 当前技能的运行期参数覆盖（来自托环等 runtime 增强）。 */
	currentSkillParams: Record<string, number>;

	/** 当前技能生命周期的四段帧数。FSM 在"执行技能中"进入时一次性计算并写入；BT 只读。 */
	currentSkillStartupFrames: number;
	currentSkillChargingFrames: number;
	currentSkillChantingFrames: number;
	currentSkillActionFrames: number;
	character: CharacterWithRelations | null;
}

/** Mob 专用 runtime 扩展。 */
export interface MobRuntime extends MemberSharedRuntime {
	type: "Mob";
	skillList: CharacterSkillWithRelations[];
	skillCooldowns: number[];
	character: CharacterWithRelations | null;
}
