import { MemberWithRelations } from "@db/generated/repositories/member";
import { Actor, createActor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { StatContainer } from "./runtime/StatContainer/StatContainer";
import { NestedSchema } from "./runtime/StatContainer/SchemaTypes";
import GameEngine from "../GameEngine";
import { MemberType } from "@db/schema/enums";
import { BuffManager } from "./runtime/Buff/BuffManager";
import type { PipelineBuffEffect } from "./runtime/Buff/BuffManager";
import { PipelineManager, type PipelineDynamicStageInfo } from "./runtime/Action/PipelineManager";
import { PipelineDef, ActionPool } from "./runtime/Action/type";
import { MemberActor, MemberStateContext, MemberStateMachine } from "./runtime/StateMachine/types";
import IntentBuffer from "../IntentSystem/IntentBuffer";
import type { SendFsmEventIntent } from "../IntentSystem/Intent";
import type { ActionContext } from "./runtime/Action/ActionContext";
import { BTManger } from "./runtime/BehaviorTree/BTManager";

/**
 * 成员数据接口 - 对应响应式系统的序列化数据返回类型
 *
 * @template TAttrKey 属性键的字符串联合类型，与 MemberContext 保持一致
 */
/**
 * Buff 视图数据 - 用于 UI 展示
 */
export interface BuffViewData {
  id: string;
  name: string;
  duration: number; // -1 表示永久
  startTime: number;
  currentStacks?: number;
  maxStacks?: number;
  source?: string;
  description?: string;
  variables?: Record<string, number | boolean>; // 如 chargeCounter 等
  // 动态动作组效果信息（简要描述）
  dynamicEffects?: Array<{
    pipelineName: string;
    afterStageName: string;
    priority?: number;
  }>;
  /** 实时动态插入快照 */
  activeDynamicActions?: PipelineDynamicStageInfo[];
}

export interface MemberSerializeData {
  attrs: Record<string, unknown>;
  id: string;
  type: MemberType;
  name: string;
  campId: string;
  teamId: string;
  targetId: string;
  isAlive: boolean;
  position: {
    x: number;
    y: number;
    z: number;
  };
  // Buff 列表（用于 UI 展示）
  buffs?: BuffViewData[];
}

export class Member<
  TAttrKey extends string,
  TStateEvent extends EventObject,
  TStateContext extends MemberStateContext,
  TActionContext extends ActionContext,
  TActionPool extends ActionPool<TActionContext>,
> {
  /** 成员ID */
  id: string;
  /** 成员类型 */
  type: MemberType;
  /** 成员名称 */
  name: string;
  /** 所属阵营ID */
  campId: string;
  /** 所属队伍ID */
  teamId: string;
  /** 成员目标ID */
  targetId: string;
  /** 是否活跃 */
  isAlive: boolean;
  /** 属性Schema（用于编译表达式等） */
  dataSchema: NestedSchema;
  /** 响应式系统实例（用于稳定导出属性） */
  statContainer: StatContainer<TAttrKey>;
  /** Buff 管理器（生命周期/钩子/机制状态） */
  buffManager: BuffManager;
  /** 动作管理器（固定+动态动作组管理） */
  pipelineManager: PipelineManager<TActionContext, TActionPool>;
  /** 行为树管理器（技能行为树管理） */
  behaviorTreeManager: BTManger;
  /** 成员Actor引用 */
  actor: MemberActor<TStateEvent, TStateContext>;
  /** 引擎引用 */
  engine: GameEngine;
  /** 成员数据 */
  data: MemberWithRelations;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 跨技能/跨树共享的运行时内存 */
  memory: Record<string, unknown> = {};
  /** 稳定的运行时上下文（ActionContext），供 Action/Pipeline 统一使用 */
  actionContext: TActionContext;

  constructor(
    stateMachine: (member: any) => MemberStateMachine<TStateEvent, TStateContext>,
    engine: GameEngine,
    campId: string,
    teamId: string,
    targetId: string,
    memberData: MemberWithRelations,
    dataSchema: NestedSchema,
    actionPool: TActionPool,
    actionContext: TActionContext,
    position?: { x: number; y: number; z: number },
  ) {
    this.id = memberData.id;
    this.type = memberData.type;
    this.name = memberData.name;
    this.engine = engine;
    this.campId = campId;
    this.teamId = teamId;
    this.targetId = targetId;
    this.isAlive = true;
    this.dataSchema = dataSchema;
    this.data = memberData;
    const statContainer = new StatContainer<TAttrKey>(dataSchema);
    const pipelineManager = new PipelineManager<TActionContext, TActionPool>(actionPool);
    const buffManager = new BuffManager(statContainer, pipelineManager, this.engine, memberData.id);
    const behaviorTreeManager = new BTManger(actionContext);

    // 初始化响应式系统
    this.statContainer = statContainer;

    // 初始化动作管理器（动作组定义可被后续覆盖/注册）
    this.pipelineManager = pipelineManager;

    // 初始化Buff管理器（需要在 this.id 赋值后）
    this.buffManager = buffManager;

    // 初始化行为树管理器
    this.behaviorTreeManager = behaviorTreeManager;

    this.position = position ?? { x: 0, y: 0, z: 0 };
    this.memory = {};

    this.actionContext = {
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
      currentSkill: null,
      currentSkillEffect: null,
      currentSkillLogic: null,
    };

    // 创建并启动状态机
    this.actor = createActor(stateMachine(this), {
      id: memberData.id,
    });
    this.actor.start();
  }

  /** 序列化方法 */
  serialize(): MemberSerializeData {
    // 序列化 Buff 数据
    const buffs: BuffViewData[] = this.buffManager.getBuffs().map((buff) => {
      // 提取动态动作组效果信息
      const dynamicEffects = buff.effects
        .filter((effect): effect is PipelineBuffEffect => effect.type === "pipeline")
        .map((effect) => {
          const pipelineName = (effect as any).pipelineName ?? (effect as any).actionGroupName;
          const afterStageName = (effect as any).afterStageName ?? (effect as any).afterActionName;
          return {
            pipelineName,
            afterStageName,
            priority: effect.priority,
          };
        });

      return {
        id: buff.id,
        name: buff.name,
        duration: buff.duration,
        startTime: buff.startTime,
        currentStacks: buff.currentStacks ?? 1,
        maxStacks: buff.maxStacks ?? 1,
        source: buff.source,
        description: buff.description,
        variables: buff.variables ? { ...buff.variables } : undefined,
        dynamicEffects: dynamicEffects.length > 0 ? dynamicEffects : undefined,
        activeDynamicActions: this.pipelineManager.getDynamicStageInfos({ source: buff.id }),
      };
    });

    return {
      attrs: this.statContainer.exportNestedValues(),
      id: this.id,
      type: this.type,
      name: this.name,
      campId: this.campId,
      teamId: this.teamId,
      targetId: this.targetId,
      isAlive: this.isAlive,
      position: this.position,
      buffs: buffs.length > 0 ? buffs : undefined,
    };
  }

  update(): void {
    // 保持向后兼容：直接执行一次 tick 并立即发送更新事件
    const buffer = new IntentBuffer();
    this.tick(this.engine.getCurrentFrame(), buffer);
    const intents = buffer.drain();
    for (const intent of intents) {
      if (intent.type === "sendFsmEvent") {
        this.actor.send((intent as SendFsmEventIntent).event as any);
      }
    }
  }

  /**
   * 新的执行入口：每帧 tick，产出 Intent，由上层 Resolver 统一落地
   */
  tick(frame: number, intentBuffer: IntentBuffer): void {
    // 更新运行时上下文的当前帧（保持同步）
    this.actionContext.currentFrame = frame;
    
    // 更新 Buff（处理 frame.update 效果和过期检查）
    this.buffManager.update(frame);

    // 更新行为树
    this.behaviorTreeManager.tickAll();

    // 产出"更新"事件给状态机
    intentBuffer.push({
      type: "sendFsmEvent",
      source: `member:${this.id}`,
      actorId: this.id,
      targetId: this.id,
      frame,
      event: { type: "更新", timestamp: Date.now() },
    } as SendFsmEventIntent);
  }
}
