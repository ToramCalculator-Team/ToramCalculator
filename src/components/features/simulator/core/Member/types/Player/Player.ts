import { MemberWithRelations } from "@db/generated/repositories/member";
import { Member } from "../../Member";
import { applyPrebattleModifiers } from "./PrebattleDataSysModifiers";
import { PlayerStateContext, playerStateMachine, PlayerEventType } from "./PlayerStateMachine";
import GameEngine from "../../../GameEngine";
import { PlayerAttrSchemaGenerator } from "./PlayerAttrSchema";
import { ExtractAttrPaths, NestedSchema } from "../../runtime/StatContainer/SchemaTypes";
import { PlayerActionPool, type PlayerActionContext } from "./PlayerPipelines";
import { BTManger } from "../../runtime/BehaviorTree/BTManager";
import { PipelineManager } from "../../runtime/Action/PipelineManager";
import { BuffManager } from "../../runtime/Buff/BuffManager";
import { StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import { PlayerWithRelations } from "@db/generated/repositories/player";

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchemaGenerator>>;

export class Player extends Member<
  PlayerAttrType,
  PlayerEventType,
  PlayerStateContext,
  PlayerActionContext,
  PlayerActionPool
  > {
  
  player: PlayerWithRelations;
  characterIndex: number;
  activeCharacter: CharacterWithRelations;
  
  constructor(
    engine: GameEngine,
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    characterIndex: number,
    targetId: string,
    position?: { x: number; y: number; z: number },
  ) {
    if (!memberData.player) {
      throw new Error("Player数据缺失");
    }
    if (!memberData.player.characters[characterIndex]) {
      throw new Error("Character数据缺失");
    }
    const attrSchema = PlayerAttrSchemaGenerator(memberData.player.characters[characterIndex]);
    const statContainer = new StatContainer<PlayerAttrType>(attrSchema);
    const pipelineManager = new PipelineManager<PlayerActionContext, PlayerActionPool>(PlayerActionPool);
    const buffManager = new BuffManager(statContainer, pipelineManager, engine, memberData.id);
    const initialSkillList = memberData.player.characters[characterIndex].skills ?? [];
    const actionContext: PlayerActionContext = {
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
      blackboard: {},
      skillState: {},
      buffState: {},
      // 技能栏的“静态技能列表”应该在初始化时就可用，动态计算（mp/cd 等）由引擎快照刷新。
      skillList: initialSkillList,
      // 冷却数组：与 skillList 对齐，初始为 0（可用）
      skillCooldowns: initialSkillList.map(() => 0),
      currentSkill: null,
      currentSkillEffect: null,
      currentSkillLogic: null,
      currentSkillIndex: 0,
      skillStartFrame: 0,
      skillEndFrame: 0,
      currentSkillStartupFrames: 0,
      currentSkillChargingFrames: 0,
      currentSkillChantingFrames: 0,
      currentSkillActionFrames: 0,
      currentSkillTreeId: "",
      character: memberData.player.characters[characterIndex],
    };
    const behaviorTreeManager = new BTManger<PlayerActionContext>(actionContext);
    // 将 behaviorTreeManager 赋值给 actionContext，供后续使用
    actionContext.behaviorTreeManager = behaviorTreeManager;

    super(
      playerStateMachine,
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
      position,
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
    
    this.player = memberData.player;
    this.characterIndex = characterIndex;
    this.activeCharacter = memberData.player.characters?.[characterIndex];

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
