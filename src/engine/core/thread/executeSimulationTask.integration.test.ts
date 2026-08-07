import { defaultData } from "@db/defaultData";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BUILT_IN_EVENTS } from "../Event/BuiltInEvents";
import { EventCatalog } from "../Event/EventCatalog";
import { getBuiltInTags } from "../Event/TagConstants";
import { TagRegistry } from "../Event/TagRegistry";
import { GameEngine } from "../GameEngine";
import { JSProcessor } from "../JSProcessor/JSProcessor";
import { PipelineCatalog } from "../Pipeline/PipelineCatalog";
import { PipelineResolverService } from "../Pipeline/PipelineResolverService";
import { type SimulationTask, SimulationTaskExecutionError, SimulationTaskSchema } from "../simulationTask";
import type { EngineInfrastructure } from "../types";
import { executeSimulationTask } from "./executeSimulationTask";

type MobFlow = {
	id: string;
	definition: string;
};

const createMobScenario = (flows: MobFlow[], logicHz = 60) => ({
	scenario: {
		...defaultData.simulator,
		randomSeed: 42,
		logicHz,
		primaryMemberId: flows[0]?.id ?? "missing-primary",
		campA: [
			{
				...defaultData.team,
				id: "simulation-task-team",
				members: flows.map((flow, index) => ({
					...defaultData.member,
					id: flow.id,
					name: `Task Mob ${index + 1}`,
					type: "Mob" as const,
					characterId: null,
					mobId: `mob:${flow.id}`,
					belongToTeamId: "simulation-task-team",
					character: null,
					mob: {
						...defaultData.mob,
						id: `mob:${flow.id}`,
						name: `Task Mob ${index + 1}`,
						maxhp: 1_000,
						radius: 1,
					},
					resolvedBehavior: {
						name: `Flow ${flow.id}`,
						definition: flow.definition,
						agent: "",
						memberType: "Mob" as const,
						attributeSlots: [],
					},
				})),
			},
		],
		campB: [],
	},
});

const createTask = (
	runId: string,
	flows: MobFlow[],
	memberId = flows[0]?.id ?? "missing-member",
	budget: SimulationTask["budget"] = { maxTicks: 20 },
	logicHz = 60,
): SimulationTask =>
	SimulationTaskSchema.parse({
		runId,
		scenarioData: createMobScenario(flows, logicHz),
		runtimeConfig: {
			driveMode: "unclocked",
			acceptExternalIntents: false,
			timeScale: 1,
			maxTickSkip: 1,
		},
		recordingPolicy: { tickStateHistory: "everyTick" },
		stopPolicy: { kind: "untilMemberFlowEnds", memberId },
		budget,
	});

const createEngine = () => {
	const pipelineCatalog = new PipelineCatalog();
	const infra: EngineInfrastructure = {
		jsProcessor: new JSProcessor(),
		pipelineCatalog,
		pipelineResolverService: new PipelineResolverService(pipelineCatalog),
		tagRegistry: new TagRegistry(getBuiltInTags()),
		eventCatalog: new EventCatalog(BUILT_IN_EVENTS),
	};
	return new GameEngine(
		{
			eventQueueConfig: { maxQueueSize: 100, enablePerformanceMonitoring: false },
			frameLoopConfig: {
				logicHz: 60,
				enableTickSkip: false,
				maxTickSkip: 0,
				enablePerformanceMonitoring: false,
				timeScale: 1,
				maxEventsPerTick: 10,
			},
		},
		infra,
	);
};

describe("通用 SimulationTask 执行器", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("运行不包含 Character 语义的 Mob 场景并返回 EngineRunOutput", async () => {
		const engine = createEngine();
		const task = createTask("mob-flow-run", [{ id: "target-mob", definition: "root { wait [1] }" }]);

		const result = await executeSimulationTask(engine, task);

		expect(result.output.runId).toBe("mob-flow-run");
		expect(result.output.stateHistory?.tickCount).toBe(result.stats.ticksRun);
		expect(result.stats).toMatchObject({ reachedLimit: false });
		expect(result.stats.ticksRun).toBeGreaterThan(0);
		expect(engine.getMember("target-mob")).toBeNull();
		engine.cleanup();
	});

	it("逻辑频率只读取 scenarioData，不存在任务级覆盖", async () => {
		const engine = createEngine();
		const task = createTask(
			"scenario-logic-hz",
			[{ id: "target-mob", definition: "root { wait [1] }" }],
			"target-mob",
			{ maxTicks: 20 },
			30,
		);

		const result = await executeSimulationTask(engine, task);
		expect(result.output.durationMs).toBeGreaterThan(0);
		expect(engine.getRuntimeConfig().logicHz).toBe(30);
		engine.cleanup();
	});

	it("只等待目标 member-flow，不被其他成员的长期并行行为阻塞", async () => {
		const engine = createEngine();
		const task = createTask("target-flow-run", [
			{ id: "target-mob", definition: "root { wait [1] }" },
			{ id: "background-mob", definition: "root { wait [100000] }" },
		]);

		const result = await executeSimulationTask(engine, task);

		expect(result.stats.ticksRun).toBeLessThan(20);
		expect(result.stats.reachedLimit).toBe(false);
		engine.cleanup();
	});

	it("相同输入可在复用的 Worker 引擎中确定性重复", async () => {
		const engine = createEngine();
		const task = createTask("deterministic-run", [{ id: "target-mob", definition: "root { wait [1] }" }]);

		const first = await executeSimulationTask(engine, task);
		const second = await executeSimulationTask(engine, task);

		expect(second).toEqual(first);
		engine.cleanup();
	});

	it("预算耗尽返回结构化失败，并清理活动产出供下一任务继续运行", async () => {
		const engine = createEngine();
		const timedOutTask = createTask(
			"timeout-run",
			[{ id: "target-mob", definition: "root { wait [100000] }" }],
			"target-mob",
			{ maxTicks: 2 },
		);

		await expect(executeSimulationTask(engine, timedOutTask)).rejects.toMatchObject({
			code: "simulation_task_timeout",
		});
		const recovery = await executeSimulationTask(
			engine,
			createTask("recovery-run", [{ id: "target-mob", definition: "root { wait [1] }" }]),
		);
		expect(recovery.output.runId).toBe("recovery-run");
		engine.cleanup();
	});

	it("停止策略引用不存在成员时显式失败", async () => {
		const engine = createEngine();
		const task = createTask(
			"missing-member-run",
			[{ id: "existing-mob", definition: "root { wait [1] }" }],
			"missing-mob",
		);

		await expect(executeSimulationTask(engine, task)).rejects.toBeInstanceOf(SimulationTaskExecutionError);
		await expect(executeSimulationTask(engine, task)).rejects.toMatchObject({
			code: "simulation_task_member_not_found",
		});
		engine.cleanup();
	});
});
