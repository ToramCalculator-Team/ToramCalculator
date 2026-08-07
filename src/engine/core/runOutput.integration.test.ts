import { defaultData } from "@db/defaultData";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

const runWithSnapshotHz = (snapshotHz: number) => {
	const engine = createEngine();
	let pushedFrames = 0;
	engine.loadScenario(scenario);
	engine.setFrameSnapshotSender(() => pushedFrames++);
	engine.setRealtimeSnapshotHz(snapshotHz);
	engine.startRunOutput("run-1", { tickStateHistory: "everyTick" });
	for (let tick = 0; tick < 8; tick++) engine.step();
	const record = engine.finishRunOutput("run-1");
	engine.acknowledgeRunOutput("run-1");
	engine.cleanup();
	return { pushedFrames, record };
};

describe("逐 Tick 运行输出记录与 UI 快照节流", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("低频和高频 UI 投影不改变 Worker 权威历史", () => {
		const silent = runWithSnapshotHz(0);
		const frequent = runWithSnapshotHz(1_000_000);

		expect(silent.pushedFrames).toBe(0);
		expect(frequent.pushedFrames).toBeGreaterThan(0);
		expect(frequent.record.stateHistory?.tickCount).toBe(silent.record.stateHistory?.tickCount);
		if (!silent.record.stateHistory) throw new Error("逐 Tick 记录缺少状态历史");
		expect(readTickStateRange(silent.record.stateHistory, 0, 8).map((frame) => frame.tickIndex)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7,
		]);
	});
});
