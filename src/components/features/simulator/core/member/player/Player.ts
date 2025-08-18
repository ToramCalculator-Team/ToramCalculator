import { MemberWithRelations } from "@db/repositories/member";
import { Member } from "../Member";
import { ExtractAttrPaths, NestedSchema } from "../ReactiveSystem";
import { applyPrebattleModifiers } from "./PrebattleModifiers";
import { playerStateMachine } from "./PlayerStateMachine";
import GameEngine from "../../GameEngine";
import { PlayerAttrSchema } from "./PlayerData";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

export class Player extends Member<PlayerAttrType> {
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
  }
}
