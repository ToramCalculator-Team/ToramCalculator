/**
 * 统一的通信消息类型定义
 * 
 * 设计原则：
 * 1. 所有消息都通过统一的格式传递
 * 2. 状态机命令和数据查询命令分离
 * 3. 类型安全，避免字符串硬编码
 */

import { EngineCommand } from "../GameEngineSM";
import { IntentMessage } from "../MessageRouter";
import { FrameSnapshot, EngineStats } from "../GameEngine";
import { RendererCmd } from "../../render/RendererProtocol";
import { z } from "zod";

// ==================== 基础消息类型 ====================

/**
 * 任务执行结果
 */
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 任务执行结果（包含指标）
 */
export interface TaskExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    duration: number;
    memoryUsage: number;
  };
}

// ==================== 数据查询命令 ====================

/**
 * 数据查询命令类型
 */
export type DataQueryCommand = 
  | { type: "get_members" }
  | { type: "get_stats" }
  | { type: "get_snapshot" }
  | { type: "get_member_state"; memberId: string }
  | { type: "send_intent"; intent: IntentMessage };

// ==================== 渲染指令类型 ====================

/**
 * 渲染指令包装类型
 */
export type RenderCommand = 
  | { type: "render:cmd"; cmd: RendererCmd }
  | { type: "render:cmds"; cmds: RendererCmd[] };

// ==================== 消息类型定义 ====================

/**
 * Worker任务结果类型
 */
export interface WorkerTaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Worker响应消息类型 - 与SimulatorPool期望的格式一致
 */
export interface WorkerResponse<T = unknown> {
  taskId: string;
  result: WorkerTaskResult<T> | null;
  error: string | null;
  metrics: {
    duration: number;
    memoryUsage: number;
  };
};

/**
 * Worker 消息事件类型 - 用于 WorkerPool 内部事件传递
 */
export interface WorkerMessageEvent {
  taskId: string;
  result?: WorkerTaskResult | null;
  error?: string | null;
  metrics?: {
    duration: number;
    memoryUsage: number;
  };
  type?: "system_event" | "frame_snapshot" | "render_cmd" | "engine_state_machine";
  data?: FrameSnapshot | EngineStats | EngineCommand | RenderCommand | any;
  cmd?: EngineCommand | DataQueryCommand | RendererCmd;
  cmds?: (EngineCommand | DataQueryCommand | RendererCmd)[];
}

/**
 * 主线程到Worker的初始化消息类型
 */ 
export interface MainThreadMessage {
  type: "init";
  port?: MessagePort;
}

/**
 * MessageChannel端口消息类型 - 与SimulatorPool保持一致
 */
export interface PortMessage {
  taskId: string;
  type: string;
  data?: any;
}


/**
 * Worker 消息类型 - 统一的消息格式
 */
export interface WorkerMessage {
  taskId: string;
  command: EngineCommand | DataQueryCommand;
  priority: "low" | "medium" | "high";
}

/**
 * 系统消息类型
 */
export interface SystemMessage {
  type: "system_event" | "frame_snapshot" | "render_cmd";
  data: FrameSnapshot | EngineStats | RenderCommand | any; // 根据type确定具体类型
}

/**
 * Worker系统消息Schema - 用于解析系统消息
 */
export const WorkerSystemMessageSchema = z.object({
  type: z.enum(["system_event", "frame_snapshot", "render_cmd"]),
  data: z.any(),
  taskId: z.string().optional(),
});

// ==================== 类型守卫 ====================

/**
 * 检查是否为状态机命令
 * 
 * @param command 待检查的命令（任意类型）
 * @returns 是否为 EngineCommand
 */
export function isStateMachineCommand(command: any): command is EngineCommand {
  return command && typeof command === 'object' && 'type' in command && 
         ["INIT", "START", "STOP", "PAUSE", "RESUME", "RESET", "STEP", "RESULT"].includes(command.type);
}

/**
 * 检查是否为数据查询命令
 * 
 * @param command 待检查的命令（任意类型）
 * @returns 是否为 DataQueryCommand
 */
export function isDataQueryCommand(command: any): command is DataQueryCommand {
  return command && typeof command === 'object' && 'type' in command && 
         ["get_members", "get_stats", "get_snapshot", "get_member_state", "send_intent"].includes(command.type);
}

// ==================== 消息序列化 ====================

/**
 * 消息序列化配置
 */
export const MessageSerializer = {
  /**
   * 准备消息用于传输
   */
  prepareForTransfer<T>(message: T): { message: T; transferables: Transferable[] } {
    // 这里可以添加 Transferable 对象的处理
    return { message, transferables: [] };
  },

  /**
   * 清理消息用于 postMessage
   */
  sanitizeForPostMessage<T>(data: T): T {
    // 这里可以添加数据清理逻辑
    return data;
  }
};