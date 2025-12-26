import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { RuntimeContext } from "../../runtime/Agent/AgentContext";
import { CommonActions } from "../../runtime/Agent/GlobalActions";
import type { ActionPool } from "../../runtime/Agent/type";

/**
 * PlayerRuntimeContext
 * Player 专用的运行时上下文，扩展 RuntimeContext
 */
export interface PlayerRuntimeContext extends RuntimeContext {
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
	character: CharacterWithRelations;

	/**
	 * 预编译的技能效果逻辑缓存（effectId -> string）
	 * - 用于把 workspaceJson 的编译从“施放时”前移到“角色创建时”
	 */
	compiledSkillEffectLogicByEffectId: Record<string, string>;
}

/**
 * ==================== 玩家管线定义 ====================
 *
 * 设计理念：
 * 1. 管线定义独立于状态机
 * 2. 使用语义化的管线名称（点分命名）
 * 3. 管线只与数据结构（PlayerRuntimeContext）关联
 * 4. 可被状态机和技能逻辑共享调用
 */

/**
 * 玩家可用的管线阶段池
 */
export const PlayerActionPool = {
	...CommonActions,
} as const satisfies ActionPool<PlayerRuntimeContext>;

export type PlayerActionPool = typeof PlayerActionPool;
