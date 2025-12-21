import { MemberType } from "@db/schema/enums";
import type GameEngine from "../../../GameEngine";
import type { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { Member } from "../../Member";

/**
 * RuntimeContext
 */
export interface RuntimeContext extends Record<string, unknown> {
  /** 成员引用 */
  owner: Member<any, any, any, any> | undefined;
  /** 当前帧 */
    currentFrame: number;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 成员目标ID */
  targetId: string;
  
  /** 共享黑板（行为树/管线共享，不是 Tree.blackboard） */
  blackboard?: Record<string, unknown>;
  /** 技能相关的共享状态，如魔法炮充能 */
  skillState?: Record<string, unknown>;
  /** Buff 相关的共享状态 */
  buffState?: Record<string, unknown>;
  
  /** 运行时事实：当前技能 */
  currentSkill?: CharacterSkillWithRelations | null;
  /** 运行时事实：当前技能效果 */
  currentSkillEffect?: SkillEffectWithRelations | null;
  /** 运行时事实：当前技能逻辑（用于 buff/area 行为树查询） */
  currentSkillLogic?: string | null;
  
  /** 当前处理的伤害请求（受击者侧使用） */
  currentDamageRequest?: {
    sourceId: string;
    targetId: string;
    skillId: string;
    damageType: "physical" | "magic";
    canBeDodged: boolean;
    canBeGuarded: boolean;
    damageFormula: string;
    extraVars?: Record<string, any>;
    sourceSnapshot?: any;
  };
  /** 最近一次命中判定结果（受击者侧使用） */
  lastHitResult?: {
    hit: boolean;
    dodge: boolean;
    guard: boolean;
  };
}

