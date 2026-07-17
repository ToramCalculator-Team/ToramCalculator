import { defaultData } from "@db/defaultData";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY,
	type CharacterPreviewPolicy,
	characterPreviewSetupInputKey,
	compileCharacterPreviewBehavior,
} from "~/features/character/preview/compileCharacterPreviewBehavior";
import { interpretCharacterPreviewResult } from "~/features/character/preview/interpretCharacterPreviewResult";
import { MemberController } from "../controller/MemberController";
import { BUILT_IN_EVENTS } from "./Event/BuiltInEvents";
import { EventCatalog } from "./Event/EventCatalog";
import { getBuiltInTags } from "./Event/TagConstants";
import { TagRegistry } from "./Event/TagRegistry";
import { GameEngine } from "./GameEngine";
import { JSProcessor } from "./JSProcessor/JSProcessor";
import { PipelineCatalog } from "./Pipeline/PipelineCatalog";
import { PipelineResolverService } from "./Pipeline/PipelineResolverService";
import { SimulationTaskSchema } from "./simulationTask";
import { executeSimulationTask } from "./thread/executeSimulationTask";
import { readTickStateRange } from "./tickStateHistory";
import { type EngineInfrastructure, type EngineScenarioData, EngineScenarioDataSchema } from "./types";
import { memberFlowInputId } from "./World/Member/memberFlowInput";

const MEMBER_ID = "preview-member";
const TARGET_ID = "training-target";

const createSkill = (id: string, name: string, durationMs: number, withLongPassive = false) => {
	const templateId = `${id}:template`;
	const variantId = `${id}:variant`;
	return {
		...defaultData.character_skill,
		id,
		lv: 10,
		templateId,
		belongToCharacterId: defaultData.character.id,
		template: {
			...defaultData.skill,
			id: templateId,
			name,
			variants: [
				{
					...defaultData.skill_variant,
					id: variantId,
					belongToskillId: templateId,
					mpCost: "0",
					activeBehavior: null,
					activeBehaviorTree: {
						...defaultData.behavior_tree,
						id: `${variantId}:active-bt`,
						definition: `root { wait [${durationMs}] }`,
						activeOwnerId: variantId,
					},
					passiveBehaviorTree: withLongPassive
						? {
								...defaultData.behavior_tree,
								id: `${variantId}:passive-bt`,
								name: `${name} Passive`,
								definition: "root { wait [100000] }",
								passiveOwnerId: variantId,
							}
						: null,
					registeredBehaviorTrees: [],
				},
			],
		},
	};
};

const previewPolicy: CharacterPreviewPolicy = {
	memberId: MEMBER_ID,
	trainingTargetMemberId: TARGET_ID,
	setupSkills: [{ skillId: "setup-skill" }, { skillId: "setup-skill" }],
};

const previewBehavior = compileCharacterPreviewBehavior(previewPolicy, "candidate-skill");

const scenario = EngineScenarioDataSchema.parse({
	scenario: {
		...defaultData.simulator,
		randomSeed: 7,
		logicHz: 60,
		primaryMemberId: MEMBER_ID,
		campA: [
			{
				...defaultData.team,
				id: "preview-team",
				members: [
					{
						...defaultData.member,
						id: MEMBER_ID,
						name: "Preview Member",
						characterId: defaultData.character.id,
						belongToTeamId: "preview-team",
						character: {
							...defaultData.character,
							weapon: null,
							subWeapon: null,
							armor: null,
							option: null,
							special: null,
							skills: [
								createSkill("setup-skill", "Setup Skill", 50, true),
								createSkill("candidate-skill", "Candidate Skill", 1),
							],
							registlets: [],
							avatars: [],
							consumables: [],
							combos: [],
						},
						mob: null,
						resolvedBehavior: previewBehavior,
					},
				],
			},
		],
		campB: [
			{
				...defaultData.team,
				id: "target-team",
				members: [
					{
						...defaultData.member,
						id: TARGET_ID,
						name: "Training Target",
						type: "Mob",
						characterId: null,
						mobId: defaultData.mob.id,
						belongToTeamId: "target-team",
						character: null,
						mob: { ...defaultData.mob, maxhp: 1_000, radius: 1 },
						resolvedBehavior: {
							name: "Training Target Idle",
							definition: "root { wait [100000] }",
							agent: "",
							memberType: "Mob",
							attributeSlots: [],
						},
					},
				],
			},
		],
	},
});

