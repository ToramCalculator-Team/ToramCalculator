import { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { ExtractAttrPaths, NestedSchema } from "../../runtime/StatContainer/SchemaTypes";
import GameEngine from "../../../GameEngine";
import { createMobStateMachine, MobStateContext, MobEventType } from "./MobStateMachine";
import { MobAttrSchema } from "./MobAttrSchema";
import { MobActionContext, MobActionPool } from "./MobPipelines";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrType, MobEventType, MobStateContext, MobActionContext, MobActionPool> {
  constructor(
    engine: GameEngine, 
    memberData: MemberWithRelations, 
    campId: string, 
    teamId: string, 
    targetId: string, 
    schema: NestedSchema, 
    actionContext: MobActionContext,
    position?: { x: number; y: number; z: number }
  ) {
    super(createMobStateMachine,
      engine, 
      campId, 
      teamId, 
      targetId, 
      memberData, 
      schema, 
      MobActionPool,
      actionContext,
      position
    );
  }
}
