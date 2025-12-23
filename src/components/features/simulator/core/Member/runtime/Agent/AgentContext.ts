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

  // 运行时技能数据，每次技能执行完删除
  /** 当前技能数据 */
  currentSkill?: CharacterSkillWithRelations | null;
  /** 当前技能效果 */
  currentSkillEffect?: SkillEffectWithRelations | null;
  /** 当前技能逻辑 */
  currentSkillLogic?: string | null;
}

export const DefaultAgent: RuntimeContext = {
  owner: undefined,
  currentFrame: 0,
  position: { x: 0, y: 0, z: 0 },
  targetId: "",
  currentSkill: undefined,
  currentSkillEffect: undefined,
  currentSkillLogic: undefined,
};
