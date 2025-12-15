import { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { ExtractAttrPaths, NestedSchema } from "../../runtime/StatContainer/SchemaTypes";
import GameEngine from "../../../GameEngine";
import { createMobStateMachine, MobStateContext, MobEventType } from "./MobStateMachine";
import { MobAttrSchema } from "./MobAttrSchema";
import { MobActionContext, MobActionPool } from "./MobPipelines";
import { BTManger } from "../../runtime/BehaviorTree/BTManager";
import { PipelineManager } from "../../runtime/Action/PipelineManager";
import { BuffManager } from "../../runtime/Buff/BuffManager";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";

export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

export class Mob extends Member<MobAttrType, MobEventType, MobStateContext, MobActionContext, MobActionPool> {
  constructor(
    engine: GameEngine, 
    memberData: MemberWithRelations, 
    campId: string, 
    teamId: string, 
    targetId: string, 
    position?: { x: number; y: number; z: number }
  ) {
    if (!memberData.mob) {
      throw new Error("Mob数据缺失");
    }
    const attrSchema = MobAttrSchema(memberData.mob);
    const statContainer = new StatContainer<MobAttrType>(attrSchema);
    const pipelineManager = new PipelineManager<MobActionContext, MobActionPool>(MobActionPool);
    const buffManager = new BuffManager(statContainer, pipelineManager, engine, memberData.id);
    const actionContext: MobActionContext = {
      id: memberData.id,
      type: memberData.type,
      name: memberData.name,
      engine: engine,
      currentFrame: 0,
      buffManager: buffManager,
      statContainer: statContainer,
      pipelineManager: pipelineManager,
      position: position ?? { x: 0, y: 0, z: 0 },
      targetId: targetId,
    };
    const behaviorTreeManager = new BTManger<MobActionContext>(actionContext);
    // 将 behaviorTreeManager 赋值给 actionContext，供后续使用
    actionContext.behaviorTreeManager = behaviorTreeManager;
    super(createMobStateMachine,
      engine, 
      campId, 
      teamId, 
      targetId, 
      memberData, 
      attrSchema, 
      {
        statContainer: statContainer,
        actionContext: actionContext,
        pipelineManager: pipelineManager,
        buffManager: buffManager,
        behaviorTreeManager: behaviorTreeManager,
      },
      position
    );
  }
}
