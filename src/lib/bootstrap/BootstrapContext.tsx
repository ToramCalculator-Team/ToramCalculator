import { type Accessor, createContext, onCleanup, onMount, type ParentProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { getBootstrapState, subscribeBootstrap, waitFor } from "./context-standalone";
import type { BootstrapState, ModuleStatus } from "./types";

// 组件层读模型（UI 响应式视图）：
// Provider 不触发启动——启动由 entry-client 的 startBootstrap 显式负责。
// 这里只把 standalone 的状态桥接成响应式 accessor 供组件订阅，不承载编排或触发逻辑。
type BootstrapContextValue = {
	status: (name: string) => Accessor<ModuleStatus>;
	ready: (name: string) => Accessor<boolean>;
	allReady: (...names: string[]) => Accessor<boolean>;
	error: (name: string) => Accessor<Error | undefined>;
	waitFor: (name: string) => Promise<void>;
};

const BootstrapContext = createContext<BootstrapContextValue>();

export function BootstrapProvider(props: ParentProps) {
	const [state, setState] = createStore<BootstrapState>(getBootstrapState());
	let unsubscribe: () => void = () => {};

	onMount(() => {
		// 不触发启动；仅订阅 standalone 状态。启动触发点唯一，在 entry-client。
		unsubscribe = subscribeBootstrap((nextState) => {
			setState(nextState);
		});
	});

	onCleanup(() => {
		unsubscribe();
	});

	const value: BootstrapContextValue = {
		status: (name) => () => state.status[name] ?? "idle",
		ready: (name) => () => (state.status[name] ?? "idle") === "ready",
		allReady: (...names) => () => names.every((name) => (state.status[name] ?? "idle") === "ready"),
		error: (name) => () => state.errors[name],
		waitFor,
	};

	return <BootstrapContext.Provider value={value}>{props.children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
	const ctx = useContext(BootstrapContext);
	if (!ctx) {
		throw new Error("useBootstrap must be used within a BootstrapProvider");
	}
	return ctx;
}

export function useModuleReady(name: string): Accessor<boolean> {
	return useBootstrap().ready(name);
}
