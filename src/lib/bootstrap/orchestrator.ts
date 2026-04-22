import type { BootstrapModule, BootstrapRuntimeCtx, BootstrapState, ModuleStatus } from "./types";

/**
 * 纯启动编排器（不依赖 Solid）：
 * - 负责按依赖拓扑启动模块
 * - 负责把失败传播成 skipped（仅阻断 required 依赖链）
 * - 提供 waitFor/getState 给 UI 与非 UI 场景复用
 */
type StateListener = (state: BootstrapState) => void;

type Waiter = {
	resolve: () => void;
	reject: (error: Error) => void;
};

const now = () => globalThis.performance?.now?.() ?? Date.now();

const toError = (error: unknown, fallbackMessage: string): Error => {
	if (error instanceof Error) {
		return error;
	}
	return new Error(fallbackMessage);
};

const createTimeoutPromise = (moduleName: string, timeout: number): Promise<never> =>
	new Promise((_, reject) => {
		setTimeout(() => {
			reject(new Error(`Bootstrap module "${moduleName}" timed out after ${timeout}ms`));
		}, timeout);
	});

const cloneState = (state: BootstrapState): BootstrapState => ({
	status: { ...state.status },
	errors: { ...state.errors },
	durations: { ...state.durations },
});

export class BootstrapOrchestrator {
	private readonly modules: BootstrapModule[];

	private readonly moduleMap = new Map<string, BootstrapModule>();

	private readonly dependents = new Map<string, string[]>();

	private readonly values = new Map<string, unknown>();

	private readonly listeners = new Set<StateListener>();

	private readonly waiters = new Map<string, Set<Waiter>>();

	private readonly startedAt = new Map<string, number>();

	private readonly state: BootstrapState;

	private started = false;

	constructor(modules: BootstrapModule[]) {
		this.modules = [...modules];

		for (const module of modules) {
			if (this.moduleMap.has(module.name)) {
				throw new Error(`Duplicate bootstrap module "${module.name}"`);
			}
			this.moduleMap.set(module.name, module);
			this.dependents.set(module.name, []);
		}

		for (const module of modules) {
			for (const dep of module.deps) {
				if (!this.moduleMap.has(dep)) {
					throw new Error(`Bootstrap module "${module.name}" depends on unknown module "${dep}"`);
				}
				this.dependents.get(dep)?.push(module.name);
			}
		}

		this.validateAcyclic();

		this.state = {
			status: Object.fromEntries(modules.map((module) => [module.name, "idle"])) as Record<string, ModuleStatus>,
			errors: Object.fromEntries(modules.map((module) => [module.name, undefined])) as Record<
				string,
				Error | undefined
			>,
			durations: Object.fromEntries(modules.map((module) => [module.name, 0])),
		};
	}

	start() {
		if (this.started) {
			return;
		}

		this.started = true;
		this.scheduleRunnableModules();
	}

	subscribe(listener: StateListener) {
		this.listeners.add(listener);
		listener(this.getState());

		return () => {
			this.listeners.delete(listener);
		};
	}

	getState(): BootstrapState {
		return cloneState(this.state);
	}

	getValue<T>(name: string): T | undefined {
		this.assertModuleExists(name);
		return this.values.get(name) as T | undefined;
	}

	waitFor(name: string): Promise<void> {
		this.assertModuleExists(name);

		const status = this.state.status[name];
		if (status === "ready") {
			return Promise.resolve();
		}
		if (status === "error") {
			return Promise.reject(this.state.errors[name] ?? new Error(`Bootstrap module "${name}" failed`));
		}
		if (status === "skipped") {
			return Promise.reject(
				this.state.errors[name] ?? new Error(`Bootstrap module "${name}" was skipped because a dependency failed`),
			);
		}

		return new Promise<void>((resolve, reject) => {
			const waiters = this.waiters.get(name) ?? new Set<Waiter>();
			waiters.add({ resolve, reject });
			this.waiters.set(name, waiters);
		});
	}

	private validateAcyclic() {
		const visiting = new Set<string>();
		const visited = new Set<string>();

		const walk = (name: string, trail: string[]) => {
			if (visiting.has(name)) {
				throw new Error(`Bootstrap dependency cycle detected: ${[...trail, name].join(" -> ")}`);
			}
			if (visited.has(name)) {
				return;
			}

			visiting.add(name);
			const module = this.moduleMap.get(name);
			if (!module) {
				throw new Error(`Bootstrap module "${name}" is missing`);
			}

			for (const dep of module.deps) {
				walk(dep, [...trail, name]);
			}

			visiting.delete(name);
			visited.add(name);
		};

		for (const module of this.modules) {
			walk(module.name, []);
		}
	}

