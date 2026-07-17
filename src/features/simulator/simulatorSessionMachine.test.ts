import { defaultData } from "@db/defaultData";
import { describe, expect, it, vi } from "vitest";
import { createActor, createMachine, sendTo, waitFor } from "xstate";
import type { EngineLifecycleSnapshot } from "~/lib/engine/core/GameEngineSM";
import type { EngineRunOutput } from "~/lib/engine/core/runOutput";
import type { EngineWorkerClientEventMap } from "~/lib/engine/core/thread/EngineWorkerClient";
import { createTestTickStateHistory } from "~/lib/engine/core/tickStateHistory.testUtils";
import { EventEmitter } from "~/lib/WorkerPool/EventEmitter";
import { createInterfaceStateMachine } from "~/machines/interfaceStateMachine";
import {
	createSimulatorSessionMachine,
	createSimulatorSessionRuntime,
	type SimulatorSessionActorRef,
	type SimulatorSessionRealtimeHandlePort,
} from "./simulatorSessionMachine";

const createDesign = (simulatorId = "simulator-1") => {
	const character = {
		...defaultData.character,
		id: "character-1",
		belongToPlayerId: "player-1",
		weapon: null,
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		skills: [],
		registlets: [],
		avatars: [],
		consumables: [],
		combos: [],
	};
	const mob = { ...defaultData.mob, id: "mob-1" };
	return {
		...defaultData.simulator,
		id: simulatorId,
		primaryMemberId: "member-player",
		teams: [
			{
				...defaultData.team,
				id: "team-a",
				camp: "A" as const,
				belongToSimulatorId: simulatorId,
				members: [
					{
						...defaultData.member,
						id: "member-player",
						type: "Player" as const,
						characterId: character.id,
						character,
						mob: null,
						belongToTeamId: "team-a",
					},
				],
			},
			{
				...defaultData.team,
				id: "team-b",
				camp: "B" as const,
				belongToSimulatorId: simulatorId,
				members: [
					{
						...defaultData.member,
						id: "member-mob",
						type: "Mob" as const,
						characterId: null,
						character: null,
						mobId: mob.id,
						mobDifficultyFlag: "Normal" as const,
						mob,
						belongToTeamId: "team-b",
					},
				],
			},
		],
		analysisSourceMembers: [{ id: "member-player" }],
		analysisTargetMembers: [{ id: "member-mob" }],
	};
};

class FakeRealtimeHandle implements SimulatorSessionRealtimeHandlePort {
	private readonly emitter = new EventEmitter();
	private readonly lifecycleListeners = new Set<(snapshot: EngineLifecycleSnapshot) => void>();
	private lifecycleSnapshot: EngineLifecycleSnapshot = { state: "idle", confirmedState: "idle", pending: null };
	private setLifecycle(state: EngineLifecycleSnapshot["confirmedState"]): void {
		this.lifecycleSnapshot = { state, confirmedState: state, pending: null };
		for (const listener of this.lifecycleListeners) listener(this.lifecycleSnapshot);
	}
	loadScenario = vi.fn(async () => this.setLifecycle("ready"));
	setRuntimeConfig = vi.fn(async () => undefined);
	setRealtimeSnapshotHz = vi.fn(async () => undefined);
	getMembers = vi.fn(async () => []);
	bindMemberController = vi.fn(async () => ({ controllerId: "controller-1", boundMemberId: "member-player" }));
	unbindAllMemberControllers = vi.fn(async () => undefined);
	selectMemberTarget = vi.fn(async () => undefined);
	getMemberSkillList = vi.fn(async () => []);
	startRunOutput = vi.fn(async () => undefined);
	cancelRunOutput = vi.fn(async () => undefined);
	start = vi.fn(async () => this.setLifecycle("running"));
	stop = vi.fn(async () => this.setLifecycle("ready"));
	finishRunOutput = vi.fn(
		async (runId: string): Promise<EngineRunOutput> => ({
			runId,
			durationMs: 100,
			stateHistory: createTestTickStateHistory(1, 100),
			inputs: [
				{
					inputId: `${runId}:input-1`,
					memberId: "member-player",
					timeMs: 100,
					action: { type: "使用技能", payload: { skillId: "skill-1" } },
					status: "accepted" as const,
				},
			],
			skillReleases: [],
			damage: [],
		}),
	);
	acknowledgeRunOutput = vi.fn(async () => undefined);
	pause = vi.fn(async () => this.setLifecycle("paused"));
	resume = vi.fn(async () => this.setLifecycle("running"));
	step = vi.fn(async () => undefined);
	castMemberSkill = vi.fn(async () => undefined);
	unloadScenario = vi.fn(async () => this.setLifecycle("idle"));
	getRenderSnapshot = vi.fn(async () => ({
		tickIndex: 0,
		currentTimeMs: 0,
		members: [],
		areas: [],
		cameraFollowEntityId: null,
	}));
	close = vi.fn(async () => undefined);

