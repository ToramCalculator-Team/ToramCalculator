import { z } from "zod/v4";

/**
 * 底层时钟驱动的状态。
 * 这里只描述“时钟是否在工作”，不再表达引擎语义模式。
 */
export type FrameLoopState = "stopped" | "running" | "paused";

/**
 * 底层时钟/固定步长驱动配置。
 * 说明：
 * - targetFPS、timeScale、补帧相关配置仍然属于时钟层
 * - maxEventsPerFrame 目前仍保留在这里做兼容，但真正消费它的是 GameEngine
 */
export const FrameLoopConfigSchema = z.object({
	targetFPS: z.number(),
	enableFrameSkip: z.boolean(),
	maxFrameSkip: z.number(),
	enablePerformanceMonitoring: z.boolean(),
	timeScale: z.number(),
	maxEventsPerFrame: z.number(),
});
export type FrameLoopConfig = z.output<typeof FrameLoopConfigSchema>;

/**
 * 一次时钟 tick 计算出的推进建议。
 * GameEngine 会根据 dueSteps 决定实际调用多少次 stepFrame。
 */
export interface FrameLoopTick {
	/** 当前 wall-clock 时间戳（毫秒） */
	timestamp: number;
	/** 距离上一次 tick 的真实时间差（毫秒） */
	deltaTime: number;
	/** 固定逻辑步长对应的毫秒数 */
	frameIntervalMs: number;
	/** 本次 tick 建议推进的逻辑帧数 */
	dueSteps: number;
	/** 当前驱动使用的底层时钟类型 */
	clockKind: "raf" | "timeout";
	/** 由于累积时间过大而被裁剪掉的补帧次数 */
	skippedFrames: number;
}

/**
 * 兼容现有快照结构保留的循环快照。
 * 这里的 currentFrame / fps 最终由 GameEngine 组装，不再要求 FrameLoop 独自解释业务语义。
 */
export interface FrameLoopSnapshot {
	currentFrame: number;
	fps: number;
}

/**
 * 底层驱动/引擎共享的循环统计结构。
 * 说明：
 * - GameEngine 会复用这个结构对外暴露“实际逻辑帧推进统计”
 * - FrameLoop 自己则只填充时钟层可观测的数据
 */
export interface FrameLoopStats {
	/** 平均帧率 */
	averageFPS: number;
	/** 总帧数 */
	totalFrames: number;
	/** 总运行时间 */
	totalRunTime: number;
	/** 调度/驱动来源 */
	clockKind: "raf" | "timeout" | "manual";
	/** 累积跳帧次数 */
	skippedFrames: number;
	/** 使用 timeout 时累计推进的帧数 */
	timeoutFrames: number;
}
