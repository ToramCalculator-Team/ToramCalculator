import { MemberWithRelations } from "@db/generated/repositories/member";
import { Actor, createActor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { StatContainer } from "../dataSys/StatContainer";
import { NestedSchema } from "../dataSys/SchemaTypes";
import GameEngine from "../GameEngine";
import { MemberType } from "@db/schema/enums";
import { BuffManager } from "../buff/BuffManager";
import { PipelineManager } from "../pipeline/PipelineManager";
import { PipeLineDef, StagePool } from "../pipeline/PipelineStageType";

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
  variables?: Record<string, number>; // 如 chargeCounter 等
  // 动态管线效果信息（简要描述）
  dynamicEffects?: Array<{
    pipeline: string;
    stage: string;
    priority?: number;
  }>;
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

/**
 * 成员事件类型枚举
 * 基础事件类型，所有成员类型都支持的事件
 */
export interface MemberCreateEvent extends EventObject {
  type: "create";
}
export interface MemberDestroyEvent extends EventObject {
  type: "destroy";
}
export interface MemberUpdateEvent extends EventObject {
  type: "update";
  timestamp: number;
}
export interface MemberCustomEvent extends EventObject {
  type: string;
  data?: Record<string, any>;
}
export type MemberEventType =
  | MemberCreateEvent // 创建事件
  | MemberDestroyEvent // 销毁事件
  | MemberUpdateEvent // 更新事件
  | MemberCustomEvent; // 自定义事件

/**
 * 成员状态机类型
 * 基于 XState StateMachine 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 *
 * @template TAttrKey 属性键的字符串联合类型
 */
export type MemberStateMachine<
  TAttrKey extends string = string,
  TEvent extends EventObject = MemberEventType,
  TPipelineDef extends PipeLineDef<TStagePool> = PipeLineDef,
  TStagePool extends StagePool<TExContext> = StagePool<any>,
  TExContext extends Record<string, any> = {},
> = StateMachine<
  any, // TContext - 状态机上下文
  TEvent, // TEvent - 事件类型（可扩展）
  Record<string, any>, // TChildren - 子状态机
  any, // TActor - Actor配置
  any, // TAction - 动作配置
  any, // TGuard - 守卫配置
  string, // TDelay - 延迟配置
  {}, // TStateValue - 状态值
  string, // TTag - 标签
  NonReducibleUnknown, // TInput - 输入类型
  Member<TAttrKey, TEvent, TPipelineDef, TStagePool, TExContext>, // TOutput - 输出类型（当状态机完成时）
  EventObject, // TEmitted - 发出的事件类型
  any, // TMeta - 元数据
  any // TStateSchema - 状态模式
>;

/**
 * 成员Actor类型
 * 基于 XState Actor 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 *
 * @template TAttrKey 属性键的字符串联合类型
 */
export type MemberActor<
  TAttrKey extends string = string,
  TEvent extends EventObject = MemberEventType,
  TPipelineDef extends PipeLineDef<TStagePool> = PipeLineDef,
  TStagePool extends StagePool<TExContext> = StagePool<any>,
  TExContext extends Record<string, any> = {},
> = Actor<MemberStateMachine<TAttrKey, TEvent, TPipelineDef, TStagePool, TExContext>>;

export class Member<
  TAttrKey extends string,
  TEvent extends EventObject,
  TPipelineDef extends PipeLineDef<TStagePool>,
  TStagePool extends StagePool<TExContext>,
  TExContext extends Record<string, any>,
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
  /** 管线管理器（固定+动态管线阶段管理） */
  pipelineManager: PipelineManager<TPipelineDef, TStagePool, TExContext>;
  /** 成员Actor引用 */
  actor: MemberActor<TAttrKey, TEvent, TPipelineDef, TStagePool, TExContext>;
  /** 引擎引用 */
  engine: GameEngine;
  /** 成员数据 */
  data: MemberWithRelations;
  /** 位置信息 */
  position: { x: number; y: number; z: number };

  /** 序列化方法 */
  serialize(): MemberSerializeData {
    // 序列化 Buff 数据
    const buffs: BuffViewData[] = this.buffManager.getBuffs().map((buff) => {
      // 提取动态管线效果信息
      const dynamicEffects = buff.effects
        .filter((effect) => effect.type === "pipeline")
        .map((effect) => {
          const pipelineEffect = effect as any; // PipelineBuffEffect
          return {
            pipeline: pipelineEffect.pipeline,
            stage: pipelineEffect.stage || "",
            priority: pipelineEffect.priority,
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
    // 获取当前帧数（从引擎的 frameLoop 获取）
    const currentFrame = this.engine.getFrameLoop().getFrameNumber();
    
    // 更新 Buff（处理 frame.update 效果和过期检查）
    this.buffManager.update(currentFrame);
    
    // 发送"更新"事件（中文），与状态机监听的事件类型匹配
    this.actor.send({ type: "更新", timestamp: Date.now() } as unknown as TEvent);
  }

  constructor(
    stateMachine: (
      member: any,
    ) => MemberStateMachine<TAttrKey, TEvent, TPipelineDef, TStagePool, TExContext>,
    engine: GameEngine,
    campId: string,
    teamId: string,
    targetId: string,
    memberData: MemberWithRelations,
    dataSchema: NestedSchema,
    pipelineDef: TPipelineDef,
    stagePool: TStagePool,
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
    this.statContainer = new StatContainer<TAttrKey>(dataSchema);

    // 使用传入的配置直接初始化管线管理器
    this.pipelineManager = new PipelineManager(pipelineDef, stagePool);

    // 初始化Buff管理器（需要在 this.id 赋值后）
    this.buffManager = new BuffManager(this.statContainer, this.pipelineManager, this.engine, memberData.id);

    this.position = position ?? { x: 0, y: 0, z: 0 };

    // 创建并启动状态机
    this.actor = createActor(stateMachine(this), {
      id: memberData.id,
    });
    this.actor.start();
  }
}
