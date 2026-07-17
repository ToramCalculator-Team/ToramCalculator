import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { createCharacterSessionRuntime } from "~/features/character/session/characterSessionMachine";
import { createSimulatorSessionRuntime } from "~/features/simulator/simulatorSessionMachine";
import type { PoolHealthMetrics } from "~/lib/WorkerPool/WorkerPool";
import { createInterfaceStateMachine } from "~/machines/interfaceStateMachine";
import type { EngineMember } from "../engineScenarioSchema";
import type { EngineLifecycleSnapshot } from "../GameEngineSM";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import { type SimulationTaskResult, SimulationTaskSchema } from "../simulationTask";
import type { EngineScenarioData, RuntimeConfig } from "../types";
import { EngineService } from "./EngineService";
import type { EngineWorkerClientEventMap } from "./EngineWorkerClient";
import { EngineExecutionFailure, type EngineRPC, type EngineRPCResult, type EngineTaskPriority } from "./protocol";

class FakeRealtimeEngine {
	disposeCount = 0;
	ready = true;
	disposeError: Error | null = null;
	disposeGate: Promise<void> | null = null;
	private listeners = new Map<keyof EngineWorkerClientEventMap, Set<(payload: never) => void>>();

	constructor(readonly id: string) {}
	private readonly lifecycleSnapshot: EngineLifecycleSnapshot = {
		state: "idle",
		confirmedState: "idle",
		pending: null,
	};

	async whenReady(): Promise<void> {}
	isReady(): boolean {
		return this.ready;
	}
	getLifecycleSnapshot(): EngineLifecycleSnapshot {
		return this.lifecycleSnapshot;
	}
	subscribeLifecycle(listener: (snapshot: EngineLifecycleSnapshot) => void): () => void {
		listener(this.lifecycleSnapshot);
		return () => {};
	}
	async loadScenario(_data: EngineScenarioData): Promise<void> {}
	async setRuntimeConfig(_config: RuntimeConfig): Promise<void> {}
	async start(): Promise<void> {}
	async pause(): Promise<void> {}
	async resume(): Promise<void> {}
	async stop(): Promise<void> {}
	async reset(): Promise<void> {}
	async step(): Promise<void> {}
	async sendIntent(_intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		return { success: true };
	}
	async bindMemberController(memberId: string): Promise<{ controllerId: string; boundMemberId: string }> {
		return { controllerId: `controller:${memberId}`, boundMemberId: memberId };
	}
	async unbindMemberController(_controllerId: string): Promise<void> {}
	async unbindAllMemberControllers(): Promise<void> {}
	async selectMemberTarget(_controllerId: string, _targetMemberId: string): Promise<void> {}
	async castMemberSkill(_controllerId: string, _skillId: string): Promise<void> {}
	async getMembers() {
		return [];
	}
	async getMemberSkillList(_memberId: string) {
		return [];
	}
	async getRenderSnapshot(): Promise<never> {
		throw new Error("unused in handle lifecycle test");
	}
	async patchMemberConfig(_memberId: string, _data: EngineMember): Promise<void> {}
	async fastForward() {
		return { ticksRun: 0, elapsedMs: 0, reachedLimit: false };
	}
	async startRunOutput(_runId: string): Promise<void> {}
	async finishRunOutput(): Promise<never> {
		throw new Error("unused in handle lifecycle test");
	}
	async cancelRunOutput(_runId: string): Promise<void> {}
	async acknowledgeRunOutput(_runId: string): Promise<void> {}
	async setRealtimeSnapshotHz(_snapshotHz: number): Promise<void> {}
	async unloadScenario(): Promise<void> {}
	on<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener: (payload: EngineWorkerClientEventMap[K]) => void,
	): () => void {
		const listeners = this.listeners.get(event) ?? new Set();
		// 测试替身按事件键保存同构 listener；emit() 会用相同键和对应 payload 取回。
		listeners.add(listener as (payload: never) => void);
		this.listeners.set(event, listeners);
		return () => listeners.delete(listener as (payload: never) => void);
	}
	off<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener?: (payload: EngineWorkerClientEventMap[K]) => void,
	): void {
		const listeners = this.listeners.get(event);
		if (!listeners) return;
		if (!listener) {
			listeners.clear();
			return;
		}
		// 测试替身与 on() 使用同一事件键和 listener 约束，故可按同一内部函数类型删除。
		listeners.delete(listener as (payload: never) => void);
	}
	emit<K extends keyof EngineWorkerClientEventMap>(event: K, payload: EngineWorkerClientEventMap[K]): void {
		for (const listener of this.listeners.get(event) ?? []) listener(payload as never);
	}
	async dispose(): Promise<void> {
		this.disposeCount++;
		if (this.disposeGate) await this.disposeGate;
		if (this.disposeError) throw this.disposeError;
	}
}

class FakeSimulationWorkerPool {
	startCount = 0;
	startError: Error | null = null;
	shutdownCount = 0;
	simulationTaskHandler:
		| ((
				task: Extract<EngineRPC, { type: "execute_simulation_task" }>["task"],
		  ) => EngineRPCResult<"execute_simulation_task"> | undefined)
		| null = null;
	start(): void {
		this.startCount++;
		if (this.startError) throw this.startError;
	}

