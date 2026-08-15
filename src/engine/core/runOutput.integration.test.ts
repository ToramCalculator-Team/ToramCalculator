import { defaultData } from "@db/defaultData";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_DEFINITION } from "~/lib/terrain";
import { BUILT_IN_EVENTS } from "./Event/BuiltInEvents";
import { EventCatalog } from "./Event/EventCatalog";
import { getBuiltInTags } from "./Event/TagConstants";
import { TagRegistry } from "./Event/TagRegistry";
import { GameEngine } from "./GameEngine";
import { JSProcessor } from "./JSProcessor/JSProcessor";
import { PipelineCatalog } from "./Pipeline/PipelineCatalog";
import { PipelineResolverService } from "./Pipeline/PipelineResolverService";
import { readTickStateRange } from "./tickStateHistory";
import { type EngineInfrastructure, EngineScenarioDataSchema } from "./types";

const scenario = EngineScenarioDataSchema.parse({
	terrain: DEFAULT_TERRAIN_DEFINITION,
	scenario: {
		...defaultData.simulator,
		logicHz: 60,
		primaryMemberId: "preview-primary",
		campA: [],
		campB: [],
	},
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

const runOutput = () => {
	const engine = createEngine();
	engine.loadScenario(scenario);
	engine.startRunOutput("run-1", { tickStateHistory: "everyTick" });
	for (let tick = 0; tick < 8; tick++) engine.step();
	const record = engine.finishRunOutput("run-1");
	engine.acknowledgeRunOutput("run-1");
	engine.cleanup();
	return record;
};

describe("逐 Tick 运行输出记录", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("实时状态投影不改变 Worker 权威历史", () => {
		const first = runOutput();
		const second = runOutput();
		expect(first.stateHistory?.tickCount).toBe(second.stateHistory?.tickCount);
		if (!first.stateHistory) throw new Error("逐 Tick 记录缺少状态历史");
		expect(readTickStateRange(first.stateHistory, 0, 8).map((frame) => frame.tickIndex)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7,
		]);
	});
});
