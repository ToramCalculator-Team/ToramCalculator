import { MemberWithRelations } from "@db/repositories/member";
import { Member } from "../Member";
import { NestedSchema } from "../../dataSys/StatContainer";
import { MobAttrType, createMobStateMachine } from "./MobActor";
import GameEngine from "../../GameEngine";

export class Mob extends Member<MobAttrType> {
  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    targetId: string,
    schema: NestedSchema,
    position?: { x: number; y: number; z: number },
  ) {
    super(createMobStateMachine, engine, campId, teamId, targetId, memberData, schema, position);
  }
}
