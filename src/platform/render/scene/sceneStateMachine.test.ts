import assert from "node:assert/strict";
import { test } from "vitest";
import { createActor } from "xstate";
import { createDefaultCharacterWorldResource } from "./resources/defaultCharacterResource";
import type { RealtimeSceneConfig } from "./SceneRuntime";
import { createSceneMachine, type SceneMachineDeps } from "./sceneStateMachine";

// ─── 测试桩 deps ──────────────────────────────────────────────────────────────
// 机器只负责编排，所有 babylon 副作用经注入 deps；测试用同步可控的 promise 句柄替身。
type SetupResolvers = {
	resolve: () => void;
	reject: (e?: unknown) => void;
};

function makeDeps(overrides: Partial<SceneMachineDeps> = {}) {
	const calls: string[] = [];
	// 暴露最近一次 setupCharacterContent 的 resolve/reject，便于断言异步完成路径。
	let lastCharacterResolvers: SetupResolvers | null = null;
	let lastRealtimeResolvers: SetupResolvers | null = null;

	const deps: SceneMachineDeps = {
		setupRealtimeResources: () =>
			new Promise<void>((resolve, reject) => {
				calls.push("setupRealtimeResources");
				lastRealtimeResolvers = { resolve, reject };
			}),
		teardownRealtimeResources: () => {
			calls.push("teardownRealtimeResources");
		},
		runCameraTransition: (_direction, _config, onDone) => {
			calls.push("runCameraTransition");
			// 立即完成动画，使 entering/leaving 不阻塞测试。
			queueMicrotask(onDone);
			return () => {};
		},
		attachCameraInput: () => calls.push("attachCameraInput"),
		detachCameraInput: () => calls.push("detachCameraInput"),
		startFollow: () => calls.push("startFollow"),
		stopFollow: () => calls.push("stopFollow"),
		setupCharacterContent: () =>
			new Promise<void>((resolve, reject) => {
				calls.push("setupCharacterContent");
				lastCharacterResolvers = { resolve, reject };
			}),
		teardownCharacterContent: () => {
			calls.push("teardownCharacterContent");
		},
		onError: () => calls.push("onError"),
		...overrides,
	};

	return {
		deps,
		calls,
		resolveCharacter: () => lastCharacterResolvers?.resolve(),
		rejectCharacter: (e?: unknown) => lastCharacterResolvers?.reject(e),
		resolveRealtime: () => lastRealtimeResolvers?.resolve(),
	};
}

// flush 微任务队列，让 fromCallback 的 promise.then(sendBack) 跑完。
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

const startIdle = (deps: SceneMachineDeps) => {
	const actor = createActor(createSceneMachine(deps));
	actor.start();
	actor.send({ type: "READY" });
	return actor;
};

const dummyConfig: RealtimeSceneConfig = { renderSource: {} as never, worldResources: [], initialWorldPoses: [] };
const dummyCharacterResource = createDefaultCharacterWorldResource({
	memberId: "char-1",
	resourceId: "char-1",
	displayName: "Character",
});
const secondCharacterResource = createDefaultCharacterWorldResource({
	memberId: "char-2",
	resourceId: "char-2",
	displayName: "Second Character",
});

test("idle --LOAD_CHARACTER--> loadingCharacter --SETUP_DONE--> character", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	assert.equal(actor.getSnapshot().value, "idle");

	actor.send({ type: "LOAD_CHARACTER", resource: dummyCharacterResource });
	assert.equal(actor.getSnapshot().value, "loadingCharacter");
	assert.equal(actor.getSnapshot().context.characterResource, dummyCharacterResource);
	assert.ok(h.calls.includes("setupCharacterContent"));

	h.resolveCharacter();
	await flush();
	assert.equal(actor.getSnapshot().value, "character");
	assert.equal(actor.getSnapshot().context.contentSource, "character");
});

test("character --RELEASE_CONTENT--> unloadingCharacter --> idle（teardown + 清 contentSource）", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	actor.send({ type: "LOAD_CHARACTER", resource: dummyCharacterResource });
	h.resolveCharacter();
	await flush();
	assert.equal(actor.getSnapshot().value, "character");

	actor.send({ type: "RELEASE_CONTENT" });
	// unloadingCharacter 的 always 立即转回 idle。
	assert.equal(actor.getSnapshot().value, "idle");
	assert.equal(actor.getSnapshot().context.contentSource, "none");
	assert.equal(actor.getSnapshot().context.characterResource, null);
	assert.ok(h.calls.includes("teardownCharacterContent"));
});

test("loadingCharacter 接受新资源并抢占在途加载", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	actor.send({ type: "LOAD_CHARACTER", resource: dummyCharacterResource });
	actor.send({ type: "LOAD_CHARACTER", resource: secondCharacterResource });

	assert.equal(actor.getSnapshot().value, "loadingCharacter");
	assert.equal(actor.getSnapshot().context.characterResource, secondCharacterResource);
	assert.equal(h.calls.filter((call) => call === "setupCharacterContent").length, 2);
	assert.ok(h.calls.includes("teardownCharacterContent"));

	h.resolveCharacter();
	await flush();
	assert.equal(actor.getSnapshot().value, "character");
});

test("character --ACQUIRE--> 先拆角色内容再走 realtime（内容互斥）", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	actor.send({ type: "LOAD_CHARACTER", resource: dummyCharacterResource });
	h.resolveCharacter();
	await flush();
	assert.equal(actor.getSnapshot().value, "character");

	actor.send({ type: "ACQUIRE", config: dummyConfig });
	// 切到 realtime 路径：先 teardownCharacter，再 preparing。
	assert.equal(actor.getSnapshot().value, "preparing");
	assert.equal(actor.getSnapshot().context.characterResource, null);
	const teardownIdx = h.calls.indexOf("teardownCharacterContent");
	const setupIdx = h.calls.indexOf("setupRealtimeResources");
	assert.ok(teardownIdx >= 0 && setupIdx >= 0 && teardownIdx < setupIdx, "应先拆角色内容再建实时资源");

	h.resolveRealtime();
	await flush();
	// preparing --SETUP_DONE--> entering, 动画立即完成 --> realtime
	await flush();
	assert.equal(actor.getSnapshot().value, "realtime");
	assert.equal(actor.getSnapshot().context.contentSource, "realtime");
});

test("loadingCharacter 失败 --FAIL--> error，error 清理两类内容", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	actor.send({ type: "LOAD_CHARACTER", resource: dummyCharacterResource });
	h.rejectCharacter(new Error("boom"));
	await flush();
	assert.equal(actor.getSnapshot().value, "error");
	// error entry 同时 teardown 两类内容。
	assert.ok(h.calls.includes("teardownCharacterContent"));
	assert.ok(h.calls.includes("teardownRealtimeResources"));

	actor.send({ type: "READY" });
	assert.equal(actor.getSnapshot().value, "idle");
	assert.equal(actor.getSnapshot().context.contentSource, "none");
});

test("realtime 路径不受影响：idle --ACQUIRE--> preparing --> realtime --RELEASE--> idle", async () => {
	const h = makeDeps();
	const actor = startIdle(h.deps);
	actor.send({ type: "ACQUIRE", config: dummyConfig });
	assert.equal(actor.getSnapshot().value, "preparing");
	h.resolveRealtime();
	await flush();
	await flush();
	assert.equal(actor.getSnapshot().value, "realtime");

	actor.send({ type: "RELEASE" });
	// leaving 动画立即完成 --> idle
	await flush();
	assert.equal(actor.getSnapshot().value, "idle");
	assert.equal(actor.getSnapshot().context.contentSource, "none");
});
