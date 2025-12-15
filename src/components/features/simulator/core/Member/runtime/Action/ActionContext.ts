import { MemberType } from "@db/schema/enums";
import type GameEngine from "../../../GameEngine";
import type { BuffManager } from "../Buff/BuffManager";
import type { StatContainer } from "../StatContainer/StatContainer";
import type { PipelineManager } from "./PipelineManager";
import type { SkillEffectLogicV1 } from "../BehaviorTree/SkillEffectLogicType";
import type { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { BTManger } from "../BehaviorTree/BTManager";

/**
 * ActionContext (StageCtx)
 * 
 * 稳定的运行时上下文，供 Stage/Pipeline 统一使用。
 * 
 * 核心原则：
 * - Tree.owner === PipelineManager.run(ctx) === Stage.context（三者必须是同一引用）
 */
export interface ActionContext {
  /** 成员ID */
  id: string;
  /** 成员类型 */
  type: MemberType;
  /** 成员名称 */
  name: string;
  /** 引擎引用 */
  engine: GameEngine;
  /** 当前帧 */
  currentFrame: number;
  /** Buff管理器引用 */
  buffManager: BuffManager;
  /** 属性容器引用 */
  statContainer: StatContainer<string>;
  /** 管线管理器引用 */
  pipelineManager: PipelineManager<any, any>;
  /** 行为树管理器引用 */
  behaviorTreeManager?: BTManger<any>;
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
  currentSkillLogic?: SkillEffectLogicV1 | null;
  
  /** IntentBuffer 引用：用于 BT 节点推送 Intent（可选） */
  intentBuffer?: { push(intent: any): void };
  
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

