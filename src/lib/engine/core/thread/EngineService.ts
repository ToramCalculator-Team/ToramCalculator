import { createId } from "@paralleldrive/cuid2";
import { createLogger, LogLevel } from "~/lib/Logger";
import type { PoolHealthMetrics } from "~/lib/WorkerPool/WorkerPool";
import type { SimulationTask, SimulationTaskResult } from "../simulationTask";
import { EngineWorkerClient } from "./EngineWorkerClient";
import { EngineExecutionFailure, EngineTaskPriority } from "./protocol";
import { type ManagedEngineWorkerClient, RealtimeEngineHandle } from "./RealtimeEngineHandle";
import simulationWorker from "./Simulation.worker?worker&url";
import { SimulationWorkerPool } from "./SimulationWorkerPool";

const log = createLogger("EngineService");

export type EngineServiceInitOptions = {
	/** 分支 Worker 内全部 logger 的最高输出等级；默认只输出 error。 */
	branchLogLevel?: LogLevel;
};

type SimulationWorkerPoolResource = Pick<SimulationWorkerPool, "start" | "executeEngineRPC" | "getStatus" | "shutdown">;
type EngineServiceLifecycle = "stopped" | "started" | "stopping";

type RealtimeHandleResource = {
	client: ManagedEngineWorkerClient;
	handle: RealtimeEngineHandle;
};

export type EngineServiceDependencies = {
	createEngineWorkerClient?: (clientId: string) => ManagedEngineWorkerClient;
	createSimulationWorkerPool?: (
		config: ConstructorParameters<typeof SimulationWorkerPool>[0],
	) => SimulationWorkerPoolResource;
	createHandleId?: () => string;
};

export type EngineServiceHealth = {
	started: boolean;
	realtimeHandleCount: number;
	simulationWorkerPool: PoolHealthMetrics | null;
};

function branchWorkerUrl(logLevel: LogLevel): string {
	const separator = simulationWorker.includes("?") ? "&" : "?";
	return `${simulationWorker}${separator}engineLogLevel=${logLevel}`;
}

function getBranchWorkerLimit(): number {
	const hardwareLimit = navigator.hardwareConcurrency || 4;
	// 设计说明：开发环境每个 module worker 都会建立 Vite HMR 连接，因此限制并发以控制刷新时的连接和 CPU 峰值。
	const devLimit = import.meta.env.DEV ? 2 : 6;
	return Math.min(hardwareLimit, devLimit);
}

/**
 * 主线程非业务引擎基础设施边界。
 * 职责收敛为两件事：
 * 1. 通用实时引擎资源的创建、租约登记与回收
 * 2. 一次性模拟任务执行原语
 *
 * 业务步骤、结果解释和 Session 生命周期由应用层 Session 负责。
 */
export class EngineService {
	private realtimeHandles = new Map<string, RealtimeHandleResource>();
	private simulationWorkerPool: SimulationWorkerPoolResource | null = null;
	private lifecycle: EngineServiceLifecycle = "stopped";
	private shutdownPromise: Promise<void> | null = null;
	private readonly createEngineWorkerClient: (clientId: string) => ManagedEngineWorkerClient;
	private readonly createSimulationWorkerPool: (
		config: ConstructorParameters<typeof SimulationWorkerPool>[0],
	) => SimulationWorkerPoolResource;
	private readonly createHandleId: () => string;

	constructor(dependencies: EngineServiceDependencies = {}) {
		this.createEngineWorkerClient =
			dependencies.createEngineWorkerClient ?? ((clientId) => new EngineWorkerClient(clientId));
		this.createSimulationWorkerPool =
			dependencies.createSimulationWorkerPool ?? ((config) => new SimulationWorkerPool(config));
		this.createHandleId = dependencies.createHandleId ?? createId;
	}

	/**
	 * 最终 bootstrap 入口：只启动非业务 EngineService 基础设施，不预建具名实时引擎。
	 */
	start(options: EngineServiceInitOptions = {}): void {
		if (this.lifecycle === "started") return;
		if (this.lifecycle === "stopping") {
			throw new Error("EngineService 正在关闭，不能重新启动");
		}
		if (this.realtimeHandles.size > 0 || this.simulationWorkerPool) {
			throw new Error("EngineService 存在未关闭资源，必须先重试 shutdown()");
		}
		const branchLogLevel = options.branchLogLevel ?? LogLevel.ERROR;

		const batchPool = this.createSimulationWorkerPool({
			workerUrl: branchWorkerUrl(branchLogLevel),
			priority: [...EngineTaskPriority],
			maxWorkers: getBranchWorkerLimit(),
			taskTimeout: 60000,
			maxRetries: 1,
			maxQueueSize: 100,
			monitorInterval: 10000,
			isWorkerReadyMessage: (sys) => {
				if (sys.type !== "system_event") return false;
				if (typeof sys.data !== "object" || sys.data === null) return false;
				const data = sys.data as { type?: unknown };
				return data.type === "worker_ready";
			},
		});
		batchPool.start();
		this.simulationWorkerPool = batchPool;
		this.lifecycle = "started";
		log.info("EngineService 初始化完成");
	}

