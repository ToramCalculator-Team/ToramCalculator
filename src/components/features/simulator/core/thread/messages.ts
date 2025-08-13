import { z } from "zod";

// ===================== Intent/Router 消息契约 =====================

// 统一：主线程到 Actor 的消息类型即为 FSM 事件名
export const IntentMessageTypeEnum = z.enum([
  // 通用/玩家/Mob FSM 事件
  "skill_press",
  "move_command",
  "stop_move",
  "cast_end",
  "controlled",
  "charge_end",
  "hp_zero",
  "control_end",
  "skill_animation_end",
  "check_availability",
  // 自定义透传事件
  "custom",
]);

export type IntentMessageType = z.infer<typeof IntentMessageTypeEnum>;

export const IntentMessageSchema = z.object({
  id: z.string(),
  type: IntentMessageTypeEnum,
  targetMemberId: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
});

export type IntentMessage = z.infer<typeof IntentMessageSchema>;

export interface MessageProcessResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface MessageRouterStats {
  totalMessagesProcessed: number;
  successfulMessages: number;
  failedMessages: number;
  lastProcessedTimestamp: number;
  successRate: string;
}

// EngineView (高频KPI) - 与 Simulation.worker.ts 的 projectEngineView 对齐
export const EngineViewSchema = z.object({
  frameNumber: z.number(),
  runTime: z.number(),
  frameLoop: z.object({
    averageFPS: z.number(),
    averageFrameTime: z.number(),
    totalFrames: z.number(),
    totalRunTime: z.number(),
    clockKind: z.enum(["raf", "timeout"]).optional(),
    skippedFrames: z.number().optional(),
    frameBudgetMs: z.number().optional(),
  }),
  eventQueue: z.object({
    currentSize: z.number(),
    totalProcessed: z.number(),
    totalInserted: z.number(),
    overflowCount: z.number(),
  }),
});

export type EngineView = z.infer<typeof EngineViewSchema>;

// EngineStats（低频全量）- 简化验证，核心字段保证存在
export const EngineStatsFullSchema = z
  .object({
    currentFrame: z.number(),
  })
  .passthrough();

// Worker 系统事件消息
export const WorkerSystemMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("engine_state_update"),
    taskId: z.string(),
    data: z.object({
      type: z.literal("engine_state_update"),
      timestamp: z.number(),
      engineView: EngineViewSchema,
    }),
  }),
  z.object({ type: z.literal("engine_stats_full"), taskId: z.string(), data: EngineStatsFullSchema }),
  z.object({
    type: z.literal("member_state_update"),
    taskId: z.string(),
    data: z.object({
      memberId: z.string(),
      value: z.string(),
      context: z.record(z.any()).optional(),
    }),
  }),
  z.object({
    type: z.literal("system_event"),
    taskId: z.string(),
    data: z.object({
      level: z.enum(["info", "warn", "error"]).default("info"),
      message: z.string(),
    }),
  }),
]);

export type WorkerSystemMessage = z.infer<typeof WorkerSystemMessageSchema>;

// Worker 任务响应（统一结构）
export interface WorkerTaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WorkerTaskResponse<T = unknown> {
  taskId: string;
  result?: WorkerTaskResult<T> | null;
  error?: string | null;
  metrics?: {
    duration: number;
    memoryUsage: number;
  };
}
