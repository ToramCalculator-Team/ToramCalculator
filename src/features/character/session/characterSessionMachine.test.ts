import { defaultData } from "@db/defaultData";
import { CharacterWithRelationsSchema } from "@db/generated/repositories/character";
import { PlayerWeaponWithRelationsSchema } from "@db/generated/repositories/player_weapon";
import { CharacterSchema, PlayerSchema } from "@db/generated/zod/index";
import { describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY } from "~/features/character/preview/compileCharacterPreviewBehavior";
import type { SimulationTaskResult } from "~/lib/engine/core/simulationTask";
import { memberFlowInputId } from "~/lib/engine/core/World/Member/memberFlowInput";
import type { CharacterLiveSnapshot } from "../data/CharacterLiveModel";
import type { CharacterAggregateIdentity, CharacterLiveAggregate } from "../data/characterAggregateQuery";
import type {
	CharacterLiveModelPort,
	CharacterSessionDependencies,
	CharacterSessionEngineServicePort,
	CharacterSessionRealtimeHandlePort,
} from "./characterSessionMachine";
import { createCharacterSessionRuntime } from "./characterSessionMachine";

const identityA = { playerId: "player-1", characterId: "character-a" };
const identityB = { playerId: "player-1", characterId: "character-b" };
const identityC = { playerId: "player-1", characterId: "character-c" };
const previewMemberId = `character-preview:${identityA.characterId}:member`;
const previewCandidateInputId = memberFlowInputId(previewMemberId, CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY);

const createDeferred = <T>() => {
	let resolvePromise = (_value: T): void => {
		throw new Error("Deferred Promise 尚未初始化");
	};
	const promise = new Promise<T>((resolve) => {
		resolvePromise = resolve;
	});
	return { promise, resolve: resolvePromise };
};

const createAggregate = (
	identity: CharacterAggregateIdentity,
	name: string,
	options: { skills?: Array<{ id: string; lv: number }> } = {},
): CharacterLiveAggregate => {
	const skills =
		options.skills?.map((skill) => ({
			...defaultData.character_skill,
			id: skill.id,
			lv: skill.lv,
			belongToCharacterId: identity.characterId,
			templateId: `${skill.id}:template`,
			template: {
				...defaultData.skill,
				id: `${skill.id}:template`,
				name: skill.id,
				statistic: defaultData.statistic,
				preSkill: null,
				nextSkills: [],
				variants: [],
			},
		})) ?? [];
	const character = CharacterWithRelationsSchema.parse({
		...defaultData.character,
		id: identity.characterId,
		name,
		belongToPlayerId: identity.playerId,
		weapon: null,
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		avatars: [],
		skills,
		registlets: [],
		consumables: [],
		combos: [],
		statistic: defaultData.statistic,
	});
	return {
		player: PlayerSchema.parse({ ...defaultData.player, id: identity.playerId }),
		character,
		characters: [CharacterSchema.parse(character)],
		assets: {
			weapons: [],
			armors: [],
			options: [],
			specials: [],
			weaponsById: {},
			armorsById: {},
			optionsById: {},
			specialsById: {},
		},
		relations: { skillsById: {}, registletsById: {}, combosById: {}, consumablesById: {} },
	};
};

const liveSnapshot = (
	identity: CharacterAggregateIdentity,
	status: CharacterLiveSnapshot["status"],
	aggregate: CharacterLiveAggregate | null,
	error?: Error,
): CharacterLiveSnapshot => ({
	identity,
	status,
	aggregate,
	aggregateRevision: aggregate ? 1 : 0,
	error,
});

const successfulPreviewTaskResult = (runId: string): SimulationTaskResult => ({
	output: {
		runId,
		durationMs: 100,
		stateHistory: null,
		inputs: [
			{
				inputId: previewCandidateInputId,
				memberId: "character-preview:character-a:member",
				timeMs: 100,
				action: { type: "使用技能", payload: { skillId: "preview-skill" } },
				status: "accepted",
			},
		],
		skillReleases: [],
		damage: [],
	},
	stats: { ticksRun: 1, elapsedMs: 1, reachedLimit: false },
});

class FakeCharacterLiveModel implements CharacterLiveModelPort {
	private snapshot: CharacterLiveSnapshot;
	private readonly listeners = new Set<(snapshot: CharacterLiveSnapshot) => void>();
	private readonly historicalListeners: Array<(snapshot: CharacterLiveSnapshot) => void> = [];
	readonly start = vi.fn();
	readonly stop = vi.fn(async () => {});