	// ==================== 引擎资源管理 ====================

	private assertInitialized(): void {
		// 唯一启动点是 bootstrap 的 engine 模块；读取和资源申请都不能惰性补启动。
		if (this.lifecycle !== "started") {
			throw new Error("EngineService 尚未启动：必须先由 bootstrap engine 模块调用 start()");
		}
	}

	/** 为一个应用级 Session 打开并交付独立的通用实时引擎 Handle。 */
	async openRealtimeEngine(): Promise<RealtimeEngineHandle> {
		this.assertInitialized();
		const handleId = this.createHandleId();
		if (this.realtimeHandles.has(handleId)) {
			throw new Error(`RealtimeEngineHandle ID 冲突: ${handleId}`);
		}
		const client = this.createEngineWorkerClient(`realtime:${handleId}`);
		const handle = new RealtimeEngineHandle(handleId, client, (id) => this.closeRealtimeEngine(id));
		this.realtimeHandles.set(handleId, { client, handle });
		try {
			await client.whenReady();
			if (this.lifecycle !== "started" || handle.isClosed()) {
				throw new Error(`EngineService 在实时引擎就绪前已停止: ${handleId}`);
			}
			return handle;
		} catch (error) {
			await handle.close().catch(() => undefined);
			throw error;
		}
	}

	private async closeRealtimeEngine(handleId: string): Promise<void> {
		const resource = this.realtimeHandles.get(handleId);
		if (!resource) return;
		await resource.client.dispose();
		if (this.realtimeHandles.get(handleId) === resource) this.realtimeHandles.delete(handleId);
	}

	getHealth(): EngineServiceHealth {
		return {
			started: this.lifecycle === "started",
			realtimeHandleCount: this.realtimeHandles.size,
			simulationWorkerPool: this.simulationWorkerPool?.getStatus() ?? null,
		};
	}

	// ==================== 一次性 SimulationTask ====================

	/** 执行一个通用的一次性模拟任务；业务层只接收已校验结果或类型化基础设施错误。 */
	async executeSimulationTask(
		task: SimulationTask,
		priority: EngineTaskPriority = "medium",
	): Promise<SimulationTaskResult> {
		this.assertInitialized();
		const pool = this.simulationWorkerPool;
		if (!pool) throw new Error("simulator worker pool not initialized");
		const result = await pool.executeEngineRPC({ type: "execute_simulation_task", task }, priority);
		if (!result.success) throw new EngineExecutionFailure(result.error);
		return result.data;
	}

	/** 批量提交相互独立的通用任务；任务隔离和 Worker 分配由 SimulationWorkerPool 负责。 */
	executeSimulationTasks(
		tasks: SimulationTask[],
		priority: EngineTaskPriority = "medium",
	): Promise<SimulationTaskResult[]> {
		return Promise.all(tasks.map((task) => this.executeSimulationTask(task, priority)));
	}

	// ==================== 生命周期 ====================

	/**
	 * 关闭所有自有资源。单个资源释放失败不会阻止其余资源清理；并发调用共享同一关闭过程。
	 */
	shutdown(): Promise<void> {
		if (this.shutdownPromise) return this.shutdownPromise;
		if (this.lifecycle === "stopped" && this.realtimeHandles.size === 0 && !this.simulationWorkerPool) {
			return Promise.resolve();
		}

		this.lifecycle = "stopping";
		const shutdownPromise = this.shutdownResources().finally(() => {
			this.lifecycle = "stopped";
			this.shutdownPromise = null;
			log.info("EngineService 已关闭");
		});
		this.shutdownPromise = shutdownPromise;
		return shutdownPromise;
	}

	private async shutdownResources(): Promise<void> {
		const handles = Array.from(this.realtimeHandles.values(), ({ handle }) => handle);
		const workerPool = this.simulationWorkerPool;
		const handleResults = await Promise.allSettled(handles.map((handle) => handle.close()));
		const poolResult = workerPool ? await Promise.allSettled([workerPool.shutdown()]) : [];
		if (workerPool && poolResult[0]?.status === "fulfilled" && this.simulationWorkerPool === workerPool) {
			this.simulationWorkerPool = null;
		}
		const results = [...handleResults, ...poolResult];
		const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1) {
			throw new AggregateError(failures, "EngineService 关闭时有多个资源释放失败");
		}
	}
}
