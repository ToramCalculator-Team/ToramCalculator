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
 *   idle --LOAD_CHARACTER--> loadingCharacter(异步建角色内容) --SETUP_DONE--> character(内容稳态)
 *   character --RELEASE_CONTENT--> unloadingCharacter(拆角色内容) --退出--> idle
 *   character --ACQUIRE--> 先拆角色内容再走 preparing(realtime 路径)，内容互斥
 *   任意 --FAIL--> error
 *
 * 内容来源（contentSource）：idle 观察态可承载 "character"（静态装饰模型）或 "realtime"（战斗）两类内容，
 *   两者互斥；character 稳态对外仍报 idle（观察类），realtime 路径对外报 realtime。
 *
 * 见 src/lib/engine/render/SceneRuntimeCore.tsx 的接入点。
 */

import { type ActorRefFrom, assign, fromCallback, setup } from "xstate";
import type { RealtimeSceneConfig } from "./SceneRuntime";

export type SceneContentSource = "none" | "character" | "realtime";

export type SceneMachineContext = {
	/** 当前实时会话配置；进入 entering 时由 ACQUIRE 事件写入，回到 idle 时清空。 */
	config: RealtimeSceneConfig | null;
	/** 当前内容来源；character/realtime 互斥，回到观察空场时为 none。 */
	contentSource: SceneContentSource;
	/** 当前角色内容的 characterId；contentSource==="character" 时有效，否则 null。 */
	characterId: string | null;
};

export type SceneMachineEvent =
	| { type: "READY" }
	| { type: "ACQUIRE"; config: RealtimeSceneConfig }
	| { type: "LOAD_CHARACTER"; characterId: string }
	| { type: "RELEASE_CONTENT" }
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
 * - setupCharacterContent：建角色内容（EntityFactory.createCharacter 加载模型、挂 characterRoot、播 IDLE）。返回 Promise。
 * - teardownCharacterContent：dispose characterRoot 子树、清角色内容句柄。
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
	setupCharacterContent: (characterId: string) => Promise<void>;
	teardownCharacterContent: () => void;
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
			teardownCharacter: () => deps.teardownCharacterContent(),
			// 把内容相关 context 复位为空场观察态。回 idle 的多处转移共用。
			resetContentContext: assign({
				config: null,
				contentSource: () => "none" as const,
				characterId: () => null,
			}),
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
			// 建角色内容：异步（含模型 HTTP 加载）。失败转 error。快速来回切换由 core 内 seq 失配丢弃。
			setupCharacter: fromCallback<SceneMachineEvent, { characterId: string | null }>(
				({ sendBack, input }) => {
					let cancelled = false;
					if (!input.characterId) {
						sendBack({ type: "FAIL" });
						return () => {};
					}
					deps
						.setupCharacterContent(input.characterId)
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
		context: { config: null, contentSource: "none", characterId: null },
		states: {
			loading: {
				on: { READY: "idle", FAIL: "error" },
			},
			// 观察稳态：背景环绕，无实时资源。可接受 ACQUIRE(realtime) 或 LOAD_CHARACTER(角色内容)。
			idle: {
				on: {
					ACQUIRE: {
						target: "preparing",
						actions: machineSetup.assign({
							config: ({ event }) => (event.type === "ACQUIRE" ? event.config : null),
						}),
					},
					LOAD_CHARACTER: {
						target: "loadingCharacter",
						actions: machineSetup.assign({
							characterId: ({ event }) => (event.type === "LOAD_CHARACTER" ? event.characterId : null),
						}),
					},
				},
			},
			// 建角色内容（异步），完成后进入 character 稳态。
			loadingCharacter: {
				invoke: {
					src: "setupCharacter",
					input: ({ context }) => ({ characterId: context.characterId }),
				},
				on: {
					SETUP_DONE: {
						target: "character",
						actions: machineSetup.assign({ contentSource: () => "character" as const }),
					},
					FAIL: "error",
					RELEASE_CONTENT: "unloadingCharacter",
				},
			},
			// 角色内容稳态：静态装饰模型，相机可被注意力机摆位。对外报 idle（观察类）。
			character: {
				on: {
					RELEASE_CONTENT: "unloadingCharacter",
					// 切到 realtime：先拆角色内容，再走 preparing（内容互斥）。
					ACQUIRE: {
						target: "preparing",
						actions: [
							"teardownCharacter",
							machineSetup.assign({
								config: ({ event }) => (event.type === "ACQUIRE" ? event.config : null),
								contentSource: () => "none" as const,
								characterId: () => null,
							}),
						],
					},
					FAIL: "error",
				},
			},
			// 拆角色内容，回 idle。
			unloadingCharacter: {
				entry: "teardownCharacter",
				always: {
					target: "idle",
					actions: machineSetup.assign({
						contentSource: () => "none" as const,
						characterId: () => null,
					}),
				},
			},
			// 建实时资源（异步），完成后进入相机飞入动画。
			preparing: {
				invoke: {
					src: "setupResources",
					input: ({ context }) => ({ config: context.config }),
				},
				on: {
					SETUP_DONE: {
						target: "entering",
						actions: machineSetup.assign({ contentSource: () => "realtime" as const }),
					},
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
				exit: [
					"teardown",
					machineSetup.assign({ config: null, contentSource: () => "none" as const }),
				],
			},
			error: {
				entry: ["teardown", "teardownCharacter"],
				on: {
					RELEASE: { target: "idle", actions: "resetContentContext" },
					READY: { target: "idle", actions: "resetContentContext" },
				},
			},
		},
	});
};

export type SceneMachine = ReturnType<typeof createSceneMachine>;
export type SceneMachineActor = ActorRefFrom<SceneMachine>;
