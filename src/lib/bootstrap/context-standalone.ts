import { bootstrapModules } from "./modules";
import { BootstrapOrchestrator } from "./orchestrator";
import type { BootstrapState, ModuleStatus } from "./types";

// 组件树外的单例入口：
// liveQuery / repository 等非组件代码通过这里 waitFor，保证与 Provider 共享同一个启动状态机。
let runtime: BootstrapOrchestrator | undefined;
let loggingInstalled = false;
const lastLoggedStatus = new Map<string, ModuleStatus>();

const getRuntime = () => {
	if (!runtime) {
		runtime = new BootstrapOrchestrator(bootstrapModules);
	}

	if (!loggingInstalled) {
		loggingInstalled = true;
		runtime.subscribe((state) => {
			for (const [name, status] of Object.entries(state.status)) {
				const previous = lastLoggedStatus.get(name);
				if (previous === status) {
					continue;
				}

				lastLoggedStatus.set(name, status);

				if (status === "ready") {
					// eslint-disable-next-line no-console
					console.info(`[Bootstrap] ${name} ready (${state.durations[name] ?? 0}ms)`);
				} else if (status === "error") {
					// eslint-disable-next-line no-console
					console.error(`[Bootstrap] ${name} failed`, state.errors[name]);
				} else if (status === "skipped") {
					// eslint-disable-next-line no-console
					console.warn(`[Bootstrap] ${name} skipped`, state.errors[name]);
				}
			}
		});
	}

	return runtime;
};

export const ensureBootstrapStarted = () => {
	const orchestrator = getRuntime();
	if (typeof window !== "undefined") {
		// SSR 不启动副作用；仅在浏览器端真正触发模块 init。
		orchestrator.start();
	}
	return orchestrator;
};

export const subscribeBootstrap = (listener: (state: BootstrapState) => void) => getRuntime().subscribe(listener);

export const getBootstrapState = () => getRuntime().getState();

export const getStatus = (name: string): ModuleStatus => getRuntime().getState().status[name] ?? "idle";

export const waitFor = (name: string) => ensureBootstrapStarted().waitFor(name);