	constructor(readonly identity: CharacterAggregateIdentity) {
		this.snapshot = liveSnapshot(identity, "idle", null);
	}

	getSnapshot(): CharacterLiveSnapshot {
		return this.snapshot;
	}

	subscribe(listener: (snapshot: CharacterLiveSnapshot) => void): () => void {
		this.listeners.add(listener);
		this.historicalListeners.push(listener);
		listener(this.snapshot);
		return () => this.listeners.delete(listener);
	}

	emit(snapshot: CharacterLiveSnapshot): void {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener(snapshot);
	}

	/** 模拟已经排进 actor mailbox、但订阅刚好在身份切换时被释放的旧回调。 */
	emitHistorical(snapshot: CharacterLiveSnapshot): void {
		for (const listener of this.historicalListeners) listener(snapshot);
	}
}

class FakeRealtimeHandle implements CharacterSessionRealtimeHandlePort {
	private readonly failureListeners = new Set<(reason: string) => void>();
	readonly close = vi.fn(async () => {});
	readonly loadScenario = vi.fn(async () => {});
	readonly setRuntimeConfig = vi.fn(async () => {});
	readonly patchMemberConfig = vi.fn(async () => {});
	readonly fastForward = vi.fn(async () => ({ ticksRun: 1, elapsedMs: 1, reachedLimit: false }));
	readonly getMembers = vi.fn(async () => []);

	subscribeRuntimeFailure(listener: (reason: string) => void): () => void {
		this.failureListeners.add(listener);
		return () => this.failureListeners.delete(listener);
	}

	emitFailure(reason: string): void {
		for (const listener of this.failureListeners) listener(reason);
	}
}

type HarnessOptions = {
	persistEdits?: CharacterSessionDependencies["persistEdits"];
	openRealtimeEngine?: () => Promise<CharacterSessionRealtimeHandlePort>;
	executeSimulationTask?: CharacterSessionEngineServicePort["executeSimulationTask"];
};

const createHarness = (options: HarnessOptions = {}) => {
	const models: FakeCharacterLiveModel[] = [];
	const handle = new FakeRealtimeHandle();
	const engineService: CharacterSessionEngineServicePort = {
		openRealtimeEngine: vi.fn(options.openRealtimeEngine ?? (async () => handle)),
		executeSimulationTask:
			options.executeSimulationTask ??
			(async () => {
				throw new Error("本组测试不执行一次性模拟任务");
			}),
		executeSimulationTasks: async () => [],
	};
	const runtime = createCharacterSessionRuntime({
		engineService,
		createLiveModel: (identity) => {
			const model = new FakeCharacterLiveModel(identity);
			models.push(model);
			return model;
		},
		persistEdits: options.persistEdits ?? (async () => {}),
	});
	const actor = createActor(runtime.machine);
	return { actor, engineService, handle, models, runtime };
};

const loadReadyCharacter = async (
	harness: ReturnType<typeof createHarness>,
	identity: CharacterAggregateIdentity = identityA,
) => {
	harness.actor.send({ type: "character.load", ...identity });
	const model = harness.models.at(-1);
	if (!model) throw new Error("CharacterLiveModel 未创建");
	model.emit(liveSnapshot(identity, "ready", createAggregate(identity, identity.characterId)));
	await waitFor(harness.actor, (snapshot) => snapshot.matches({ loaded: "active" }));
	return model;
};