	private scheduleRunnableModules() {
		// 批次调度：每次状态变化后重新扫描，确保“依赖刚满足”的模块立即进入下一批启动。
		for (const module of this.modules) {
			if (this.state.status[module.name] !== "idle") {
				continue;
			}

			if (this.hasBlockingDependencyFailure(module)) {
				this.markSkipped(
					module.name,
					new Error(`Bootstrap module "${module.name}" was skipped because a required dependency failed`),
				);
				continue;
			}

			if (!this.canRun(module)) {
				continue;
			}

			void this.runModule(module);
		}
	}

	private hasBlockingDependencyFailure(module: BootstrapModule) {
		return module.deps.some((dep) => {
			const depStatus = this.state.status[dep];
			const depModule = this.moduleMap.get(dep);
			return depStatus === "skipped" || (depStatus === "error" && depModule && !depModule.optional);
		});
	}

	private canRun(module: BootstrapModule) {
		return module.deps.every((dep) => {
			const depStatus = this.state.status[dep];
			const depModule = this.moduleMap.get(dep);
			return depStatus === "ready" || (depStatus === "error" && depModule?.optional);
		});
	}

	private async runModule(module: BootstrapModule) {
		this.startedAt.set(module.name, now());
		this.state.status[module.name] = "loading";
		this.state.errors[module.name] = undefined;
		this.emit();

		try {
			const runtimeCtx: BootstrapRuntimeCtx = {
				get: (name) => this.getValue(name),
				log: (msg) => {
					// eslint-disable-next-line no-console
					console.info(`[Bootstrap:${module.name}] ${msg}`);
				},
			};

			const task = module.init(runtimeCtx);
			// 统一在 orchestrator 层做超时兜底，模块内部无需重复实现 watchdog。
			const value = module.timeout ? await Promise.race([task, createTimeoutPromise(module.name, module.timeout)]) : await task;

			this.values.set(module.name, value);
			this.state.status[module.name] = "ready";
			this.state.durations[module.name] = Math.round(now() - (this.startedAt.get(module.name) ?? now()));
			this.resolveWaiters(module.name);
		} catch (error) {
			const err = toError(error, `Bootstrap module "${module.name}" failed`);
			this.state.status[module.name] = "error";
			this.state.errors[module.name] = err;
			this.state.durations[module.name] = Math.round(now() - (this.startedAt.get(module.name) ?? now()));
			this.rejectWaiters(module.name, err);

			if (!module.optional) {
				for (const dependent of this.dependents.get(module.name) ?? []) {
					this.markSkipped(
						dependent,
						new Error(`Bootstrap module "${dependent}" was skipped because "${module.name}" failed: ${err.message}`),
					);
				}
			}
		}

		this.emit();
		this.scheduleRunnableModules();
	}

	private markSkipped(name: string, error: Error) {
		const currentStatus = this.state.status[name];
		if (currentStatus === "ready" || currentStatus === "error" || currentStatus === "skipped") {
			return;
		}

		this.state.status[name] = "skipped";
		this.state.errors[name] = error;
		this.rejectWaiters(name, error);
		this.emit();

		for (const dependent of this.dependents.get(name) ?? []) {
			this.markSkipped(
				dependent,
				new Error(`Bootstrap module "${dependent}" was skipped because "${name}" did not become ready`),
			);
		}
	}

	private resolveWaiters(name: string) {
		const waiters = this.waiters.get(name);
		if (!waiters) {
			return;
		}

		for (const waiter of waiters) {
			waiter.resolve();
		}
		this.waiters.delete(name);
	}

	private rejectWaiters(name: string, error: Error) {
		const waiters = this.waiters.get(name);
		if (!waiters) {
			return;
		}

		for (const waiter of waiters) {
			waiter.reject(error);
		}
		this.waiters.delete(name);
	}

	private emit() {
		const snapshot = this.getState();
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}

	private assertModuleExists(name: string) {
		if (!this.moduleMap.has(name)) {
			throw new Error(`Unknown bootstrap module "${name}"`);
		}
	}
}
