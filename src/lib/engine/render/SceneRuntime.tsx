/**
 * 应用级渲染运行时入口。
 *
 * 职责：提供唯一的 3D 场景控制端口，并把重型 Babylon 实现延后到首屏完成后再加载。
 * 设计目标：业务页面只能申请 scoped session，不能直接持有 Babylon scene/engine/canvas。
 * 见 docs/decisions/0009-persistent-render-runtime.md
 */

import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	lazy,
	onCleanup,
	onMount,
	type ParentProps,
	Show,
	Suspense,
	useContext,
} from "solid-js";
import type { SimulationEngine } from "../core/thread/SimulationEngine";

export type SceneRuntimeMode = "booting" | "loading" | "idle" | "realtime" | "suspended" | "error";

export type ScreenPoint = {
	x: number;
	y: number;
	visible: boolean;
};

export type RealtimeSceneConfig = {
	engine: SimulationEngine;
	followEntityId?: string;
	activeControllerId?: string | null;
	controllerIds?: string[];
	/** 主控成员初始位置（由队形纯函数预先算出），用于相机创建时即对准目标，无需等引擎首帧 snapshot。 */
	initialCameraTarget?: { x: number; y: number; z: number };
};

export type RealtimeSceneSession = {
	id: string;
	setFollowTarget: (entityId: string | null) => void;
	setActiveController: (controllerId: string | null) => void;
	setCameraInputEnabled: (enabled: boolean) => void;
	release: () => void;
};

/** 相机姿态：环绕相机的 alpha/beta/radius 与对准点。供意图层场景投影对焦使用。 */
export type CameraPose = {
	alpha: number;
	beta: number;
	radius: number;
	target: { x: number; y: number; z: number };
};

export type SceneRuntimeContextValue = {
	ready: () => boolean;
	mode: () => SceneRuntimeMode;
	acquireRealtimeSession: (config: RealtimeSceneConfig) => Promise<RealtimeSceneSession>;
	projectWorldToScreen: (position: { x: number; y: number; z: number }) => ScreenPoint | null;
	// 意图层场景投影：把相机补间到姿态 / 复位到观察位，完成调用 onDone，返回取消函数。
	// 见 docs/decisions/0012-intent-first-visual-control.md
	focusCamera: (pose: CameraPose, onDone: () => void) => () => void;
	resetCamera: (onDone: () => void) => () => void;
};

export type SceneRuntimeCoreApi = SceneRuntimeContextValue & {
	dispose: () => void;
};

const SceneRuntimeCore = lazy(async () => {
	const module = await import("./SceneRuntimeCore");
	return { default: module.SceneRuntimeCore };
});

const SceneRuntimeContext = createContext<SceneRuntimeContextValue>();
// 内部宿主通道只服务 SceneCanvas 挂载 Babylon 实现；业务页面只能使用上面的 SceneRuntimeContext。
// 设计目的：把 canvas/core 的生命周期留在根布局，避免子页面绕过 scoped session 直接操作渲染层。
const SceneRuntimeHostContext = createContext<{
	enabled: () => boolean;
	shouldMountCore: () => boolean;
	onCoreReady: (api: SceneRuntimeCoreApi) => void;
	onCoreDisposed: (api: SceneRuntimeCoreApi) => void;
	onModeChange: (mode: SceneRuntimeMode) => void;
}>();

const createDisabledRealtimeSession = (
	id: string,
	releaseCallback: (sessionId: string) => void,
): RealtimeSceneSession => ({
	id,
	setFollowTarget: () => {},
	setActiveController: () => {},
	setCameraInputEnabled: () => {},
	release: () => releaseCallback(id),
});

