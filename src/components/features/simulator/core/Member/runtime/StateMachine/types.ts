import { Actor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { Member } from "../../Member";
import { MemberType } from "@db/schema/enums";

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
  data?: Record<string, unknown>;
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
  TStateEvent extends EventObject = MemberEventType, // 状态机事件类型
  TStateContext extends MemberStateContext = MemberStateContext, // 状态机上下文类型
> = StateMachine<
  TStateContext, // TContext - 状态机上下文
  TStateEvent, // TEvent - 事件类型（可扩展）
  Record<string, any>, // TChildren - 子状态机
  any, // TActor - Actor配置
  any, // TAction - 动作配置
  any, // TGuard - 守卫配置
  string, // TDelay - 延迟配置
  {}, // TStateValue - 状态值
  string, // TTag - 标签
  NonReducibleUnknown, // TInput - 输入类型
  any, // TOutput - 输出类型（当状态机完成时）
  EventObject, // TEmitted - 发出的事件类型
  any, // TMeta - 元数据
  any // TStateSchema - 状态模式
>;

/**
 * 成员Actor类型
 * 基于 XState Actor 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 *
 * @template TStateEvent 状态机事件类型
 * @template TStateContext 状态机上下文类型
 */
export type MemberActor<
  TStateEvent extends EventObject = MemberEventType,
  TStateContext extends MemberStateContext = MemberStateContext,
> = Actor<MemberStateMachine<TStateEvent, TStateContext>>;

/**
 * 成员状态上下文通用接口
 * 所有成员类型（Player、Mob）的状态上下文都应实现此接口
 * 用于行为树节点访问通用功能
 */
export interface MemberStateContext {
  /** 成员引用 */
  owner: Member<any, any, any, any>;
  /** 成员目标ID */
  targetId: string;
  /** 是否存活 */
  isAlive: boolean;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 创建帧 */
  createdAtFrame: number;
  /** 当前帧 */
  currentFrame: number;
  /** 状态标签组 */
  statusTags: string[];
}
