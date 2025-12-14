import { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";
import { PlayerStateContext, playerStateMachine, PlayerEventType } from "./PlayerStateMachine";
import GameEngine from "../../../GameEngine";
import { PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { ExtractAttrPaths, NestedSchema } from "../../runtime/StatContainer/SchemaTypes";
import { PlayerActionPool, type PlayerActionContext } from "./PlayerPipelines";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchemaGenerator>>;

export class Player extends Member<
  PlayerAttrType,
  PlayerEventType,
  PlayerStateContext,
  PlayerActionContext,
  PlayerActionPool
> {
  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    targetId: string,
    schema: NestedSchema,
    actionContext: PlayerActionContext,
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
      PlayerActionPool,
      actionContext,
      position
    );
    // 通过引擎消息通道发送渲染命令（走 Simulation.worker 的 MessageChannel）
    const spawnCmd = {
      type: "render:cmd" as const,
      cmd: {
        type: "spawn" as const,
        entityId: this.id,
        name: this.name,
        position: { x: 0, y: 1, z: 0 },
        seq: 0,
        ts: Date.now(),
      },
    };
    // 引擎统一出口：通过已建立的MessageChannel发送渲染指令
    if (this.engine.postRenderMessage) {
      // 首选方案：使用引擎提供的统一渲染消息接口
      // 这个方法会通过 Simulation.worker 的 MessagePort 将指令发送到主线程
      this.engine.postRenderMessage(spawnCmd);
    } else {
      // 如果引擎的渲染消息接口不可用，记录错误但不使用fallback
      // 这确保我们只使用正确的通信通道，避免依赖全局变量
      console.error(`👤 [${this.name}] 无法发送渲染指令：引擎渲染消息接口不可用`);
    }
    
    // Player特有的被动技能初始化
    this.initializePassiveSkills(memberData);
    
    // 应用战前修饰器
    applyPrebattleModifiers(this.statContainer, memberData);
  }


  /**
   * 初始化Player的被动技能
   * 遍历技能树，向管线管理器添加初始化时的技能效果
   */
  private initializePassiveSkills(memberData: MemberWithRelations): void {
    
    // TODO: 与实际的技能系统集成
    // 1. 获取Player的角色配置 (memberData.player?.characters)
    // 2. 遍历角色的技能树 (character.skills)
    // 3. 查询技能效果，找到insertTime === "engine_init"的效果
    // 4. 通过buffManager.addBuff()应用这些被动效果
    
  }
}