type PreviewCharacter = NonNullable<EngineScenarioData["scenario"]["campA"][number]["members"][number]["character"]>;
type PreviewSkillVariant = PreviewCharacter["skills"][number]["template"]["variants"][number];

const patchSkillVariant = (
	scenarioData: EngineScenarioData,
	skillId: string,
	patch: Partial<PreviewSkillVariant>,
): EngineScenarioData =>
	EngineScenarioDataSchema.parse({
		...scenarioData,
		scenario: {
			...scenarioData.scenario,
			campA: scenarioData.scenario.campA.map((team) => ({
				...team,
				members: team.members.map((member) => ({
					...member,
					character: member.character
						? {
								...member.character,
								skills: member.character.skills.map((skill) => ({
									...skill,
									template: {
										...skill.template,
										variants: skill.template.variants.map((variant) =>
											skill.id === skillId ? { ...variant, ...patch } : variant,
										),
									},
								})),
							}
						: null,
				})),
			})),
		},
	});

const createManualScenario = (): EngineScenarioData =>
	EngineScenarioDataSchema.parse({
		...scenario,
		scenario: {
			...scenario.scenario,
			campA: scenario.scenario.campA.map((team) => ({
				...team,
				members: team.members.map((member) =>
					member.id === MEMBER_ID
						? {
								...member,
								resolvedBehavior: {
									name: "Manual Idle",
									definition: "root { wait [100000] }",
									agent: "",
									memberType: "Player",
									attributeSlots: [],
								},
							}
						: member,
				),
			})),
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
				maxTickSkip: 1,
				enablePerformanceMonitoring: false,
				timeScale: 1,
				maxEventsPerTick: 10,
			},
		},
		infra,
	);
};

const createTask = (runId: string, scenarioData = scenario) =>
	SimulationTaskSchema.parse({
		runId,
		scenarioData,
		runtimeConfig: {
			driveMode: "unclocked",
			acceptExternalIntents: false,
			timeScale: 1,
			maxTickSkip: 1,
		},
		recordingPolicy: { tickStateHistory: "everyTick" },
		stopPolicy: { kind: "untilMemberFlowEnds", memberId: MEMBER_ID },
		budget: { maxTicks: 100 },
	});

