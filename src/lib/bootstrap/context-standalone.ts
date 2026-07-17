import { createLogger } from "../Logger";
import { bootstrapModules } from "./modules";
import { BootstrapOrchestrator } from "./orchestrator";
import type { BootstrapState, ModuleStatus } from "./types";

const logger = createLogger("Bootstrap");
logger.setLevel(1);

// 组件树外的单例入口（应用级唯一真相源）：
// - 触发：startBootstrap() 在入口（entry-client）显式调用一次，是唯一的启动触发点。
// - 消费：liveQuery / repository 等非组件代码通过 waitFor 等待模块就绪；
//   组件内则经 BootstrapProvider 读响应式视图。两者共享这同一个启动状态机。
// 设计约束：getRuntime 只构造（无副作用），唯有 startBootstrap 才真正跑模块；waitFor 不再懒触发启动。
let runtime: BootstrapOrchestrator | undefined;
let started = false;
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
					logger.info(`[Bootstrap] ${name} ready (${state.durations[name] ?? 0}ms)`);
				} else if (status === "error") {
					logger.error(`[Bootstrap] ${name} failed`, state.errors[name]);
				} else if (status === "skipped") {
					logger.warn(`[Bootstrap] ${name} skipped`, state.errors[name]);
				}
			}
		});
	}

	return runtime;
};

/**
 * 启动触发点（唯一）：在浏览器端真正运行 bootstrap 模块。幂等——重复调用无副作用。
 * 由 entry-client 在挂载应用前显式调用一次；不应藏在组件 onMount 里。
 */
export const startBootstrap = () => {
	const orchestrator = getRuntime();
	if (typeof window !== "undefined") {
		// SSR 不启动副作用；仅在浏览器端真正触发模块 init。
		orchestrator.start();
		started = true;
	}
	return orchestrator;
};

/** 只读查询：bootstrap 是否已被触发启动。无副作用，绝不构造/启动编排器。 */
export const isBootstrapStarted = (): boolean => started;

export const subscribeBootstrap = (listener: (state: BootstrapState) => void) => getRuntime().subscribe(listener);

export const getBootstrapState = () => getRuntime().getState();

export const getStatus = (name: string): ModuleStatus => getRuntime().getState().status[name] ?? "idle";

/** 读取已完成 bootstrap 模块的类型化产物；只读且不触发模块启动。 */
export const getBootstrapValue = <T>(name: string): T | undefined => getRuntime().getValue<T>(name);

// waitFor 不再懒触发启动（路线 A）：唯一触发点是 startBootstrap。
// 仅挂等待——若 startBootstrap 未先行（编程错误），等待将保持 pending 直到启动。
export const waitFor = (name: string) => getRuntime().waitFor(name);
