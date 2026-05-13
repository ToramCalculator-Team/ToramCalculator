import { z } from "zod/v4";

/**
 * 底层时钟驱动的状态。
 * 这里只描述“时钟是否在工作”，不再表达引擎语义模式。
 */
export type FrameLoopState = "stopped" | "running" | "paused";

/**
 * 底层时钟/固定步长驱动配置。
 * 说明：
 * - logicHz 表达每秒离散逻辑步数，只决定采样密度。
 * - timeScale 只影响 realtime 驱动下模拟时间推进速度。
 * - maxEventsPerTick 目前仍保留在这里做限流，但真正消费它的是 GameEngine。
 */
export const FrameLoopConfigSchema = z.object({
	logicHz: z.number(),
	enableTickSkip: z.boolean(),
	maxTickSkip: z.number(),
	enablePerformanceMonitoring: z.boolean(),
	timeScale: z.number(),
	maxEventsPerTick: z.number(),
});
export type FrameLoopConfig = z.output<typeof FrameLoopConfigSchema>;

/**
 * 一次时钟 tick 计算出的推进建议。
 * GameEngine 会根据 dueTicks 决定实际调用多少次 stepTick。
 */
export interface FrameLoopTick {
	/** 当前 wall-clock 时间戳（毫秒） */
	timestamp: number;
	/** 距离上一次 tick 的真实时间差（毫秒） */
	deltaTime: number;
	/** 固定逻辑步长对应的模拟毫秒数 */
	logicStepMs: number;
	/** 本次 tick 建议推进的逻辑 tick 数 */
	dueTicks: number;
	/** 当前驱动使用的底层时钟类型 */
	clockKind: "raf" | "timeout";
	/** 由于累积时间过大而被裁剪掉的补 tick 次数 */
	skippedTicks: number;
}

/**
 * 循环快照。
 * tickIndex 是引擎的离散步序号；ticksPerSecond 是实际推进统计。
 */
export interface FrameLoopSnapshot {
	tickIndex: number;
	ticksPerSecond: number;
}

/**
 * 底层驱动/引擎共享的循环统计结构。
 * 说明：
 * - GameEngine 会复用这个结构对外暴露“实际逻辑 tick 推进统计”
 * - FrameLoop 自己则只填充时钟层可观测的数据
 */
export interface FrameLoopStats {
	/** 平均每秒逻辑 tick 数 */
	averageTicksPerSecond: number;
	/** 总逻辑 tick 数 */
	totalTicks: number;
	/** 总运行时间 */
	totalRunTime: number;
	/** 调度/驱动来源 */
	clockKind: "raf" | "timeout" | "manual";
	/** 累积跳 tick 次数 */
	skippedTicks: number;
	/** 使用 timeout 时累计推进的 tick 数 */
	timeoutTicks: number;
}
