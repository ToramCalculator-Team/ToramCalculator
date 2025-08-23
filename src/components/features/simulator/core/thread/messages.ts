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
 * 只包含通信层相关的系统事件
 */
export type SystemEventType =
  | "system_event"
  | "frame_snapshot";

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
  type: z.enum(["system_event", "frame_snapshot"]),
  data: z.any(),
  taskId: z.string().optional(),
});
