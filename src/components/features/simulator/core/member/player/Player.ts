import { MemberWithRelations } from "@db/repositories/member";
import { Member } from "../Member";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";
import { PlayerStateContext, playerStateMachine, PlayerEventType } from "./PlayerStateMachine";
import GameEngine from "../../GameEngine";
import { PlayerAttrSchema } from "./PlayerData";
import { ExtractAttrPaths, NestedSchema } from "../../dataSys/SchemaTypes";
import { PlayerAction, PlayerPipelineDef, playerPipDef, playerPipFunDef } from "./PlayerPipelines";
import { PipelineManager } from "../../pipeline/PipelineManager";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

export class Player extends Member<PlayerAttrType, PlayerEventType, PlayerAction, PlayerPipelineDef, PlayerStateContext> {
  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    targetId: string,
    schema: NestedSchema,
    position?: { x: number; y: number; z: number },
  ) {
    super(
      playerStateMachine, 
      engine, 
      campId, 
      teamId, 
      targetId, 
      memberData, 
      schema, 
      playerPipDef,
      playerPipFunDef,
      position
    );
    
    // Player特有的被动技能初始化
    this.initializePassiveSkills(memberData);
    
    // 应用战前修饰器
    applyPrebattleModifiers(this.statContainer, memberData);
    
    console.log(`🎮 Player [${this.name}] 初始化完成`);
  }


  /**
   * 初始化Player的被动技能
   * 遍历技能树，向管线管理器添加初始化时的技能效果
   */
  private initializePassiveSkills(memberData: MemberWithRelations): void {
    console.log(`✨ Player [${this.name}] 开始初始化被动技能...`);
    
    // TODO: 与实际的技能系统集成
    // 1. 获取Player的角色配置 (memberData.player?.characters)
    // 2. 遍历角色的技能树 (character.skills)
    // 3. 查询技能效果，找到insertTime === "engine_init"的效果
    // 4. 通过buffManager.addBuff()应用这些被动效果
    
    console.log(`✅ Player [${this.name}] 被动技能初始化完成`);
  }
}
