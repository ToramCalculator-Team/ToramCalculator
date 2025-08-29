import { MemberWithRelations } from "@db/repositories/member";
import { Actor, createActor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { ReactiveSystem } from "../dataSys/ReactiveSystem";
import { NestedSchema } from "../dataSys/SchemaTypes";
import GameEngine from "../GameEngine";
import { MemberType } from "@db/schema/enums";
import BuffManager from "../buff/BuffManager";

/**
 * 成员数据接口 - 对应响应式系统的序列化数据返回类型
 *
 * @template TAttrKey 属性键的字符串联合类型，与 MemberContext 保持一致
 */
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
  // 状态机状态信息（可选，用于实时同步）
  state?: any;
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
export interface MemberMoveEvent extends EventObject {
  type: "move";
  position: { x: number; y: number };
}
export interface MemberMoveCommandEvent extends EventObject {
  type: "move_command";
  data: { position: { x: number; y: number } };
}
export interface MemberStopMoveEvent extends EventObject {
  type: "stop_move";
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
  | MemberMoveEvent // 移动事件
  | MemberMoveCommandEvent // 移动指令（UI/Router → FSM）
  | MemberStopMoveEvent // 停止移动
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
  Member<TAttrKey>, // TOutput - 输出类型（当状态机完成时）
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
export type MemberActor<TAttrKey extends string = string> = Actor<MemberStateMachine<TAttrKey>>;

export class Member<TAttrKey extends string = string> {
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
  schema: NestedSchema;
  /** 响应式系统实例（用于稳定导出属性） */
  rs: ReactiveSystem<TAttrKey>;
  /** Buff 管理器（生命周期/钩子/机制状态） */
  buffManager: BuffManager;
  /** 成员Actor引用 */
  actor: MemberActor<TAttrKey>;
  /** 引擎引用 */
  engine: GameEngine;
  /** 成员数据 */
  data: MemberWithRelations;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 序列化方法 */
  public serialize(): MemberSerializeData {
    return {
      attrs: this.rs.exportNestedValues(),
      id: this.id,
      type: this.type,
      name: this.name,
      campId: this.campId,
      teamId: this.teamId,
      targetId: this.targetId,
      isAlive: this.isAlive,
      position: this.position,
    };
  }

  constructor(
    stateMachine: (member: any) => MemberStateMachine<TAttrKey>,
    engine: GameEngine,
    campId: string,
    teamId: string,
    targetId: string,
    memberData: MemberWithRelations,
    schema: NestedSchema,
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
    this.schema = schema;
    this.data = memberData;
    this.rs = new ReactiveSystem<TAttrKey>(schema);
    this.buffManager = new BuffManager(this);
    this.position = position ?? { x: 0, y: 0, z: 0 };
    this.actor = createActor(stateMachine(this), {
      id: memberData.id,
    });
    this.actor.start();

  }
}
