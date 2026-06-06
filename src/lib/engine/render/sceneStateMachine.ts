/**
 * 场景状态机。
 *
 * 职责：作为 SceneRuntimeCore 内"场景处于哪个阶段、阶段间如何过渡"的单一真相源。
 * 设计：机器只做编排（状态/事件/守卫），所有 babylon 副作用通过注入的 deps 回调执行，
 *       使 babylon 细节留在 SceneRuntimeCore，机器本身可独立测试。
 *
 * 状态流转：
 *   loading --READY--> idle(观察稳态)
 *   idle --ACQUIRE--> entering(建实时资源 + 相机飞入动画) --ANIM_DONE--> realtime(跟随稳态)
 *   realtime --RELEASE--> leaving(相机飞回动画 + 拆实时资源) --ANIM_DONE--> idle
 *   任意 --FAIL--> error
 *
 * 见 src/lib/engine/render/SceneRuntimeCore.tsx 的接入点。
 */

import { type ActorRefFrom, fromCallback, setup } from "xstate";
import type { RealtimeSceneConfig } from "./SceneRuntime";

export type SceneMachineContext = {
	/** 当前实时会话配置；进入 entering 时由 ACQUIRE 事件写入，回到 idle 时清空。 */
	config: RealtimeSceneConfig | null;
};

export type SceneMachineEvent =
	| { type: "READY" }
	| { type: "ACQUIRE"; config: RealtimeSceneConfig }
	| { type: "SETUP_DONE" }
	| { type: "ANIM_DONE" }
	| { type: "RELEASE" }
	| { type: "FAIL" };

/**
 * 注入给机器的 babylon 副作用回调。SceneRuntimeCore 实现这些，机器只负责按状态调用。
 * - setupRealtimeResources：建 rendererController/communication、应用 snapshot、预摆位相机。返回 Promise（含异步 snapshot）。
 * - teardownRealtimeResources：拆除上述资源、清理 realtimeRoot 子节点、相机输入 detach。
 * - runCameraTransition：用 babylon Animation 把相机补间到目标位（"enter" 飞入跟随位 / "leave" 飞回观察位），完成调用 onDone。返回取消函数。
 * - attachCameraInput / detachCameraInput：实时稳态启用 / 过渡期禁用鼠标输入。
 * - startFollow / stopFollow：让 ThirdPersonCameraController 开始 / 停止驱动相机跟随。
 */
export type SceneMachineDeps = {
	setupRealtimeResources: (config: RealtimeSceneConfig) => Promise<void>;
	teardownRealtimeResources: () => void;
	runCameraTransition: (
		direction: "enter" | "leave",
		config: RealtimeSceneConfig | null,
		onDone: () => void,
	) => () => void;
	attachCameraInput: () => void;
	detachCameraInput: () => void;
	startFollow: (config: RealtimeSceneConfig | null) => void;
	stopFollow: () => void;
	onError: (error: unknown) => void;
};

// ─── 工厂函数（闭包捕获 deps，仿 playerFSM 范式） ──────────────────────────────

export const createSceneMachine = (deps: SceneMachineDeps) => {
	const machineSetup = setup({
		types: {
			context: {} as SceneMachineContext,
			events: {} as SceneMachineEvent,
		},
		actions: {
			detachInput: () => deps.detachCameraInput(),
			attachInput: () => deps.attachCameraInput(),
			startFollow: ({ context }) => deps.startFollow(context.config),
			stopFollow: () => deps.stopFollow(),
			teardown: () => deps.teardownRealtimeResources(),
		},
		actors: {
			// 建实时资源：异步（含 snapshot 拉取）。失败转 error。
			setupResources: fromCallback<SceneMachineEvent, { config: RealtimeSceneConfig | null }>(
				({ sendBack, input }) => {
					let cancelled = false;
					if (!input.config) {
						sendBack({ type: "FAIL" });
						return () => {};
					}
					deps
						.setupRealtimeResources(input.config)
						.then(() => {
							if (!cancelled) sendBack({ type: "SETUP_DONE" });
						})
						.catch((error) => {
							deps.onError(error);
							if (!cancelled) sendBack({ type: "FAIL" });
						});
					return () => {
						cancelled = true;
					};
				},
			),
			// 相机过渡动画：babylon Animation 跑完回 ANIM_DONE；exit 时取消。
			cameraTransition: fromCallback<SceneMachineEvent, { direction: "enter" | "leave"; config: RealtimeSceneConfig | null }>(
				({ sendBack, input }) => {
					const cancel = deps.runCameraTransition(input.direction, input.config, () => {
						sendBack({ type: "ANIM_DONE" });
					});
					return cancel;
				},
			),
		},
	});

	return machineSetup.createMachine({
		id: "scene",
		initial: "loading",
		context: { config: null },
		states: {
			loading: {
				on: { READY: "idle", FAIL: "error" },
			},
			// 观察稳态：背景环绕，无实时资源。
			idle: {
				on: {
					ACQUIRE: {
						target: "preparing",
						actions: machineSetup.assign({
							config: ({ event }) => (event.type === "ACQUIRE" ? event.config : null),
						}),
					},
				},
			},
			// 建实时资源（异步），完成后进入相机飞入动画。
			preparing: {
				invoke: {
					src: "setupResources",
					input: ({ context }) => ({ config: context.config }),
				},
				on: {
					SETUP_DONE: "entering",
					FAIL: "error",
					RELEASE: "leaving",
				},
			},
			// 相机飞入跟随位：动画期间禁用输入，完成后启用并交给控制器跟随。
			entering: {
				entry: "detachInput",
				invoke: {
					src: "cameraTransition",
					input: ({ context }) => ({ direction: "enter" as const, config: context.config }),
				},
				on: {
					ANIM_DONE: "realtime",
					RELEASE: "leaving",
					FAIL: "error",
				},
			},
			// 跟随稳态：控制器驱动相机，鼠标输入启用。
			realtime: {
				entry: ["startFollow", "attachInput"],
				on: { RELEASE: "leaving", FAIL: "error" },
			},
			// 相机飞回观察位（对称动画），完成后拆资源回 idle。
			leaving: {
				entry: ["stopFollow", "detachInput"],
				invoke: {
					src: "cameraTransition",
					input: ({ context }) => ({ direction: "leave" as const, config: context.config }),
				},
				on: {
					ANIM_DONE: "idle",
					FAIL: "error",
				},
				exit: ["teardown", machineSetup.assign({ config: null })],
			},
			error: {
				entry: "teardown",
				on: { RELEASE: "idle", READY: "idle" },
			},
		},
	});
};

export type SceneMachine = ReturnType<typeof createSceneMachine>;
export type SceneMachineActor = ActorRefFrom<SceneMachine>;
