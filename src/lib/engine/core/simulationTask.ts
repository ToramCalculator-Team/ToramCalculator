import { z } from "zod/v4";
import { EngineRunOutputSchema, ExecutionRecordingPolicySchema } from "./runOutput";
import { EngineScenarioDataSchema, RuntimeConfigSchema, StopPolicySchema } from "./types";

/** 一次性模拟任务必须至少提供一种确定的模拟预算，WorkerPool 的墙钟超时继续作为外层保护。 */
export const SimulationTaskBudgetSchema = z
	.object({
		maxTicks: z.number().int().positive().optional(),
		maxDurationMs: z.number().positive().optional(),
	})
	.refine((budget) => budget.maxTicks !== undefined || budget.maxDurationMs !== undefined, {
		message: "SimulationTask budget requires maxTicks or maxDurationMs",
	});
export type SimulationTaskBudget = z.output<typeof SimulationTaskBudgetSchema>;

/**
 * 一次性模拟任务不接受实时外部输入，也不自行启动时钟；调用方只选择执行机制和技术记录策略。
 * stopPolicy 单独建模，避免同一个停止条件在配置与任务字段中出现两份事实。
 */
export const SimulationTaskRuntimeConfigSchema = RuntimeConfigSchema.omit({ stopPolicy: true, logicHz: true })
	.extend({
		driveMode: z.literal("unclocked"),
		acceptExternalIntents: z.literal(false),
	})
	.strict();
export type SimulationTaskRuntimeConfig = z.output<typeof SimulationTaskRuntimeConfigSchema>;

export const SimulationTaskSchema = z.object({
	runId: z.string().min(1),
	scenarioData: EngineScenarioDataSchema,
	runtimeConfig: SimulationTaskRuntimeConfigSchema,
	recordingPolicy: ExecutionRecordingPolicySchema,
	stopPolicy: StopPolicySchema,
	budget: SimulationTaskBudgetSchema,
});
export type SimulationTask = z.output<typeof SimulationTaskSchema>;

export const SimulationTaskStatsSchema = z.object({
	ticksRun: z.number().int().nonnegative(),
	elapsedMs: z.number().nonnegative(),
	reachedLimit: z.literal(false),
});
export type SimulationTaskStats = z.output<typeof SimulationTaskStatsSchema>;

export const SimulationTaskResultSchema = z.object({
	output: EngineRunOutputSchema,
	stats: SimulationTaskStatsSchema,
});
export type SimulationTaskResult = z.output<typeof SimulationTaskResultSchema>;

/** Worker 已正确执行 RPC，但任务无法在通用执行约束内完成时返回的结构化执行失败。 */
export class SimulationTaskExecutionError extends Error {
	constructor(
		readonly code: "simulation_task_timeout" | "simulation_task_member_not_found",
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = "SimulationTaskExecutionError";
	}
}
