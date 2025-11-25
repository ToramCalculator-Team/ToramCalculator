import { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../Member";
import { ExtractAttrPaths, NestedSchema } from "../../dataSys/SchemaTypes";
import GameEngine from "../../GameEngine";
import { createMobStateMachine, MobStateContext, MobEventType } from "./MobStateMachine";
import { MobAttrSchema } from "./MobData";
import { mobPipDef, MobPipelineDef, MobPipelineStages, MobStagePool } from "./MobPipelines";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrType, MobEventType, MobPipelineDef, MobStagePool, MobStateContext> {
  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    targetId: string,
    schema: NestedSchema,
    position?: { x: number; y: number; z: number },
  ) {
    super(createMobStateMachine,
      engine, 
      campId, 
      teamId, 
      targetId, 
      memberData, 
      schema, 
      mobPipDef,
      MobPipelineStages,
      position);
  }
}
