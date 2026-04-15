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
	/**
	 * 当前技能参数。
	 *
	 * 职责：
	 * - 存放“本次技能执行”已经解析完成的托环技能参数
	 * - 作为行为树、技能管线读取的统一入口
	 *
	 * 目的：
	 * - 让托环只负责给技能提供数值参数，不直接改行为树结构
	 * - 让技能整体照常执行，只在树内条件节点、Agent getter、公式里读取这些参数
	 *
	 * 说明：
	 * - 参数值统一为 number
	 * - 参数是否生效，仍由技能自己的行为树、Agent getter 或公式显式读取这些 key 决定
	 */
	currentSkillParams: Record<string, number>;
	/** 机体配置信息 */
	character: CharacterWithRelations | null;

	/**
	 * 预编译的技能效果逻辑缓存（effectId -> string）
	 * - 用于把 workspaceJson 的编译从“施放时”前移到“角色创建时”
	 */
	compiledSkillEffectLogicByEffectId: Record<string, string>;

	/** 当前伤害请求（来自分布式伤害系统） */
	currentDamageRequest:
		| {
				sourceId: string;
				areaId: string;
				damageFormula: string;
				casterSnapshot: Record<string, number>;
				skillLv: number;
				attackCount: number;
				damageCount: number;
				vars: {
					distance: number;
					targetCount: number;
				};
		  }
		| undefined;
}

const playerBtMemory: Record<string, unknown> = {};

export const PlayerRuntimeStateDefaults: PlayerRuntimeState = {
	type: "Player",
	btMemory: playerBtMemory,
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
	currentSkillParams: {},
	character: null,
	compiledSkillEffectLogicByEffectId: {},
	currentDamageRequest: undefined,
};
