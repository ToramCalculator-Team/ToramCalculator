import { z } from "zod/v4";

const FrameLoopModeSchema = z.enum(["realtime", "fastForward"]);
export type FrameLoopMode = z.output<typeof FrameLoopModeSchema>;

/**
 * 帧循环状态枚举
 */
export type FrameLoopState =
  | "stopped" // 已停止
  | "running" // 运行中
  | "paused"; // 已暂停

/**
 * 帧循环配置接口
 */
export const FrameLoopConfigSchema = z.object({
  targetFPS: z.number(),
  enableFrameSkip: z.boolean(),
  maxFrameSkip: z.number(),
  enablePerformanceMonitoring: z.boolean(),
  timeScale: z.number(),
  maxEventsPerFrame: z.number(),
  mode: FrameLoopModeSchema,
});
export type FrameLoopConfig = z.output<typeof FrameLoopConfigSchema>;

export interface FrameLoopSnapshot {
  currentFrame: number;
  fps: number;
}

/**
 * 性能统计接口
 */
export interface FrameLoopStats {
  /** 平均帧率 */
  averageFPS: number;
  /** 总帧数 */
  totalFrames: number;
  /** 总运行时间 */
  totalRunTime: number;
  /** 调度时钟类型（可观测） */
  clockKind: "raf" | "timeout";
  /** 累积跳帧次数 */
  skippedFrames: number;
  /** 累计超时帧数 */
  timeoutFrames: number;
}