describe("Character 预览 behavior 的通用 SimulationTask 流程", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("setup 完成后才发送下一动作，重复技能仍有稳定唯一输入身份", async () => {
		const engine = createEngine();
		const result = await executeSimulationTask(engine, createTask("preview-run"));
		const inputs = result.output.inputs;

		expect(inputs.map((input) => input.inputId)).toEqual([
			memberFlowInputId(MEMBER_ID, `${characterPreviewSetupInputKey(0)}:target`),
			memberFlowInputId(MEMBER_ID, characterPreviewSetupInputKey(0)),
			memberFlowInputId(MEMBER_ID, characterPreviewSetupInputKey(1)),
			memberFlowInputId(MEMBER_ID, `${CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY}:target`),
			memberFlowInputId(MEMBER_ID, CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY),
		]);
		expect(inputs.map((input) => input.status)).toEqual(["accepted", "accepted", "accepted", "accepted", "accepted"]);
		expect(inputs.map((input) => input.action.payload)).toEqual([
			{ targetId: MEMBER_ID },
			{ skillId: "setup-skill" },
			{ skillId: "setup-skill" },
			{ targetId: TARGET_ID },
			{ skillId: "candidate-skill" },
		]);
		expect(inputs[2]?.timeMs).toBeGreaterThan(inputs[1]?.timeMs ?? -1);
		expect(inputs[4]?.timeMs).toBeGreaterThan(inputs[2]?.timeMs ?? -1);
		expect(result.output.inputs.filter((input) => input.status === "accepted")).toHaveLength(5);
		expect(result.output.inputs.some((input) => input.status === "rejected" && input.reason === "member_busy")).toBe(
			false,
		);
		expect(result.stats.ticksRun).toBeLessThan(100);
		expect(interpretCharacterPreviewResult(result, previewPolicy, "candidate-skill")).toMatchObject({
			status: "accepted",
			candidateSkillId: "candidate-skill",
			damage: 0,
		});
		engine.cleanup();
	});

	it("active effect 失败后同步结束技能并继续后续 member-flow", async () => {
		const engine = createEngine();
		const setupVariant = scenario.scenario.campA[0].members[0].character?.skills.find(
			(skill) => skill.id === "setup-skill",
		)?.template.variants[0];
		if (!setupVariant?.activeBehaviorTree) throw new Error("测试场景缺少 setup active behavior tree");
		const failedEffectScenario = patchSkillVariant(scenario, "setup-skill", {
			activeBehaviorTree: {
				...setupVariant.activeBehaviorTree,
				definition: "root { fail { wait [1] } }",
			},
		});

		const result = await executeSimulationTask(engine, createTask("failed-effect-run", failedEffectScenario));
		expect(result.output.inputs.map((input) => input.status)).toEqual([
			"accepted",
			"accepted",
			"accepted",
			"accepted",
			"accepted",
		]);
		expect(result.output.inputs.at(-1)?.inputId).toBe(
			`member-flow:${MEMBER_ID}:${CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY}`,
		);
		expect(result.stats.reachedLimit).toBe(false);
		engine.cleanup();
	});

	it("没有 active effect BT 时通过立即转换结束技能", async () => {
		const engine = createEngine();
		const noTreeScenario = patchSkillVariant(scenario, "setup-skill", {
			activeBehavior: {},
			activeBehaviorTree: null,
		});

		const result = await executeSimulationTask(engine, createTask("no-active-effect-run", noTreeScenario));
		expect(result.output.inputs.map((input) => input.status)).toEqual([
			"accepted",
			"accepted",
			"accepted",
			"accepted",
			"accepted",
		]);
		expect(result.output.inputs.at(-1)?.inputId).toBe(
			`member-flow:${MEMBER_ID}:${CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY}`,
		);
		expect(result.stats.reachedLimit).toBe(false);
		engine.cleanup();
	});

	it("逐 Tick 推进与连续同步快进产生相同输入事实、相对模拟时间和停止结果", async () => {
		const fastForwardEngine = createEngine();
		const task = createTask("equivalent-drive-run");
		const fastForward = await executeSimulationTask(fastForwardEngine, task);
		fastForwardEngine.cleanup();

		const steppedEngine = createEngine();
		steppedEngine.loadScenario(task.scenarioData);
		steppedEngine.setRuntimePolicy({ ...task.runtimeConfig, stopPolicy: task.stopPolicy });
		steppedEngine.startRunOutput(task.runId, task.recordingPolicy);
		let ticksRun = 0;
		do {
			steppedEngine.step();
			ticksRun += 1;
		} while (
			steppedEngine.getMember(MEMBER_ID)?.btManager.isParallelBtRunning("member-flow") &&
			ticksRun < (task.budget.maxTicks ?? 100)
		);
		const steppedOutput = steppedEngine.finishRunOutput(task.runId);
		steppedEngine.acknowledgeRunOutput(task.runId);

		expect(steppedOutput.inputs).toEqual(fastForward.output.inputs);
		if (!steppedOutput.stateHistory || !fastForward.output.stateHistory) {
			throw new Error("逐 Tick 记录缺少状态历史");
		}
		expect(readTickStateRange(steppedOutput.stateHistory, 0, steppedOutput.stateHistory.tickCount)).toEqual(
			readTickStateRange(fastForward.output.stateHistory, 0, fastForward.output.stateHistory.tickCount),
		);
		expect(ticksRun).toBe(fastForward.stats.ticksRun);
		expect(ticksRun).toBeLessThan(task.budget.maxTicks ?? 100);
		steppedEngine.cleanup();
	});

	it("setup 被 FSM 拒绝时保留结构化事实，候选事实不会覆盖 setup 失败", async () => {
		const engine = createEngine();
		const rejectedPolicy: CharacterPreviewPolicy = {
			memberId: MEMBER_ID,
			trainingTargetMemberId: TARGET_ID,
			setupSkills: [{ skillId: "missing-setup" }],
		};
		const rejectedBehavior = compileCharacterPreviewBehavior(rejectedPolicy, "candidate-skill");
		const rejectedScenario = EngineScenarioDataSchema.parse({
			...scenario,
			scenario: {
				...scenario.scenario,
				campA: scenario.scenario.campA.map((team) => ({
					...team,
					members: team.members.map((member) =>
						member.id === MEMBER_ID ? { ...member, resolvedBehavior: rejectedBehavior } : member,
					),
				})),
			},
		});

		const result = await executeSimulationTask(engine, createTask("rejected-setup-run", rejectedScenario));
		expect(result.output.inputs[1]).toMatchObject({
			inputId: memberFlowInputId(MEMBER_ID, characterPreviewSetupInputKey(0)),
			status: "rejected",
			reason: "skill_not_found",
		});
		expect(result.output.inputs[3]).toMatchObject({
			inputId: memberFlowInputId(MEMBER_ID, CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY),
			status: "accepted",
		});
		expect(interpretCharacterPreviewResult(result, rejectedPolicy, "candidate-skill")).toEqual({
			status: "setup_failed",
			candidateSkillId: "candidate-skill",
			failedSetupSkillId: "missing-setup",
			reason: "skill_not_found",
		});
		engine.cleanup();
	});

	it("外部控制器施法只提交技能并读取 Member 当前目标", async () => {
		const engine = createEngine();
		engine.loadScenario(createManualScenario());
		const controller = new MemberController({
			id: "in-process-engine",
			sendIntent: (intent) => engine.processIntent(intent),
		});
		const bindResults = await controller.bind(MEMBER_ID);
		expect(bindResults.every((result) => result.success)).toBe(true);
		expect(engine.getMember(MEMBER_ID)?.runtime.targetId).toBe(TARGET_ID);

		engine.startRunOutput("external-control-run", { tickStateHistory: "none" });
		const castResults = await controller.castSkill("candidate-skill");
		expect(castResults.every((result) => result.success)).toBe(true);
		engine.step();
		engine.step();
		const output = engine.finishRunOutput("external-control-run");
		engine.acknowledgeRunOutput("external-control-run");

		expect(output.inputs).toHaveLength(1);
		expect(output.inputs[0]).toMatchObject({
			status: "accepted",
			action: { type: "使用技能", payload: { skillId: "candidate-skill" } },
		});
		expect(engine.getMember(MEMBER_ID)?.runtime.targetId).toBe(TARGET_ID);
		engine.cleanup();
	});

	it("外部目标切换在成员 FSM 处理前不会被提前接纳", async () => {
		const engine = createEngine();
		engine.loadScenario(createManualScenario());
		const controller = new MemberController({
			id: "in-process-engine",
			sendIntent: (intent) => engine.processIntent(intent),
		});
		const bindResults = await controller.bind(MEMBER_ID);
		expect(bindResults.every((result) => result.success)).toBe(true);

		engine.startRunOutput("pending-target-run", { tickStateHistory: "none" });
		const selectResults = await controller.selectTarget(MEMBER_ID);
		expect(selectResults.every((result) => result.success)).toBe(true);
		const output = engine.finishRunOutput("pending-target-run");
		engine.acknowledgeRunOutput("pending-target-run");

		expect(engine.getMember(MEMBER_ID)?.runtime.targetId).toBe(TARGET_ID);
		expect(output.inputs).toEqual([
			expect.objectContaining({
				status: "rejected",
				reason: "运行结束前未被成员接纳",
				action: { type: "切换目标", payload: { targetId: MEMBER_ID } },
			}),
		]);
		engine.cleanup();
	});

	it("运行输入窗口打开前拒绝目标控制，不允许事件跨越录制边界", async () => {
		const engine = createEngine();
		engine.loadScenario(createManualScenario());
		const controller = new MemberController({
			id: "in-process-engine",
			sendIntent: (intent) => engine.processIntent(intent),
		});
		const bindResults = await controller.bind(MEMBER_ID);
		expect(bindResults.every((result) => result.success)).toBe(true);
		const selectResults = await controller.selectTarget(MEMBER_ID);
		expect(selectResults.every((result) => !result.success)).toBe(true);
		const batchResults = await engine.processIntents([
			{
				id: "pre-run-batch-target",
				controllerId: controller.controllerId,
				timestamp: 0,
				type: "切换目标",
				data: { targetId: MEMBER_ID },
			},
		]);
		expect(batchResults.every((result) => !result.success)).toBe(true);

		engine.startRunOutput("pre-run-target-run", { tickStateHistory: "none" });
		expect(() => engine.step()).not.toThrow();
		const output = engine.finishRunOutput("pre-run-target-run");
		engine.acknowledgeRunOutput("pre-run-target-run");

		expect(output.inputs).toEqual([]);
		expect(engine.getMember(MEMBER_ID)?.runtime.targetId).toBe(TARGET_ID);
		engine.cleanup();
	});

	it("目标切换只在实际改变 Member 目标后接纳，无效或相同目标形成拒绝事实", async () => {
		const engine = createEngine();
		engine.loadScenario(createManualScenario());
		const controller = new MemberController({
			id: "in-process-engine",
			sendIntent: (intent) => engine.processIntent(intent),
		});
		const bindResults = await controller.bind(MEMBER_ID);
		expect(bindResults.every((result) => result.success)).toBe(true);

		engine.startRunOutput("target-decisions-run", { tickStateHistory: "none" });
		const unchanged = await controller.selectTarget(TARGET_ID);
		const missing = await controller.selectTarget("missing-target");
		const changed = await controller.selectTarget(MEMBER_ID);
		expect([...unchanged, ...missing, ...changed].every((result) => result.success)).toBe(true);
		engine.step();
		const output = engine.finishRunOutput("target-decisions-run");
		engine.acknowledgeRunOutput("target-decisions-run");

		expect(output.inputs.map((input) => input.status)).toEqual(["rejected", "rejected", "accepted"]);
		expect(output.inputs[0]).toMatchObject({ reason: "target_unchanged" });
		expect(output.inputs[1]).toMatchObject({ reason: "target_not_found" });
		expect(output.inputs[2]).toMatchObject({
			status: "accepted",
			action: { type: "切换目标", payload: { targetId: MEMBER_ID } },
		});
		expect(engine.getMember(MEMBER_ID)?.runtime.targetId).toBe(MEMBER_ID);
		engine.cleanup();
	});

	it("相同场景、策略、候选和随机种子产生等价运行事实", async () => {
		const engine = createEngine();
		const task = createTask("deterministic-preview-run");

		const first = await executeSimulationTask(engine, task);
		const second = await executeSimulationTask(engine, task);

		expect(second).toEqual(first);
		engine.cleanup();
	});
});
