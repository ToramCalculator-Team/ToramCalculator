import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";

/**
 * MobProperty
 * Mob 专用的运行时属性
 */
export interface MobProperty extends Record<string, unknown> {
	blackboard: Record<string, unknown>;
	skillState: Record<string, unknown>;
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
}
export const MobProperty: MobProperty = {
	blackboard: {},
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
};
