/**
 * FSM事件桥接器接口定义
 * 
 * 架构原则：
 * 1. 依赖倒置：Member依赖抽象接口，不依赖具体实现
 * 2. 职责分离：事件转换逻辑从Member基类中分离
 * 3. 可测试性：接口便于mock和单元测试
 * 4. 可扩展性：新成员类型只需实现接口
 */

import type { BaseEvent } from "../EventQueue";

// ============================== 核心接口定义 ==============================

/**
 * FSM事件转换上下文
 */
export interface FSMTransformContext {
  /** 当前帧号 */
  currentFrame: number;
  /** 成员ID */
  memberId: string;
  /** 成员类型 */
  memberType: string;
  /** 当前状态 */
  currentState?: string;
  /** 目标状态 */
  targetState?: string;
}

/**
 * FSM事件输入
 */
export interface FSMEventInput {
  /** 事件类型 */
  type: string;
  /** 事件数据 */
  data?: any;
  /** 延迟帧数 */
  delayFrames?: number;
  /** 事件来源 */
  source?: string;
  /** 关联的行为ID */
  actionId?: string;
}

/**
 * FSM事件转换结果
 */
export type FSMTransformResult = BaseEvent | BaseEvent[] | null;

/**
 * FSM事件桥接器核心接口
 * 
 * 设计理念：
 * - 最小化接口：只暴露必要的方法
 * - 无状态设计：所有状态通过参数传递
 * - 类型安全：完整的TypeScript类型支持
 */
export interface FSMEventBridge {
  /**
   * 转换FSM事件为EventQueue事件
   * 
   * @param fsmEvent FSM事件输入
   * @param context 转换上下文
   * @returns 转换结果
   */
  transformFSMEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult;

  /**
   * 检查是否支持该事件类型
   * 
   * @param eventType 事件类型
   * @returns 是否支持
   */
  supportsEventType(eventType: string): boolean;

  /**
   * 获取桥接器名称（用于调试和日志）
   */
  getName(): string;
}

/**
 * 可选的统计信息接口
 */
export interface FSMBridgeStats {
  /** 处理的总事件数 */
  totalEvents: number;
  /** 成功转换数 */
  successfulTransforms: number;
  /** 跳过的事件数 */
  skippedEvents: number;
  /** 失败的转换数 */
  failedTransforms: number;
}

/**
 * 扩展接口：支持统计信息
 */
export interface StatefulFSMEventBridge extends FSMEventBridge {
  /**
   * 获取统计信息
   */
  getStats(): FSMBridgeStats;

  /**
   * 重置统计信息
   */
  resetStats(): void;
}

export default FSMEventBridge;