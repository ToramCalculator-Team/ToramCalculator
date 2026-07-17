import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { createActor, setup, waitFor } from "xstate";
import type { CharacterLiveSnapshot } from "../data/CharacterLiveModel";
import { createCharacterSessionFacade } from "./CharacterSession";
import type { CharacterSessionRealtimeHandlePort } from "./characterSessionMachine";
import { createCharacterSessionRuntime } from "./characterSessionMachine";

const identity = { playerId: "player-1", characterId: "character-1" };

const createLive = (): CharacterLiveSnapshot => ({
	identity,
	status: "idle",
	aggregate: null,
	aggregateRevision: 0,
	error: undefined,
});

class FakeHandle implements CharacterSessionRealtimeHandlePort {
	readonly close = vi.fn(async () => {});
	readonly loadScenario = vi.fn(async () => {});
	readonly setRuntimeConfig = vi.fn(async () => {});
	readonly patchMemberConfig = vi.fn(async () => {});
	readonly fastForward = vi.fn(async () => ({ ticksRun: 0, elapsedMs: 0, reachedLimit: false }));
	readonly getMembers = vi.fn(async () => []);
	subscribeRuntimeFailure(): () => void {
		return () => {};
	}
}

describe("CharacterSession facade 与 AUI child", () => {
	it("facade 只转发语义意图并读取 live 快照，不暴露 runtime 控制面", async () => {
		const handle = new FakeHandle();
		let live = createLive();
		const runtime = createCharacterSessionRuntime({
			engineService: {
				openRealtimeEngine: async () => handle,
				executeSimulationTask: async () => {
					throw new Error("unused");
				},
				executeSimulationTasks: async () => [],
			},
			createLiveModel: () => ({
				identity,
				getSnapshot: () => live,
				subscribe: (listener) => {
					listener(live);
					return () => {};
				},
				start: () => {},
				stop: async () => {},
			}),
		});
		const actor = createActor(runtime.machine);
		actor.start();
		const characterListeners = new Set<(snapshot: CharacterLiveSnapshot | null) => void>();
		const facadeScope = createRoot((dispose) => {
			const facade = createCharacterSessionFacade(
				actor,
				{
					getSnapshot: () => live,
					subscribe: (listener) => {
						characterListeners.add(listener);
						listener(live);
						return () => characterListeners.delete(listener);
					},
				},
				{
					getSnapshot: runtime.getEditSnapshot,
					subscribe: runtime.subscribeEditProjection,
				},
			);
			return { dispose, facade };
		});
		const facade = facadeScope.facade;

		facade.send({ type: "character.edit.submit", edit: { type: "character.fields.update", patch: { name: "A" } } });
		expect(actor.getSnapshot().context.error?.operation).toBe("edit");
		expect(facade.snapshot().context.error?.operation).toBe("edit");
		expect(facade.error()?.operation).toBe("edit");

		facade.send({ type: "character.load", ...identity });
		await waitFor(actor, (snapshot) => snapshot.context.identity?.characterId === identity.characterId);
		expect(actor.getSnapshot().context.identity).toEqual(identity);
		expect(facade.identity()).toEqual(identity);
		actor.send({
			type: "validation.started",
			token: 1,
			identity,
			validationRevision: 1,
			candidateSkillIds: ["skill-1"],
			preserveResults: false,
		});
		expect(facade.validation()).toMatchObject({
			status: "running",
			attributeStatus: "running",
			previews: { "skill-1": { status: "running" } },
		});
		actor.send({
			type: "validation.completed",
			token: 1,
			identity,
			validationRevision: 1,
			attribute: { ok: true, members: [] },
			previews: { "skill-1": { status: "failed", error: "preview failed" } },
		});
		expect(facade.validation()).toMatchObject({
			status: "partial",
			attributeStatus: "ready",
			previews: { "skill-1": { status: "failed", error: "preview failed" } },
		});
		expect(facade.character()).toBe(live);
		expect("getLiveModel" in facade).toBe(false);
		expect("getRealtimeHandle" in facade).toBe(false);
		expect("getEditQueue" in facade).toBe(false);

		live = { ...live, status: "ready", aggregateRevision: 1 };
		for (const listener of characterListeners) listener(live);
		expect(facade.character()?.aggregateRevision).toBe(1);

		// actor context 没有变化时，Character projection 仍必须独立驱动 facade 更新。
		live = { ...live, aggregateRevision: 2 };
		for (const listener of characterListeners) listener(live);
		expect(facade.character()?.aggregateRevision).toBe(2);

		live = { ...live, status: "error", error: new Error("projection failed") };
		for (const listener of characterListeners) listener(live);
		expect(facade.character()?.status).toBe("error");
		facadeScope.dispose();
		actor.stop();
	});

	it("fake parent 持有唯一 CharacterSession child，父机停止后 Handle 只关闭一次", async () => {
		const handle = new FakeHandle();
		const runtime = createCharacterSessionRuntime({
			engineService: {
				openRealtimeEngine: async () => handle,
				executeSimulationTask: async () => {
					throw new Error("unused");
				},
				executeSimulationTasks: async () => [],
			},
			createLiveModel: () => ({
				identity,
				getSnapshot: createLive,
				subscribe: () => () => {},
				start: () => {},
				stop: async () => {},
			}),
		});
		const parentLogic = setup({ actors: { characterSession: runtime.machine } }).createMachine({
			id: "fakeParent",
			initial: "running",
			states: {
				running: { invoke: { id: "characterSession", src: "characterSession", systemId: "characterSession" } },
			},
		});
		const parent = createActor(parentLogic);
		parent.start();
		const child = parent.system.get("characterSession");
		if (!child) throw new Error("CharacterSession child 未启动");
		child.send({ type: "character.load", ...identity });
		await waitFor(parent, (snapshot) => snapshot.matches("running"));
		parent.stop();
		await vi.waitFor(() => expect(handle.close).toHaveBeenCalledOnce());
	});
});