	async executeEngineRPC<TRequest extends EngineRPC>(
		rpc: TRequest,
		_priority: EngineTaskPriority,
	): Promise<EngineRPCResult<TRequest["type"]>> {
		if (rpc.type === "execute_simulation_task" && this.simulationTaskHandler) {
			const result = this.simulationTaskHandler(rpc.task);
			if (result) {
				// TRequest 的泛型关联不会随运行时判别自动收窄；handler 已固定为同一 RPC 的成对结果。
				return result as EngineRPCResult<TRequest["type"]>;
			}
		}
		throw new Error("unused in handle lifecycle test");
	}
	getStatus(): PoolHealthMetrics {
		return { activeWorkers: 0, totalWorkers: 0, queueLength: 0, pendingTasks: 0, workerMetrics: [] };
	}
	async shutdown(): Promise<void> {
		this.shutdownCount++;
	}
}

const createSimulationTask = (runId: string) =>
	SimulationTaskSchema.parse({
		runId,
		scenarioData: {
			scenario: { randomSeed: 1, logicHz: 60, primaryMemberId: "member-1", campA: [], campB: [] },
		},
		runtimeConfig: {
			driveMode: "unclocked",
			acceptExternalIntents: false,
			timeScale: 1,
			maxTickSkip: 1,
		},
		recordingPolicy: { tickStateHistory: "none" },
		stopPolicy: { kind: "untilMemberFlowEnds", memberId: "member-1" },
		budget: { maxTicks: 10 },
	});

const createSimulationTaskResult = (runId: string): SimulationTaskResult => ({
	output: {
		runId,
		durationMs: 0,
		stateHistory: null,
		inputs: [],
		skillReleases: [],
		damage: [],
	},
	stats: { ticksRun: 0, elapsedMs: 0, reachedLimit: false },
});

function createTargetService() {
	const engines: FakeRealtimeEngine[] = [];
	const pool = new FakeSimulationWorkerPool();
	const createSimulationWorkerPool = vi.fn(() => pool);
	let handleSequence = 0;
	const service = new EngineService({
		createEngineWorkerClient: (id) => {
			const engine = new FakeRealtimeEngine(id);
			engines.push(engine);
			return engine;
		},
		createSimulationWorkerPool,
		createHandleId: () => `handle-${++handleSequence}`,
	});
	return { service, engines, pool, createSimulationWorkerPool };
}

