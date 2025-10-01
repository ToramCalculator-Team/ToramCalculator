import { z } from "zod/v3";

/**
 * 通用任务结果接口
 */
export interface TaskResult {
  success: boolean; // 任务是否成功
  data?: any; // 任务返回的数据
  error?: string; // 错误信息
}

/**
 * 通用任务执行结果
 */
export interface TaskExecutionResult {
  success: boolean; // 任务是否成功
  data?: any; // 任务返回的数据
  error?: string; // 错误信息
  metrics?: {
    duration: number; // 执行时长（毫秒）
    memoryUsage: number; // 内存使用量
  };
}


/**
 * 通用任务类型
 */
export interface Task<TTaskType extends string, TPayload, TPriority extends string> {
  id: string; // 任务唯一标识
  type: TTaskType; // 任务类型（类型安全）
  payload: TPayload; // 任务数据（类型安全）
  priority: TPriority; // 任务优先级
  timestamp: number; // 任务创建时间戳
  timeout: number; // 任务超时时间（毫秒）
  retriesLeft: number; // 剩余重试次数
  originalRetries: number; // 原始重试次数（用于统计）
}

/**
 * 通用任务结果类型
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Worker 消息事件类型 - 用于 WorkerPool 内部事件传递
 * 
 * 使用分布式条件类型确保任务类型和 payload 类型的关联
 * 
 * @template TResult - 任务执行结果类型
 * @template TTaskTypeMap - 任务类型映射表 { [taskType]: PayloadType }
 * @template TData - 系统消息数据类型
 * 
 * @example
 * type SimulatorEvent = WorkerMessageEvent<any, SimulatorTaskTypeMap, any>;
 * // 展开为：
 * // | { taskId: string, type: "engine_command", cmd: EngineCommand, ... }
 * // | { taskId: string, type: "data_query", cmd: DataQueryCommand, ... }
 */
export type WorkerMessageEvent<
  TResult,
  TTaskTypeMap extends Record<string, any>,
  TData
> = {
  [K in keyof TTaskTypeMap]: {
    taskId: string;
    result?: Result<TResult> | null;
    error?: string | null;
    metrics?: {
      duration: number;
      memoryUsage: number;
    };
    type?: K & string;
    data?: TData;
    cmd?: TTaskTypeMap[K];
    cmds?: TTaskTypeMap[K][];
  }
}[keyof TTaskTypeMap];

/**
 * Worker 消息类型 - 统一的消息格式
 * 
 * @template TPayload - 消息载荷类型
 * @template TPriority - 优先级类型（默认为标准三级优先级）
 */
export interface WorkerMessage<TPayload, TPriority extends string> {
  taskId: string;
  payload: TPayload;
  priority: TPriority;
}

/**
 * Worker系统消息Schema - 用于解析系统消息
 */
export const WorkerSystemMessageSchema = z.object({
    type: z.enum(["system_event", "frame_snapshot", "render_cmd", "engine_state_machine"]),
    data: z.any(),
    taskId: z.string().optional(),
  });