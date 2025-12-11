import { Actor, createActor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { PipelineManager, type PipelineDynamicStageInfo } from "../Action/ActionManager";
import { PipeLineDef, StagePool } from "../Action/type";
import { Member } from "../../Member";
import { MemberType } from "@db/schema/enums";
import GameEngine from "../../../GameEngine";
import { BuffManager } from "../Buff/BuffManager";
import { StatContainer } from "../StatContainer/StatContainer";
import type { BehaviorTreeHost } from "../BehaviorTree/BehaviorTreeHost";

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

/**
 * 成员状态上下文通用接口
 * 所有成员类型（Player、Mob）的状态上下文都应实现此接口
 * 用于行为树节点访问通用功能
 */
export interface MemberStateContext {
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
  /** 是否存活 */
  isAlive: boolean;
  /** 引擎引用 */
  engine: GameEngine;
  /** Buff管理器引用 */
  buffManager: BuffManager;
  /** 属性容器引用 */
  statContainer: StatContainer<string>;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 创建帧 */
  createdAtFrame: number;
  /** 当前帧 */
  currentFrame: number;
  /** 状态标签组 */
  statusTags: string[];
  /** 通用黑板（行为树/管线共享） */
  blackboard?: Record<string, unknown>;
  /** 技能相关的共享状态，如魔法炮充能 */
  skillState?: Record<string, unknown>;
  /** Buff 相关的共享状态 */
  buffState?: Record<string, unknown>;
  /** 行为树宿主（统一管理 skill/buff/ai 树实例） */
  behaviorTreeHost?: BehaviorTreeHost;
}
