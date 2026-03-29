import { z } from "zod/v4";

/**
 * 帧循环状态枚举
 */
export type FrameLoopState =
  | "stopped" // 已停止
  | "running" // 运行中
  | "paused"; // 已暂停

/**
 * 帧循环配置接口（仅时钟与固定步长相关；运行语义模式见 EngineConfig.engineMode）
 */
export const FrameLoopConfigSchema = z.object({
  targetFPS: z.number(),
  enableFrameSkip: z.boolean(),
  maxFrameSkip: z.number(),
  enablePerformanceMonitoring: z.boolean(),
  timeScale: z.number(),
  maxEventsPerFrame: z.number(),
  /** 向主线程发送 FrameSnapshot 的目标频率（Hz），0 表示关闭 */
  snapshotFPS: z.number().default(0),
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
  /** 平均逻辑帧率（近似） */
  averageFPS: number;
  /** 最近一次已处理逻辑帧号（与历史实现一致，用于估算 FPS） */
  totalFrames: number;
  /** 总运行时间 */
  totalRunTime: number;
  /** 调度时钟类型（可观测）；快进等非 wall-clock 模式为 synthetic */
  clockKind: "raf" | "timeout" | "synthetic";
  /** 累积跳帧次数 */
  skippedFrames: number;
  /** 累计超时帧数 */
  timeoutFrames: number;
}
