/**
 * 通信协议定义
 * 定义Worker线程和主线程之间的通信消息结构
 * 
 * 重构说明：
 * - 只保留通信层相关的类型定义
 * - 业务逻辑类型由各自的模块定义
 * - 引擎状态类型由引擎模块定义
 * - 保持向后兼容
 */

import { z } from "zod";

// ==================== 通信协议类型 ====================

/**
 * 基础通信消息接口
 */
export interface CommunicationMessage<T = any> {
  id: string;
  type: string;
  timestamp: number;
  data: T;
  metadata?: Record<string, any>;
}

/**
 * Worker到主线程的消息
 */
export interface WorkerToMainMessage<T = any> extends CommunicationMessage<T> {
  workerId: string;
  taskId?: string;
}

/**
 * 主线程到Worker的消息
 */
export interface MainToWorkerMessage<T = any> extends CommunicationMessage<T> {
  taskId: string;
  priority: "high" | "medium" | "low";
}

// ==================== 系统事件类型 ====================

/**
 * 系统事件类型
 */
export type SystemEventType = 
  | "engine_state_update"
  | "engine_stats_full" 
  | "member_state_update"
  | "system_event";

/**
 * 系统事件消息
 */
export interface SystemEventMessage<T = any> extends CommunicationMessage<T> {
  type: SystemEventType;
}

/**
 * Worker系统消息Schema
 * 用于验证Worker发送的系统事件消息
 */
export const WorkerSystemMessageSchema = z.object({
  type: z.enum(["engine_state_update", "engine_stats_full", "member_state_update", "system_event"]),
  data: z.any(),
  taskId: z.string().optional(),
});

// ==================== 任务相关类型 ====================

// 注意：TaskResult和TaskResponse类型已移动到SimulatorPool.ts，因为这是线程池产生的数据
// 主线程应该从线程池模块导入：import { TaskResult, TaskExecutionResult } from "./SimulatorPool";

// ==================== 业务消息类型（向后兼容） ====================

// 注意：IntentMessage相关类型已移动到MessageRouter.ts，因为这是消息路由模块的核心类型
// 主线程应该从消息路由模块导入：import { IntentMessage, MessageProcessResult, MessageRouterStats } from "../MessageRouter";

// ==================== 数据模型类型（向后兼容） ====================

// 注意：EngineView类型已移动到GameEngine.ts，因为这是引擎产生的数据
// 主线程应该从引擎模块导入：import { EngineView } from "../GameEngine";

// 注意：EngineStatsFull类型已移动到GameEngine.ts，因为这是引擎产生的数据
// 主线程应该从引擎模块导入：import { EngineStatsFull } from "../GameEngine";

// ==================== 废弃警告 ====================
/**
 * @deprecated 此文件包含混合的职责，建议：
 * - 通信协议：直接使用此文件中的CommunicationMessage等类型
 * - 业务逻辑：由状态机模块定义自己的消息类型
 * - 数据模型：由引擎模块定义自己的状态类型
 */
