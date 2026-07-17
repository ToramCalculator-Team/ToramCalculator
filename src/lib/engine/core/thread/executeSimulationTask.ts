import type { GameEngine } from "../GameEngine";
import { type SimulationTask, SimulationTaskExecutionError, type SimulationTaskResult } from "../simulationTask";

type SimulationTaskEngine = Pick<
	GameEngine,
	| "loadScenario"
	| "setRuntimePolicy"
	| "getMember"
	| "startRunOutput"
	| "fastForwardSync"
	| "finishRunOutput"
	| "cancelRunOutput"
	| "acknowledgeRunOutput"
	| "unloadScenario"
>;

type MutableTaskStats = {
	ticksRun: number;
	elapsedMs: number;
};

/** 在模拟预算内同步推进通用任务；业务动作顺序只由引擎 Tick 与 Member FSM 决定。 */
function fastForwardTask(
	engine: SimulationTaskEngine,
	task: SimulationTask,
): { completed: boolean; stats: MutableTaskStats } {
	const maxTicks = task.budget.maxTicks ?? Number.POSITIVE_INFINITY;
	const maxDurationMs = task.budget.maxDurationMs ?? Number.POSITIVE_INFINITY;
	const step = engine.fastForwardSync({ maxTicks, maxDurationMs });
	const stats: MutableTaskStats = { ticksRun: step.ticksRun, elapsedMs: step.elapsedMs };
	return { completed: !step.reachedLimit, stats };
}

/**
 * 在一个 Worker 内执行完整的一次性模拟任务，并保证活动产出与场景资源在成功或失败后都被收束。
 * 任务只解释通用停止与预算，不理解 Character、setup、候选技能或结果文案。
 */
export async function executeSimulationTask(
	engine: SimulationTaskEngine,
	task: SimulationTask,
): Promise<SimulationTaskResult> {
	let scenarioLoaded = false;
	let outputState: "none" | "active" | "pending" | "transferred" = "none";

	try {
		engine.loadScenario(task.scenarioData);
		scenarioLoaded = true;
		if (task.stopPolicy.kind === "untilMemberFlowEnds" && !engine.getMember(task.stopPolicy.memberId)) {
			throw new SimulationTaskExecutionError(
				"simulation_task_member_not_found",
				`SimulationTask stop member not found: ${task.stopPolicy.memberId}`,
				{ runId: task.runId, memberId: task.stopPolicy.memberId },
			);
		}
		engine.setRuntimePolicy({ ...task.runtimeConfig, stopPolicy: task.stopPolicy });
		engine.startRunOutput(task.runId, task.recordingPolicy);
		outputState = "active";

		const execution = fastForwardTask(engine, task);
		if (!execution.completed) {
			throw new SimulationTaskExecutionError(
				"simulation_task_timeout",
				`SimulationTask exceeded its simulation budget: ${task.runId}`,
				{ runId: task.runId, budget: task.budget, stats: execution.stats },
			);
		}

		const output = engine.finishRunOutput(task.runId);
		outputState = "pending";
		engine.acknowledgeRunOutput(task.runId);
		outputState = "transferred";
		return { output, stats: { ...execution.stats, reachedLimit: false } };
	} finally {
		if (outputState === "active") engine.cancelRunOutput(task.runId);
		if (outputState === "pending") engine.acknowledgeRunOutput(task.runId);
		if (scenarioLoaded) engine.unloadScenario();
	}
}
