import { MemberWithRelations } from "@db/repositories/member";
import { Member } from "../Member";
import { ExtractAttrPaths, NestedSchema } from "../../dataSys/SchemaTypes";
import GameEngine from "../../GameEngine";
import { createMobStateMachine } from "./MobStateMachine";
import { MobAttrSchema } from "./MobData";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

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
