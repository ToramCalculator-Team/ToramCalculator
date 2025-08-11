import { MemberWithRelations } from "@db/repositories/member";
import { Actor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import { ReactiveSystem } from "./ReactiveSystem";
import GameEngine from "../GameEngine";

/**
 * 成员数据接口 - 对应响应式系统的序列化数据返回类型
 *
 * @template TAttrKey 属性键的字符串联合类型，与 MemberContext 保持一致
 */
export interface MemberSerializeData<TAttrKey extends string = string> {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  attrs: Record<TAttrKey, number>;
  teamId: string;
  campId?: string;
}

/**
 * 成员事件接口
 * 定义成员状态机可以处理的事件类型
 */
export interface MemberEvent {
    /** 事件ID */
    id: string;
    /** 事件类型 */
    type: string;
    /** 事件时间戳 */
    timestamp: number;
    /** 事件数据 */
    data: Record<string, any>;
  }
  
  /**
   * 成员状态机上下文接口
   * 定义状态机运行时的上下文数据
   *
   * 设计原则：
   * - 单一事实来源：stats 直接引用响应式系统的计算结果
   * - 实时更新：状态机持有引用，自动获取最新值
   * - 性能优化：避免重复计算，直接使用缓存结果
   * - 类型安全：通过泛型 TAttrKey 确保 stats 的类型安全
   *
   * @template TAttrKey 属性键的字符串联合类型，对应响应式系统的属性键
   */
  export interface MemberContext<TAttrKey extends string = string> {
    /** 成员配置 */
    config: MemberWithRelations;
    /** 成员属性  */
    attrs: ReactiveSystem<TAttrKey>;
    /** 引擎引用 */
    engine: GameEngine;
    /** 成员ID */
    id: string;
    /** 阵营ID */
    campId: string;
    /** 队伍ID */
    teamId: string;
    /** 成员目标ID */
    targetId: string;
    /** 是否存活 */
    isAlive: boolean;
    /** 是否可行动 */
    isActive: boolean;
    /** 最后更新时间戳 */
    lastUpdateTimestamp: number;
    /** 位置坐标 */
    position: { x: number; y: number };
  }
  
  /**
   * 成员事件类型枚举
   * 基础事件类型，所有成员类型都支持的事件
   */
  export type MemberEventType =
    | { type: "create" } // 创建事件
    | { type: "destroy" } // 销毁事件
    | { type: "move"; position: { x: number; y: number } } // 移动事件
    | { type: "update"; timestamp: number } // 更新事件
    | { type: string; data: Record<string, any> }; // 自定义事件
  
  /**
   * 成员状态机类型
   * 基于 XState StateMachine 类型，提供完整的类型推断
   * 使用泛型参数允许子类扩展事件类型
   *
   * @template TAttrKey 属性键的字符串联合类型
   */
  export type MemberStateMachine<TAttrKey extends string = string> = StateMachine<
    MemberContext<TAttrKey>, // TContext - 状态机上下文
    MemberEventType, // TEvent - 事件类型（可扩展）
    Record<string, any>, // TChildren - 子状态机
    any, // TActor - Actor配置
    any, // TAction - 动作配置
    any, // TGuard - 守卫配置
    string, // TDelay - 延迟配置
    {}, // TStateValue - 状态值
    string, // TTag - 标签
    NonReducibleUnknown, // TInput - 输入类型
    MemberContext<TAttrKey>, // TOutput - 输出类型（当状态机完成时）
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