export function SceneRuntimeProvider(props: ParentProps<{ enabled: boolean }>) {
	const [mode, setMode] = createSignal<SceneRuntimeMode>("booting");
	const [shouldMountCore, setShouldMountCore] = createSignal(false);
	let firstScreenReady = false;
	let coreApi: SceneRuntimeCoreApi | null = null;
	let disabledSessionId: string | null = null;
	const waiters: Array<{
		resolve: (api: SceneRuntimeCoreApi) => void;
		reject: (reason?: unknown) => void;
	}> = [];

	const resolveWaiters = (api: SceneRuntimeCoreApi) => {
		while (waiters.length > 0) {
			waiters.shift()?.resolve(api);
		}
	};

	const rejectWaiters = (reason: unknown) => {
		while (waiters.length > 0) {
			waiters.shift()?.reject(reason);
		}
	};

	const ensureCore = async (): Promise<SceneRuntimeCoreApi> => {
		if (!props.enabled) {
			throw new Error("3D scene runtime is disabled");
		}
		if (coreApi) return coreApi;
		setMode("loading");
		setShouldMountCore(true);
		return await new Promise<SceneRuntimeCoreApi>((resolve, reject) => {
			waiters.push({ resolve, reject });
		});
	};

	const releaseDisabledSession = (sessionId: string) => {
		if (disabledSessionId !== sessionId) return;
		disabledSessionId = null;
		setMode(firstScreenReady ? "idle" : "booting");
	};

	const handleFirstScreenReady = () => {
		firstScreenReady = true;
		if (props.enabled) {
			setMode("loading");
			setShouldMountCore(true);
		} else {
			setMode("idle");
		}
	};

	onMount(() => {
		window.addEventListener("app:first-screen-ready", handleFirstScreenReady);
	});

	createEffect(() => {
		if (!props.enabled) {
			setShouldMountCore(false);
			coreApi = null;
			disabledSessionId = null;
			rejectWaiters(new Error("3D scene runtime was disabled before it became ready"));
			setMode(firstScreenReady ? "idle" : "booting");
			return;
		}
		if (firstScreenReady) {
			setMode("loading");
			setShouldMountCore(true);
		}
	});

	onCleanup(() => {
		window.removeEventListener("app:first-screen-ready", handleFirstScreenReady);
		coreApi?.dispose();
		coreApi = null;
		rejectWaiters(new Error("SceneRuntimeProvider was disposed before the core became ready"));
	});

	const value: SceneRuntimeContextValue = {
		ready: () => coreApi?.ready() ?? false,
		mode,
		acquireRealtimeSession: async (config) => {
			if (!props.enabled) {
				const sessionId = `disabled-scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
				disabledSessionId = sessionId;
				setMode("realtime");
				return createDisabledRealtimeSession(sessionId, releaseDisabledSession);
			}
			const api = await ensureCore();
			return api.acquireRealtimeSession(config);
		},
		projectWorldToScreen: (position) => coreApi?.projectWorldToScreen(position) ?? null,
		// 核心未就绪 / 3D 禁用时：no-op + 立即回执（建议性回执兜底，仿 createDisabledRealtimeSession）。
		focusCamera: (pose, onDone) => {
			if (coreApi) return coreApi.focusCamera(pose, onDone);
			onDone();
			return () => {};
		},
		resetCamera: (onDone) => {
			if (coreApi) return coreApi.resetCamera(onDone);
			onDone();
			return () => {};
		},
	};

	return (
		<SceneRuntimeHostContext.Provider
			value={{
				enabled: () => props.enabled,
				shouldMountCore,
				onCoreReady: (api) => {
					coreApi = api;
					resolveWaiters(api);
				},
				onCoreDisposed: (api) => {
					if (coreApi === api) {
						coreApi = null;
					}
				},
				onModeChange: setMode,
			}}
		>
			<SceneRuntimeContext.Provider value={value}>{props.children}</SceneRuntimeContext.Provider>
		</SceneRuntimeHostContext.Provider>
	);
}

/** 挂载应用级唯一 canvas；必须放在 SceneRuntimeProvider 内，且通常作为 UI 下方的背景层。 */
export function SceneCanvas(): JSX.Element {
	const host = useContext(SceneRuntimeHostContext);
	if (!host) {
		throw new Error("SceneCanvas must be used within SceneRuntimeProvider");
	}

	return (
		<Show when={host.shouldMountCore() && host.enabled()}>
			<Suspense fallback={null}>
				<SceneRuntimeCore
					onReady={host.onCoreReady}
					onDisposed={host.onCoreDisposed}
					onModeChange={host.onModeChange}
				/>
			</Suspense>
		</Show>
	);
}

export function useSceneRuntime(): SceneRuntimeContextValue {
	const ctx = useContext(SceneRuntimeContext);
	if (!ctx) {
		throw new Error("useSceneRuntime must be used within SceneRuntimeProvider");
	}
	return ctx;
}
