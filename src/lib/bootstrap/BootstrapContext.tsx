import { type Accessor, createContext, onCleanup, onMount, type ParentProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { ensureBootstrapStarted, getBootstrapState, subscribeBootstrap, waitFor } from "./context-standalone";
import type { BootstrapState, ModuleStatus } from "./types";

// 组件层读模型：
// Provider 只负责把 standalone 状态桥接成响应式 accessor，不直接承载编排逻辑。
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
		ensureBootstrapStarted();
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
