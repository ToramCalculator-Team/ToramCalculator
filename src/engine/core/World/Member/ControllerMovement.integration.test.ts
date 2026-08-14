/** 控制器最新移动状态到成员位置积分的引擎侧集成测试。 */

import { defaultData } from "@db/defaultData";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_TERRAIN_DEFINITION } from "~/lib/terrain";
import { BUILT_IN_EVENTS } from "../../Event/BuiltInEvents";
import { EventCatalog } from "../../Event/EventCatalog";
import { getBuiltInTags } from "../../Event/TagConstants";
import { TagRegistry } from "../../Event/TagRegistry";
import { GameEngine } from "../../GameEngine";
import { JSProcessor } from "../../JSProcessor/JSProcessor";
import { PipelineCatalog } from "../../Pipeline/PipelineCatalog";
import { PipelineResolverService } from "../../Pipeline/PipelineResolverService";
import type { EngineInfrastructure } from "../../types";
import { EngineScenarioDataSchema } from "../../types";
import type { MemberMovementInput } from "./runtime/types";

const MOB_ID = "move-test-mob";
const CONTROLLER_ID = "controller-1";

const createMobScenario = () =>
	EngineScenarioDataSchema.parse({
		terrain: DEFAULT_TERRAIN_DEFINITION,
		scenario: {
			...defaultData.simulator,
			randomSeed: 42,
			logicHz: 60,
			primaryMemberId: MOB_ID,
			initialTargetIds: {},
			campA: [
				{
					...defaultData.team,
					id: "team-a",
					camp: "A" as const,
					members: [
						{
							...defaultData.member,
							id: MOB_ID,
							name: "Move Test Mob",
							type: "Mob" as const,
							characterId: null,
							character: null,
							mobId: `mob:${MOB_ID}`,
							mob: { ...defaultData.mob, id: `mob:${MOB_ID}`, name: "Move Test Mob", maxhp: 1_000, radius: 1 },
							belongToTeamId: "team-a",
							resolvedBehavior: {
								name: "move-test-idle",
								definition: "root { wait [1] }",
								agent: "",
								memberType: "Mob" as const,
								attributeSlots: [],
							},
						},
					],
				},
			],
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

const bindController = async (engine: GameEngine) => {
	const result = await engine.processIntent({
		id: "bind-1",
		timestamp: Date.now(),
		type: "绑定控制对象",
		controllerId: CONTROLLER_ID,
		data: { memberId: MOB_ID },
	});
	expect(result.success).toBe(true);
};

describe("控制器移动状态与成员位置积分", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("每 Tick 采样当前绑定控制器并由引擎积分位置与朝向", async () => {
		const engine = createEngine();
		let movementInput: MemberMovementInput | null = { direction: { x: 1, z: 0 }, intensity: 1 };
		engine.setControllerMovementInputSource((controllerId) => (controllerId === CONTROLLER_ID ? movementInput : null));
		engine.loadScenario(createMobScenario());
		await bindController(engine);

		const member = engine.getMember(MOB_ID);
		if (!member) throw new Error(`测试成员不存在: ${MOB_ID}`);
		const before = { ...member.position };
		for (let tick = 0; tick < 60; tick += 1) engine.step();

		const after = member.position;
		expect(after.x).toBeGreaterThan(before.x);
		expect(after.z).toBe(before.z);
		expect(member.runtime.yaw).toBeCloseTo(Math.PI / 2, 5);

		movementInput = null;
		engine.step();
		expect(member.runtime.movement).toBeNull();
		engine.cleanup();
	});

	it("方向变化时只更新引擎权威位置与朝向", async () => {
		const engine = createEngine();
		let movementInput: MemberMovementInput | null = { direction: { x: 1, z: 0 }, intensity: 1 };
		engine.setControllerMovementInputSource(() => movementInput);
		engine.loadScenario(createMobScenario());
		await bindController(engine);
		const member = engine.getMember(MOB_ID);
		if (!member) throw new Error(`测试成员不存在: ${MOB_ID}`);

		for (let tick = 0; tick < 10; tick += 1) engine.step();
		const afterFirstDirection = { ...member.position };

		movementInput = { direction: { x: 0, z: 1 }, intensity: 1 };
		for (let tick = 0; tick < 10; tick += 1) engine.step();
		expect(member.position.x).toBe(afterFirstDirection.x);
		expect(member.position.z).toBeGreaterThan(afterFirstDirection.z);
		expect(member.runtime.yaw).toBeCloseTo(0, 5);
		engine.cleanup();
	});
});