describe("CharacterSession 状态机", () => {
	it("live projection 在 actor context 不变时仍逐次发布最新快照", async () => {
		const harness = createHarness();
		const projected: Array<CharacterLiveSnapshot | null> = [];
		const release = harness.runtime.subscribeLiveProjection((snapshot) => projected.push(snapshot));
		harness.actor.start();
		const model = await loadReadyCharacter(harness);
		const updated = {
			...liveSnapshot(identityA, "ready", createAggregate(identityA, "Character Updated")),
			aggregateRevision: 2,
		};
		model.emit(updated);

		await vi.waitFor(() => expect(projected.at(-1)).toBe(updated));
		expect(harness.actor.getSnapshot().context.liveStatus).toBe("ready");
		release();
		harness.actor.stop();
	});

	it("启动即申请实时租约，初始装载必须等待 live ready", async () => {
		const harness = createHarness();
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });

		expect(harness.engineService.openRealtimeEngine).toHaveBeenCalledOnce();
		expect(harness.actor.getSnapshot().matches({ loaded: "loading" })).toBe(true);
		expect(harness.models).toHaveLength(1);
		expect(harness.models[0]?.start).toHaveBeenCalledOnce();

		harness.models[0]?.emit(liveSnapshot(identityA, "loading", null));
		expect(harness.actor.getSnapshot().matches({ loaded: "loading" })).toBe(true);
		harness.models[0]?.emit(liveSnapshot(identityA, "ready", createAggregate(identityA, "A")));
		await waitFor(harness.actor, (snapshot) => snapshot.matches({ loaded: "active" }));
		await waitFor(harness.actor, (snapshot) => snapshot.context.engineStatus === "ready");

		harness.actor.stop();
		await vi.waitFor(() => expect(harness.handle.close).toHaveBeenCalledOnce());
	});

	it("只有 ready 空聚合才把 Character 判为不存在", async () => {
		const harness = createHarness();
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");

		model.emit(liveSnapshot(identityA, "error", null, new Error("subscription failed")));
		expect(harness.actor.getSnapshot().matches({ loaded: "loading" })).toBe(true);
		model.emit(liveSnapshot(identityA, "ready", null));
		await waitFor(harness.actor, (snapshot) => snapshot.matches("idle"));
		expect(harness.actor.getSnapshot().context.identity).toBeNull();
		expect(harness.actor.getSnapshot().context.error).toMatchObject({ operation: "load" });
		expect(model.stop).toHaveBeenCalledOnce();

		harness.actor.stop();
	});

	it("相同身份 load 复用当前 LiveModel，不重建 Session 读面", async () => {
		const harness = createHarness();
		harness.actor.start();
		const model = await loadReadyCharacter(harness);

		harness.actor.send({ type: "character.load", ...identityA });
		expect(harness.actor.getSnapshot().matches({ loaded: "active" })).toBe(true);
		expect(harness.models).toEqual([model]);
		expect(model.stop).not.toHaveBeenCalled();

		harness.actor.stop();
	});

	it("无待处理编辑时原子切换身份，并忽略旧身份延迟到达的 live 事件", async () => {
		const harness = createHarness();
		harness.actor.start();
		const modelA = await loadReadyCharacter(harness);

		harness.actor.send({ type: "character.switch.requested", ...identityB });
		await vi.waitFor(() => expect(harness.models).toHaveLength(2));
		const modelB = harness.models[1];
		if (!modelB) throw new Error("Character B LiveModel 未创建");
		expect(harness.actor.getSnapshot()).toMatchObject({
			value: { loaded: "loading" },
			context: { identity: identityB, pendingIdentity: null },
		});
		expect(modelA.stop).toHaveBeenCalledOnce();

		modelA.emitHistorical(liveSnapshot(identityA, "ready", createAggregate(identityA, "stale A")));
		expect(harness.actor.getSnapshot().matches({ loaded: "loading" })).toBe(true);
		expect(harness.actor.getSnapshot().context.liveStatus).toBe("idle");

		modelB.emit(liveSnapshot(identityB, "ready", createAggregate(identityB, "B")));
		await waitFor(harness.actor, (snapshot) => snapshot.matches({ loaded: "active" }));
		harness.actor.stop();
	});

	it("首条编辑立即提交，并在本地事务完成后提交新身份", async () => {
		const persisted = createDeferred<void>();
		const persistEdits = vi.fn(() => persisted.promise);
		const harness = createHarness({ persistEdits });
		const editStates: string[] = [];
		const release = harness.runtime.subscribeEditProjection((snapshot) => editStates.push(snapshot.status));
		harness.actor.start();
		await loadReadyCharacter(harness);

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.fields.update", patch: { name: "A2" } },
		});
		harness.actor.send({ type: "character.switch.requested", ...identityB });
		await vi.waitFor(() => expect(persistEdits).toHaveBeenCalledOnce());
		expect(harness.actor.getSnapshot().matches({ loaded: "switching" })).toBe(true);
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityA);
		expect(editStates).toContain("committing");

		persisted.resolve(undefined);
		await vi.waitFor(() => expect(harness.models).toHaveLength(2));
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityB);
		expect(harness.runtime.getEditSnapshot()).toEqual({ status: "idle" });

		harness.models[1]?.emit(liveSnapshot(identityB, "ready", createAggregate(identityB, "B")));
		await waitFor(harness.actor, (snapshot) => snapshot.matches({ loaded: "active" }));
		release();
		harness.actor.stop();
	});

	it("本地事务失败保留 A，并拒绝切换到 B", async () => {
		const harness = createHarness({
			persistEdits: async () => {
				throw new Error("transaction failed");
			},
		});
		harness.actor.start();
		await loadReadyCharacter(harness);

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.set", field: "vit", value: 10 },
		});
		harness.actor.send({ type: "character.switch.requested", ...identityB });
		await waitFor(
			harness.actor,
			(snapshot) =>
				snapshot.matches({ loaded: "active" }) &&
				snapshot.context.pendingIdentity === null &&
				snapshot.context.error?.operation === "switch",
		);
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityA);
		expect(harness.models).toHaveLength(1);
		expect(harness.runtime.getEditSnapshot()).toEqual({ status: "failed", error: "transaction failed" });

		harness.actor.stop();
	});

	it("失败编辑阻止后续编辑，并可以显式重试", async () => {
		let attempt = 0;
		const persistEdits = vi.fn(async () => {
			attempt += 1;
			if (attempt === 1) throw new Error("transaction failed");
		});
		const harness = createHarness({ persistEdits });
		harness.actor.start();
		await loadReadyCharacter(harness);

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.set", field: "vit", value: 10 },
		});
		await vi.waitFor(() => expect(harness.runtime.getEditSnapshot().status).toBe("failed"));
		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.set", field: "dex", value: 20 },
		});
		expect(persistEdits).toHaveBeenCalledOnce();

		harness.actor.send({ type: "character.edits.retryFailed" });
		await vi.waitFor(() => expect(persistEdits).toHaveBeenCalledTimes(2));
		await vi.waitFor(() => expect(harness.runtime.getEditSnapshot()).toEqual({ status: "idle" }));

		harness.actor.stop();
	});

	it("switching 期间拒绝新编辑和第二次切换", async () => {
		const deferredPersist = createDeferred<void>();
		const persistEdits = vi.fn(() => deferredPersist.promise);
		const harness = createHarness({ persistEdits });
		harness.actor.start();
		await loadReadyCharacter(harness);

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.set", field: "str", value: 10 },
		});
		harness.actor.send({ type: "character.switch.requested", ...identityB });
		await vi.waitFor(() => expect(persistEdits).toHaveBeenCalledOnce());
		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.set", field: "dex", value: 20 },
		});
		harness.actor.send({ type: "character.switch.requested", ...identityC });

		expect(harness.actor.getSnapshot().matches({ loaded: "switching" })).toBe(true);
		expect(harness.actor.getSnapshot().context.pendingIdentity).toEqual(identityB);
		expect(harness.actor.getSnapshot().context.error).toMatchObject({ operation: "switch" });
		expect(harness.runtime.getEditSnapshot()).toEqual({ status: "committing" });

		deferredPersist.resolve(undefined);
		harness.actor.stop();
	});

	it.each([
		"character.load",
		"character.switch.requested",
	] as const)("%s 切换与另一入口共享验证失效语义", async (type) => {
		const validationResult = createDeferred<SimulationTaskResult>();
		const persistedEdits = createDeferred<void>();
		let finiteTaskSettled = false;
		const executeSimulationTask = vi.fn(async () => {
			const result = await validationResult.promise;
			finiteTaskSettled = true;
			return result;
		});
		const harness = createHarness({
			executeSimulationTask,
			persistEdits: () => persistedEdits.promise,
		});
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const modelA = harness.models[0];
		if (!modelA) throw new Error("Character A LiveModel 未创建");
		await waitFor(harness.actor, (snapshot) => snapshot.context.engineStatus === "ready");
		modelA.emit(
			liveSnapshot(identityA, "ready", createAggregate(identityA, "A", { skills: [{ id: "skill-a", lv: 1 }] })),
		);
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledOnce());
		const originalToken = harness.actor.getSnapshot().context.validation.token;

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.fields.update", patch: { name: "A pending" } },
		});
		harness.actor.send({ type, ...identityB });
		await waitFor(harness.actor, (snapshot) => snapshot.matches({ loaded: "switching" }));
		const invalidatedToken = harness.actor.getSnapshot().context.validation.token;
		expect(invalidatedToken).toBeGreaterThan(originalToken);
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityA);

		validationResult.resolve(successfulPreviewTaskResult("stale-run"));
		await vi.waitFor(() => expect(finiteTaskSettled).toBe(true));
		await Promise.resolve();
		await Promise.resolve();
		expect(harness.actor.getSnapshot().context.validation).toMatchObject({
			token: invalidatedToken,
			status: "running",
			previews: { "skill-a": { status: "running" } },
		});

		persistedEdits.resolve(undefined);
		await vi.waitFor(() => expect(harness.models).toHaveLength(2));
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityB);
		harness.actor.stop();
	});

	it("live error 不阻止已有聚合继续编辑和切换身份", async () => {
		const harness = createHarness();
		harness.actor.start();
		const model = await loadReadyCharacter(harness);

		model.emit(liveSnapshot(identityA, "error", createAggregate(identityA, "A"), new Error("projection failed")));
		expect(harness.actor.getSnapshot().context.liveStatus).toBe("error");
		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.fields.update", patch: { name: "updated" } },
		});
		await vi.waitFor(() => expect(harness.runtime.getEditSnapshot()).toEqual({ status: "idle" }));

		harness.actor.send({ type: "character.switch.requested", ...identityB });
		await vi.waitFor(() => expect(harness.models).toHaveLength(2));
		expect(harness.actor.getSnapshot().context.identity).toEqual(identityB);
		harness.actor.stop();
	});

	it("只有当前机体及其已解析关系变化才推进 validationRevision", async () => {
		const executeSimulationTask = vi.fn(async () => successfulPreviewTaskResult("unrelated-change"));
		const harness = createHarness({ executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		const aggregate = createAggregate(identityA, "A", { skills: [{ id: "skill-a", lv: 1 }] });
		model.emit(liveSnapshot(identityA, "ready", aggregate));
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "ready");
		const validationRevision = harness.actor.getSnapshot().context.validation.validationRevision;
		const validationToken = harness.actor.getSnapshot().context.validation.token;

		const unrelatedCharacter = CharacterSchema.parse({
			...defaultData.character,
			id: identityB.characterId,
			belongToPlayerId: identityB.playerId,
			statisticId: "unrelated-statistic",
		});
		const unrelatedWeapon = PlayerWeaponWithRelationsSchema.parse({
			...defaultData.player_weapon,
			id: "unrelated-weapon",
			name: "Unrelated Weapon",
			belongToPlayerId: identityA.playerId,
			template: null,
			crystals: [],
		});
		model.emit({
			...liveSnapshot(identityA, "ready", {
				...aggregate,
				characters: [...aggregate.characters, unrelatedCharacter],
				assets: {
					...aggregate.assets,
					weapons: [...aggregate.assets.weapons, unrelatedWeapon],
					weaponsById: { ...aggregate.assets.weaponsById, [unrelatedWeapon.id]: unrelatedWeapon },
				},
			}),
			aggregateRevision: 2,
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(executeSimulationTask).toHaveBeenCalledOnce();
		expect(harness.handle.fastForward).toHaveBeenCalledOnce();
		expect(harness.actor.getSnapshot().context.validation).toMatchObject({
			validationRevision,
			token: validationToken,
		});

		const changedCharacter = structuredClone(aggregate.character);
		const changedSkillTemplate = changedCharacter.skills[0]?.template;
		if (!changedSkillTemplate) throw new Error("测试机体缺少已解析技能模板");
		changedSkillTemplate.name = "Changed Skill";
		model.emit({
			...liveSnapshot(identityA, "ready", { ...aggregate, character: changedCharacter }),
			aggregateRevision: 3,
		});
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledTimes(2));
		expect(harness.actor.getSnapshot().context.validation.validationRevision).toBe((validationRevision ?? 0) + 1);
		harness.actor.stop();
	});

	it("编辑事务仍在 committing 时新的 validationRevision 立即进入调度", async () => {
		const persisted = createDeferred<void>();
		const executeSimulationTask = vi.fn(async () => successfulPreviewTaskResult("committing-validation"));
		const harness = createHarness({ persistEdits: () => persisted.promise, executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		model.emit(
			liveSnapshot(identityA, "ready", createAggregate(identityA, "A", { skills: [{ id: "skill-a", lv: 1 }] })),
		);
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "ready");

		harness.actor.send({
			type: "character.edit.submit",
			edit: { type: "character.numeric.adjust", field: "str", delta: 1 },
		});
		expect(harness.runtime.getEditSnapshot()).toEqual({ status: "committing" });
		model.emit({
			...liveSnapshot(
				identityA,
				"ready",
				createAggregate(identityA, "A updated", { skills: [{ id: "skill-a", lv: 1 }] }),
			),
			aggregateRevision: 2,
		});

		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledTimes(2));
		await vi.waitFor(() =>
			expect(harness.actor.getSnapshot().context.validation).toMatchObject({
				validationRevision: 2,
				status: "ready",
			}),
		);
		expect(harness.runtime.getEditSnapshot()).toEqual({ status: "committing" });
		persisted.resolve(undefined);
		harness.actor.stop();
	});

	it("手动刷新在相同 validationRevision 上生成新 token 和任务", async () => {
		const executeSimulationTask = vi.fn(async () => successfulPreviewTaskResult("manual-refresh"));
		const harness = createHarness({ executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		model.emit(
			liveSnapshot(identityA, "ready", createAggregate(identityA, "A", { skills: [{ id: "skill-a", lv: 1 }] })),
		);
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "ready");
		const before = harness.actor.getSnapshot().context.validation;

		harness.actor.send({ type: "character.preview.refresh" });
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledTimes(2));
		await vi.waitFor(() => expect(harness.actor.getSnapshot().context.validation.status).toBe("ready"));
		const after = harness.actor.getSnapshot().context.validation;
		expect(after.validationRevision).toBe(before.validationRevision);
		expect(after.token).toBeGreaterThan(before.token);
		harness.actor.stop();
	});

	it("失败项重试只重跑指定技能并保留同一 validationRevision", async () => {
		let callCount = 0;
		const executeSimulationTask = vi.fn(async () => {
			callCount += 1;
			if (callCount === 2) throw new Error("candidate failed");
			return successfulPreviewTaskResult(`retry-${callCount}`);
		});
		const harness = createHarness({ executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		model.emit(
			liveSnapshot(
				identityA,
				"ready",
				createAggregate(identityA, "A", {
					skills: [
						{ id: "skill-a", lv: 1 },
						{ id: "skill-b", lv: 1 },
					],
				}),
			),
		);
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "partial");
		const before = harness.actor.getSnapshot().context.validation;

		harness.actor.send({ type: "character.preview.retryFailed", candidateSkillId: "skill-b" });
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledTimes(3));
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "ready");
		const after = harness.actor.getSnapshot().context.validation;
		expect(after.validationRevision).toBe(before.validationRevision);
		expect(after.previews["skill-a"]?.status).toBe("succeeded");
		expect(after.previews["skill-b"]?.status).toBe("succeeded");
		harness.actor.stop();
	});

	it("validationRevision 变化统一触发属性同步和技能批任务，并保留部分失败", async () => {
		const executeSimulationTask = vi.fn(
			async (): Promise<SimulationTaskResult> => ({
				output: {
					runId: "run",
					durationMs: 100,
					stateHistory: null,
					inputs: [
						{
							inputId: previewCandidateInputId,
							memberId: "character-preview:character-a:member",
							timeMs: 100,
							action: { type: "使用技能", payload: { skillId: "preview-skill" } },
							status: "accepted",
						},
					],
					skillReleases: [],
					damage: [],
				},
				stats: { ticksRun: 1, elapsedMs: 1, reachedLimit: false },
			}),
		);
		let callCount = 0;
		executeSimulationTask.mockImplementation(async () => {
			callCount += 1;
			if (callCount === 2) throw new Error("candidate worker failed");
			return {
				output: {
					runId: `run-${callCount}`,
					durationMs: 100,
					stateHistory: null,
					inputs: [
						{
							inputId: previewCandidateInputId,
							memberId: "character-preview:character-a:member",
							timeMs: 100,
							action: { type: "使用技能", payload: { skillId: "preview-skill" } },
							status: "accepted",
						},
					],
					skillReleases: [],
					damage: [],
				},
				stats: { ticksRun: 1, elapsedMs: 1, reachedLimit: false },
			};
		});
		const harness = createHarness({ executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		const aggregate = createAggregate(identityA, "A", {
			skills: [
				{ id: "skill-a", lv: 1 },
				{ id: "skill-b", lv: 1 },
			],
		});
		model.emit(liveSnapshot(identityA, "ready", aggregate));
		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "partial");
		expect(harness.handle.loadScenario).toHaveBeenCalledOnce();
		expect(executeSimulationTask).toHaveBeenCalledTimes(2);
		expect(harness.actor.getSnapshot().context.validation.previews["skill-a"]).toMatchObject({
			status: "succeeded",
		});
		expect(harness.actor.getSnapshot().context.validation.previews["skill-b"]).toMatchObject({
			status: "failed",
			error: "candidate worker failed",
		});

		harness.actor.stop();
	});

	it("实时 fastForward 达到预算时保留为可见属性验证失败", async () => {
		const harness = createHarness();
		harness.handle.fastForward.mockResolvedValue({ ticksRun: 3_600, elapsedMs: 15_000, reachedLimit: true });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		model.emit(liveSnapshot(identityA, "ready", createAggregate(identityA, "A", { skills: [] })));

		await waitFor(harness.actor, (snapshot) => snapshot.context.validation.status === "failed");
		expect(harness.actor.getSnapshot().context.validation).toMatchObject({
			attributeStatus: "failed",
			error: "Character 属性同步超过模拟预算",
		});
		harness.actor.stop();
	});

	it("新 validationRevision 到达时旧验证结果不能覆盖当前输入，失败项可显式重试", async () => {
		const firstDeferred = createDeferred<SimulationTaskResult>();
		const secondDeferred = createDeferred<SimulationTaskResult>();
		const executeSimulationTask = vi.fn(async () =>
			executeSimulationTask.mock.calls.length === 1 ? firstDeferred.promise : secondDeferred.promise,
		);
		const harness = createHarness({ executeSimulationTask });
		harness.actor.start();
		harness.actor.send({ type: "character.load", ...identityA });
		const model = harness.models[0];
		if (!model) throw new Error("CharacterLiveModel 未创建");
		const firstAggregate = createAggregate(identityA, "A", { skills: [{ id: "skill-a", lv: 1 }] });
		model.emit(liveSnapshot(identityA, "ready", firstAggregate));
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledOnce());

		const secondAggregate = createAggregate(identityA, "A2", { skills: [{ id: "skill-b", lv: 1 }] });
		model.emit({ ...liveSnapshot(identityA, "ready", secondAggregate), aggregateRevision: 2 });
		firstDeferred.resolve({
			output: {
				runId: "old-run",
				durationMs: 100,
				stateHistory: null,
				inputs: [
					{
						inputId: previewCandidateInputId,
						memberId: "character-preview:character-a:member",
						timeMs: 100,
						action: { type: "使用技能", payload: { skillId: "preview-skill" } },
						status: "accepted",
					},
				],
				skillReleases: [],
				damage: [],
			},
			stats: { ticksRun: 1, elapsedMs: 1, reachedLimit: false },
		});
		await vi.waitFor(() => expect(executeSimulationTask).toHaveBeenCalledTimes(2));
		secondDeferred.resolve({
			output: {
				runId: "new-run",
				durationMs: 100,
				stateHistory: null,
				inputs: [
					{
						inputId: previewCandidateInputId,
						memberId: "character-preview:character-a:member",
						timeMs: 100,
						action: { type: "使用技能", payload: { skillId: "preview-skill" } },
						status: "accepted",
					},
				],
				skillReleases: [],
				damage: [],
			},
			stats: { ticksRun: 1, elapsedMs: 1, reachedLimit: false },
		});
		await vi.waitFor(() => expect(harness.actor.getSnapshot().context.validation.validationRevision).toBe(2));
		expect(harness.actor.getSnapshot().context.validation.previews["skill-a"]).toBeUndefined();
		expect(harness.actor.getSnapshot().context.validation.previews["skill-b"]).toBeDefined();
		harness.actor.stop();
	});

	it("租约在异步申请完成前停止 Session 也只释放一次", async () => {
		const deferredHandle = createDeferred<CharacterSessionRealtimeHandlePort>();
		const handle = new FakeRealtimeHandle();
		const harness = createHarness({
			openRealtimeEngine: () => deferredHandle.promise,
		});
		harness.actor.start();
		harness.actor.stop();
		deferredHandle.resolve(handle);

		await vi.waitFor(() => expect(handle.close).toHaveBeenCalledOnce());
		await Promise.resolve();
		expect(handle.close).toHaveBeenCalledOnce();
	});
});
