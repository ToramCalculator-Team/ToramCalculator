import { MemberWithRelations } from "@db/repositories/member";
import { Member } from "../Member";
import { applyPrebattleModifiers } from "./PrebattleModifiers";
import { playerStateMachine } from "./PlayerStateMachine";
import GameEngine from "../../GameEngine";
import { PlayerAttrSchema } from "./PlayerData";
import { CharacterSkillWithRelations } from "@db/repositories/characterSkill";
import { SkillEffectWithRelations } from "@db/repositories/skillEffect";
import { ExtractAttrPaths, NestedSchema } from "../../dataSys/SchemaTypes";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

export class Player extends Member<PlayerAttrType> {
  /** 技能列表 */
  skills: CharacterSkillWithRelations[];
  /** 技能冷却 */
  skillCooldowns: Map<string, number>;
  /** 正在施放的技能效果 */
  skillEffect: SkillEffectWithRelations | null;

  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    targetId: string,
    schema: NestedSchema,
    position?: { x: number; y: number; z: number },
  ) {
    super(playerStateMachine, engine, campId, teamId, targetId, memberData, schema, position);
    applyPrebattleModifiers(this.rs, memberData);
    this.skills = memberData.player?.character?.skills ?? [];
    this.skillCooldowns = new Map();
    this.skills.forEach((skill) => {
      this.skillCooldowns.set(skill.id, 0);
    });
    this.skillEffect = null;
  }
}
