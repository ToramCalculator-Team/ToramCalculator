import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";

/**
 * PlayerRuntimeState
 * Player 专用的共享运行时状态
 */
export interface PlayerRuntimeState extends Record<string, unknown> {
	/** 标识符 */
	type: "Player";
	/** 行为树局部记忆 */
	btMemory: Record<string, unknown>;
	/** @deprecated 请使用 btMemory */
	blackboard: Record<string, unknown>;
	/** 技能状态 */
	skillState: Record<string, unknown>;
	/** 状态 */
	buffState: Record<string, unknown>;
	/** 技能列表 */
	skillList: CharacterSkillWithRelations[];
	/** 技能冷却 */
	skillCooldowns: number[];
	/** 正在施放的技能序号 */
	currentSkillIndex: number;
	/** 技能开始帧 */
	skillStartFrame: number;
	/** 技能结束帧 */
	skillEndFrame: number;
	/** 前摇长度帧 */
	currentSkillStartupFrames: number;
	/** 蓄力长度帧 */
	currentSkillChargingFrames: number;
	/** 咏唱长度帧 */
	currentSkillChantingFrames: number;
	/** 发动长度帧 */
	currentSkillActionFrames: number;
	/** 当前技能行为树实例ID */
	currentSkillTreeId: string;
	/** 机体配置信息 */
	character: CharacterWithRelations | null;

	/**
	 * 预编译的技能效果逻辑缓存（effectId -> string）
	 * - 用于把 workspaceJson 的编译从“施放时”前移到“角色创建时”
	 */
	compiledSkillEffectLogicByEffectId: Record<string, string>;

	/** 当前伤害请求（用于调试/管线暂存） */
	currentDamageRequest:
		| {
				sourceId: string;
				targetId: string;
				skillId: string;
				damageType: "physical" | "magic";
				canBeDodged: boolean;
				canBeGuarded: boolean;
				damageFormula: string;
				extraVars?: Record<string, unknown>;
				sourceSnapshot?: Record<string, unknown>;
		  }
		| undefined;
}

const playerBtMemory: Record<string, unknown> = {};

export const PlayerRuntimeStateDefaults: PlayerRuntimeState = {
	type: "Player",
	btMemory: playerBtMemory,
	blackboard: playerBtMemory,
	skillState: {},
	buffState: {},
	skillList: [],
	skillCooldowns: [],
	currentSkillIndex: 0,
	skillStartFrame: 0,
	skillEndFrame: 0,
	currentSkillStartupFrames: 0,
	currentSkillChargingFrames: 0,
	currentSkillChantingFrames: 0,
	currentSkillActionFrames: 0,
	currentSkillTreeId: "",
	character: null,
	compiledSkillEffectLogicByEffectId: {},
	currentDamageRequest: undefined,
};

/** @deprecated 兼容旧命名，请逐步迁移到 PlayerRuntimeState。 */
export type PlayerProperty = PlayerRuntimeState;
/** @deprecated 兼容旧命名，请逐步迁移到 PlayerRuntimeStateDefaults。 */
export const PlayerProperty = PlayerRuntimeStateDefaults;