describe("EngineService 通用实时引擎 Handle", () => {
	it("未显式 start 时拒绝资源申请", async () => {
		const { service } = createTargetService();
		await expect(service.openRealtimeEngine()).rejects.toThrow("必须先由 bootstrap engine 模块调用 start()");
	});

	it("两个 Session 可并行取得独立 Handle，关闭互不影响", async () => {
		const { service, engines, pool, createSimulationWorkerPool } = createTargetService();
		service.start();
		service.start();
		expect(createSimulationWorkerPool).toHaveBeenCalledOnce();
		expect(pool.startCount).toBe(1);

		const [simulatorHandle, characterHandle] = await Promise.all([
			service.openRealtimeEngine(),
			service.openRealtimeEngine(),
		]);

		expect(simulatorHandle.id).toBe("handle-1");
		expect(characterHandle.id).toBe("handle-2");
		expect(engines.map((engine) => engine.id)).toEqual(["realtime:handle-1", "realtime:handle-2"]);
		expect(service.getHealth().realtimeHandleCount).toBe(2);
		expect("dispose" in simulatorHandle).toBe(false);

		await simulatorHandle.close();
		await simulatorHandle.close();
		expect(engines[0].disposeCount).toBe(1);
		expect(engines[1].disposeCount).toBe(0);
		expect(service.getHealth().realtimeHandleCount).toBe(1);
		expect(characterHandle.isReady()).toBe(true);

		await service.shutdown();
		expect(engines[1].disposeCount).toBe(1);
		expect(pool.shutdownCount).toBe(1);
		expect(characterHandle.isClosed()).toBe(true);
		expect(() => characterHandle.isReady()).toThrow("RealtimeEngineHandle 已关闭或正在关闭");
		await characterHandle.close();
		expect(engines[1].disposeCount).toBe(1);
	});

	it("池启动失败时不提交 EngineService 生命周期或半成品资源", () => {
		const { service, pool } = createTargetService();
		pool.startError = new Error("pool start failed");

		expect(() => service.start()).toThrow("pool start failed");
		expect(pool.startCount).toBe(1);
		expect(service.getHealth()).toEqual({
			started: false,
			realtimeHandleCount: 0,
			simulationWorkerPool: null,
		});
	});

	it("运行故障由 Handle 投影，关闭与并发 shutdown 仍只销毁一次", async () => {
		const { service, engines, pool } = createTargetService();
		service.start();
		const handle = await service.openRealtimeEngine();
		const failureListener = vi.fn();
		handle.subscribeRuntimeFailure(failureListener);

		engines[0].emit("runtime_failure", { engineId: engines[0].id, reason: "worker crashed" });
		expect(failureListener).toHaveBeenCalledWith("worker crashed");

		const firstShutdown = service.shutdown();
		const secondShutdown = service.shutdown();
		expect(secondShutdown).toBe(firstShutdown);
		await Promise.all([firstShutdown, secondShutdown]);
		expect(engines[0].disposeCount).toBe(1);
		expect(pool.shutdownCount).toBe(1);
		expect(handle.isClosed()).toBe(true);
	});

	it("并发 close 共享同一 Promise，物理关闭失败保持可见且允许重试", async () => {
		const { service, engines } = createTargetService();
		service.start();
		const handle = await service.openRealtimeEngine();
		let resolveDispose = () => {};
		engines[0].disposeGate = new Promise<void>((resolve) => {
			resolveDispose = resolve;
		});

		const firstClose = handle.close();
		const secondClose = handle.close();
		expect(secondClose).toBe(firstClose);
		expect(() => handle.isReady()).toThrow("正在关闭");
		expect(() => handle.getLifecycleSnapshot()).toThrow("正在关闭");
		expect(() => handle.subscribeLifecycle(() => {})).toThrow("正在关闭");
		resolveDispose();
		await firstClose;
		expect(engines[0].disposeCount).toBe(1);
		expect(handle.isClosed()).toBe(true);
		expect(() => handle.getLifecycleSnapshot()).toThrow("已关闭");

		await service.shutdown();
	});

	it("单个 dispose 失败不截断其他资源清理，并可由后续 shutdown 重试", async () => {
		const { service, engines, pool } = createTargetService();
		service.start();
		const [firstHandle, secondHandle] = await Promise.all([service.openRealtimeEngine(), service.openRealtimeEngine()]);
		engines[0].disposeError = new Error("dispose failed");

		await expect(service.shutdown()).rejects.toThrow("dispose failed");
		expect(firstHandle.isClosed()).toBe(false);
		expect(secondHandle.isClosed()).toBe(true);
		expect(engines.map((engine) => engine.disposeCount)).toEqual([1, 1]);
		expect(pool.shutdownCount).toBe(1);
		expect(service.getHealth()).toEqual({
			started: false,
			realtimeHandleCount: 1,
			simulationWorkerPool: null,
		});

		engines[0].disposeError = null;
		await service.shutdown();
		expect(firstHandle.isClosed()).toBe(true);
		expect(engines[0].disposeCount).toBe(2);
		expect(pool.shutdownCount).toBe(1);
		expect(service.getHealth().realtimeHandleCount).toBe(0);
	});

	it("只通过类型化接口执行通用 SimulationTask，并保留结构化执行失败", async () => {
		const { service, pool } = createTargetService();
		service.start();
		pool.simulationTaskHandler = (task) => ({ success: true, data: createSimulationTaskResult(task.runId) });

		const results = await service.executeSimulationTasks([
			createSimulationTask("task-a"),
			createSimulationTask("task-b"),
		]);
		expect(results.map((result) => result.output.runId)).toEqual(["task-a", "task-b"]);

		pool.simulationTaskHandler = () => ({
			success: false,
			error: { code: "simulation_task_timeout", message: "task timed out" },
		});
		await expect(service.executeSimulationTask(createSimulationTask("task-c"))).rejects.toMatchObject({
			name: "EngineExecutionFailure",
			executionError: { code: "simulation_task_timeout" },
		});
		await expect(service.executeSimulationTask(createSimulationTask("task-d"))).rejects.toBeInstanceOf(
			EngineExecutionFailure,
		);

		await service.shutdown();
	});

	it("AUI 直接装配两个真实 Session，工作面切换不关闭 Handle 且父 actor 停止时各关闭一次", async () => {
		const { service, engines } = createTargetService();
		service.start();
		const simulatorRuntime = createSimulatorSessionRuntime(service);
		const characterRuntime = createCharacterSessionRuntime({ engineService: service });
		const appActor = createActor(
			createInterfaceStateMachine({
				simulatorSession: simulatorRuntime.machine,
				characterSession: characterRuntime.machine,
			}),
			{ systemId: "interfaceState" },
		);

		appActor.start();
		await vi.waitFor(() => {
			expect(service.getHealth().realtimeHandleCount).toBe(2);
		});
		expect(appActor.system.get("simulatorSession")).toBeDefined();
		expect(appActor.system.get("characterSession")).toBeDefined();
		expect(engines.map((engine) => engine.id)).toEqual(["realtime:handle-1", "realtime:handle-2"]);

		appActor.send({ type: "character.open", characterId: "character-1" });
		appActor.send({ type: "character.close", characterId: "character-1" });
		expect(service.getHealth().realtimeHandleCount).toBe(2);
		expect(engines.map((engine) => engine.disposeCount)).toEqual([0, 0]);

		appActor.stop();
		await vi.waitFor(() => {
			expect(service.getHealth().realtimeHandleCount).toBe(0);
		});
		expect(engines.map((engine) => engine.disposeCount)).toEqual([1, 1]);

		await service.shutdown();
	});
});