	subscribeLifecycle(listener: (snapshot: EngineLifecycleSnapshot) => void): () => void {
		this.lifecycleListeners.add(listener);
		listener(this.lifecycleSnapshot);
		return () => this.lifecycleListeners.delete(listener);
	}

	on<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener: (payload: EngineWorkerClientEventMap[K]) => void,
	): () => void {
		this.emitter.on(event, listener);
		return () => this.off(event, listener);
	}

	off<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener?: (payload: EngineWorkerClientEventMap[K]) => void,
	): void {
		this.emitter.off(event, listener);
	}

	emitRuntimeFailure(reason: string): void {
		this.emitter.emit("runtime_failure", { engineId: "test-engine", reason });
	}
}

const createSessionMachine = (handle: FakeRealtimeHandle) =>
	createSimulatorSessionMachine({ openRealtimeEngine: vi.fn(async () => handle) });

const createParentMachine = (handle: FakeRealtimeHandle) =>
	createInterfaceStateMachine({
		simulatorSession: createSessionMachine(handle),
		characterSession: createMachine({}),
	});

describe("SimulatorSession 父子提交协议", () => {
	it("AUI 只在验证启动和产出移交成功事实后切换稳定阶段", async () => {
		const handle = new FakeRealtimeHandle();
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		// systemId 查询返回通用 ActorRef；测试使用与父机同一处注入的具体 session logic 收窄类型。
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign() });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));

		child.send({ type: "validation.start.requested" });
		expect(parent.getSnapshot().matches({ simulator: "designing" })).toBe(true);
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "validating" }));
		expect(child.getSnapshot().matches("runActive")).toBe(true);
		expect(handle.loadScenario).toHaveBeenCalledWith(
			expect.objectContaining({
				scenario: expect.objectContaining({ initialTargetIds: { "member-player": "member-mob" } }),
			}),
		);
		expect(handle.selectMemberTarget).not.toHaveBeenCalled();

		child.send({ type: "validation.finish.requested" });
		expect(parent.getSnapshot().matches({ simulator: "validating" })).toBe(true);
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "analyzing" }));

		const session = child.getSnapshot().context;
		expect(session.runRecords).toHaveLength(1);
		expect(session.runRecords[0]?.designCopyId).toBe(session.designCopies[0]?.id);
		expect(session.runRecords[0]?.output.runId).toBe(session.runRecords[0]?.id);
		expect(handle.acknowledgeRunOutput).toHaveBeenCalledOnce();

		child.send({ type: "validation.start.requested" });
		await waitFor(
			child,
			(snapshot) => snapshot.matches("ready") && snapshot.context.error?.operation === "startValidation",
		);
		expect(parent.getSnapshot().matches({ simulator: "analyzing" })).toBe(true);

		parent.stop();
	});

	it("Worker 失败保留在 Session 决策状态，返回设计经 AUI 授权后才改变阶段", async () => {
		const handle = new FakeRealtimeHandle();
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		// systemId 与注入 logic 在测试组合入口一一对应，因此可收窄为具体 Session actor。
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign() });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		child.send({ type: "validation.start.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "validating" }));

		handle.emitRuntimeFailure("worker crashed");
		await waitFor(child, (snapshot) => snapshot.matches("validationFailedDecision"));
		expect(parent.getSnapshot().matches({ simulator: "validating" })).toBe(true);
		expect(child.getSnapshot().context.error?.message).toBe("worker crashed");

		child.send({ type: "validation.returnToDesign.requested" });
		expect(parent.getSnapshot().matches({ simulator: "validating" })).toBe(true);
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		expect(child.getSnapshot().matches("ready")).toBe(true);

		parent.stop();
	});

	it("验证启动失败不提交 validating，且释放未提交的运行收集器", async () => {
		const handle = new FakeRealtimeHandle();
		const startFailure = new Error("start failed");
		handle.start = vi.fn(async () => {
			throw startFailure;
		});
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		// systemId 与注入 logic 在测试组合入口一一对应，因此可收窄为具体 Session actor。
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign() });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		child.send({ type: "validation.start.requested" });
		await waitFor(
			child,
			(snapshot) => snapshot.matches("ready") && snapshot.context.error?.operation === "startValidation",
		);

		expect(parent.getSnapshot().matches({ simulator: "designing" })).toBe(true);
		expect(handle.cancelRunOutput).toHaveBeenCalledOnce();
		expect(child.getSnapshot().context.activeRun).toBeNull();

		parent.stop();
	});

	it("产出收到后立即建立 RunRecord，ACK 失败只阻塞资源释放且重试不重复建档", async () => {
		const handle = new FakeRealtimeHandle();
		let acknowledgeAttempts = 0;
		handle.acknowledgeRunOutput = vi.fn(async () => {
			acknowledgeAttempts += 1;
			if (acknowledgeAttempts === 1) throw new Error("ack response lost");
		});
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		// systemId 与注入 logic 在测试组合入口一一对应，因此可收窄为具体 Session actor。
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign() });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		child.send({ type: "validation.start.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "validating" }));
		child.send({ type: "validation.finish.requested" });
		await waitFor(child, (snapshot) => snapshot.matches("outputReleaseFailed"));

		expect(parent.getSnapshot().matches({ simulator: "validating" })).toBe(true);
		expect(child.getSnapshot().context.runRecords).toHaveLength(1);
		expect(child.getSnapshot().context.unreleasedOutput?.runId).toBe(child.getSnapshot().context.runRecords[0]?.id);
		child.send({ type: "validation.finish.retry" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "analyzing" }));

		expect(child.getSnapshot().context.runRecords).toHaveLength(1);
		expect(child.getSnapshot().matches("ready")).toBe(true);
		expect(child.getSnapshot().context.unreleasedOutput).toBeNull();
		expect(acknowledgeAttempts).toBe(2);

		parent.stop();
	});

	it("AUI 拒绝切换时保留当前设计身份并清除 pending 目标", async () => {
		const handle = new FakeRealtimeHandle();
		const parent = createActor(
			createMachine({
				invoke: {
					id: "simulatorSession",
					systemId: "simulatorSession",
					src: createSessionMachine(handle),
				},
				on: {
					"simulator.session.switch.proposed": {
						actions: sendTo("simulatorSession", { type: "session.switch.denied", reason: "switch denied" }),
					},
				},
			}),
		);
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign("simulator-a") });
		await waitFor(child, (snapshot) => snapshot.matches("ready"));
		const designCopyIds = child.getSnapshot().context.designCopies.map((copy) => copy.id);
		child.send({ type: "session.switch.requested", design: createDesign("simulator-b") });
		await waitFor(
			child,
			(snapshot) => snapshot.matches("ready") && snapshot.context.error?.message === "switch denied",
		);

		expect(child.getSnapshot().context.simulatorId).toBe("simulator-a");
		expect(child.getSnapshot().context.pendingDesign).toBeNull();
		expect(child.getSnapshot().context.designCopies.map((copy) => copy.id)).toEqual(designCopyIds);
		parent.stop();
	});

	it("切换资源释放失败时保留 A 的 DesignCopy 与 RunRecord", async () => {
		const handle = new FakeRealtimeHandle();
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign("simulator-a") });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		child.send({ type: "validation.start.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "validating" }));
		child.send({ type: "validation.finish.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "analyzing" }));
		const beforeSwitch = child.getSnapshot().context;
		const designCopyIds = beforeSwitch.designCopies.map((copy) => copy.id);
		const runIds = beforeSwitch.runRecords.map((record) => record.id);
		handle.unloadScenario = vi.fn(async () => {
			throw new Error("unload failed");
		});

		child.send({ type: "session.switch.requested", design: createDesign("simulator-b") });
		await waitFor(
			child,
			(snapshot) => snapshot.matches("ready") && snapshot.context.error?.message === "unload failed",
		);

		expect(child.getSnapshot().context.simulatorId).toBe("simulator-a");
		expect(child.getSnapshot().context.designCopies.map((copy) => copy.id)).toEqual(designCopyIds);
		expect(child.getSnapshot().context.runRecords.map((record) => record.id)).toEqual(runIds);
		parent.stop();
	});

	it("从历史 RunRecord 的源副本连续分支成员流程，不写入当前其他副本", async () => {
		const handle = new FakeRealtimeHandle();
		const parent = createActor(createParentMachine(handle));
		parent.start();
		const childRef = parent.system.get("simulatorSession");
		if (!childRef) throw new Error("SimulatorSession child 未启动");
		const child = childRef as SimulatorSessionActorRef;

		child.send({ type: "session.initialLoad.requested", design: createDesign() });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "designing" }));
		child.send({ type: "validation.start.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "validating" }));
		child.send({ type: "validation.finish.requested" });
		await waitFor(parent, (snapshot) => snapshot.matches({ simulator: "analyzing" }));

		const completed = child.getSnapshot().context;
		const record = completed.runRecords[0];
		if (!record) throw new Error("缺少测试 RunRecord");
		const source = completed.designCopies.find((copy) => copy.id === record.designCopyId);
		if (!source) throw new Error("缺少测试源 DesignCopy");
		const sourceLevel = source.design.teams[0].members[0].character?.lv;

		child.send({ type: "design.characterNumber.changed", field: "lv", value: 255 });
		const unrelatedCopyId = child.getSnapshot().context.currentDesignCopyId;
		expect(unrelatedCopyId).not.toBe(source.id);
		child.send({ type: "run.behavior.save.requested", runId: record.id });

		const firstSavedContext = child.getSnapshot().context;
		const firstSaved = firstSavedContext.designCopies.find((copy) => copy.id === firstSavedContext.currentDesignCopyId);
		if (!firstSaved) throw new Error("缺少第一次行动录制副本");
		expect(firstSaved.createdFromId).toBe(source.id);
		expect(firstSaved.design.teams[0].members[0].character?.lv).toBe(sourceLevel);
		expect(firstSaved.design.teams[0].members[0].behavior?.definition).toContain('castSkill, "skill-1"');
		const unrelated = firstSavedContext.designCopies.find((copy) => copy.id === unrelatedCopyId);
		expect(unrelated?.design.teams[0].members[0].character?.lv).toBe(255);

		child.send({ type: "run.behavior.save.requested", runId: record.id });
		const secondSavedContext = child.getSnapshot().context;
		const secondSaved = secondSavedContext.designCopies.find(
			(copy) => copy.id === secondSavedContext.currentDesignCopyId,
		);
		expect(secondSaved?.createdFromId).toBe(source.id);
		expect(secondSaved?.id).not.toBe(firstSaved.id);
		expect(secondSavedContext.designCopies).toHaveLength(firstSavedContext.designCopies.length + 1);

		child.send({ type: "run.behavior.save.requested", runId: "missing-run" });
		expect(child.getSnapshot().context.error).toEqual({
			operation: "behaviorSave",
			message: "RunRecord 不存在: missing-run",
		});
		parent.stop();
	});
});

describe("SimulatorSession 生命周期只读投影", () => {
	it("从 Handle snapshot 投影 running，而不解释 RESULT 事件", async () => {
		const handle = new FakeRealtimeHandle();
		const runtime = createSimulatorSessionRuntime({ openRealtimeEngine: async () => handle });
		const actor = createActor(runtime.machine);
		actor.start();
		await waitFor(actor, (snapshot) => snapshot.context.engineStatus === "ready");

		expect(runtime.getRuntimeSnapshot().isRunning).toBe(false);
		await handle.start();
		expect(runtime.getRuntimeSnapshot().isRunning).toBe(true);
		await handle.pause();
		expect(runtime.getRuntimeSnapshot().isRunning).toBe(false);

		actor.stop();
	});
});
