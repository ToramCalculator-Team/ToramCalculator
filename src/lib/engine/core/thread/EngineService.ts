import { createLogger } from "~/lib/Logger";
import { type BranchResult, type BranchTask, SimulatorTaskPriority } from "./protocol";
import simulationWorker from "./Simulation.worker?worker&url";
import { type SimulationEngine, SimulationEngineImpl } from "./SimulationEngine";
import { SimulatorPool } from "./SimulatorPool";

const log = createLogger("EngineService");

/** 主业务实时模拟常驻引擎 ID（ADR 0015）。 */
export const SIMULATOR_ENGINE_ID = "simulator";
/** 角色配置预览常驻引擎 ID（ADR 0015）。 */
export const CHARACTER_ENGINE_ID = "character";

function getBranchWorkerLimit(): number {
	const hardwareLimit = navigator.hardwareConcurrency || 4;
	// 设计说明：开发环境每个 module worker 都会建立 Vite HMR 连接；技能预览保留小并发，避免页面刷新时连接和 CPU 峰值过高。
	const devLimit = import.meta.env.DEV ? 2 : 6;
	return Math.min(hardwareLimit, devLimit);
}

/**
 * 提供给 UI 页面与游戏引擎交互的主线程门面。
 * 职责收敛为两件事：
 * 1. 引擎实例资源管理（创建 / 查询 / 销毁）
 * 2. 原子分支任务执行原语（executeBranchTask / executeBranchBatch）
 *
 * 编排逻辑（技能分组、结果聚合等）由页面级消费者负责。
 */
export class EngineService {
	private static instance: EngineService | null = null;

	static getInstance(): EngineService {
		if (!EngineService.instance) {
			EngineService.instance = new EngineService();
		}
		return EngineService.instance;
	}

	private engines: Map<string, SimulationEngine> = new Map();
	private batchPool: SimulatorPool | null = null;
	private initialized = false;

	private constructor() {
		// 不做自动初始化：由 init() 显式调用
	}

	/**
	 * 显式初始化：创建 batchPool 和两个具名常驻引擎（simulator / character）。
	 * 由 bootstrap 在 app 启动时调用。
	 */
	init(): void {
		if (this.initialized) return;
		this.initialized = true;

		this.batchPool = new SimulatorPool({
			workerUrl: simulationWorker,
			priority: [...SimulatorTaskPriority],
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
		// ADR 0015：两个常驻引擎在 init 期一次性建好，状态隔离、跨 URL 常驻。
		this.engines.set(SIMULATOR_ENGINE_ID, new SimulationEngineImpl(SIMULATOR_ENGINE_ID));
		this.engines.set(CHARACTER_ENGINE_ID, new SimulationEngineImpl(CHARACTER_ENGINE_ID));
		log.info("EngineService 初始化完成");
	}

	isReady(): boolean {
		return this.initialized;
	}

	// ==================== 引擎资源管理 ====================

	/** 主业务实时模拟引擎（常驻）。 */
	getSimulatorEngine(): SimulationEngine {
		return this.requireEngine(SIMULATOR_ENGINE_ID);
	}

	/** 角色配置预览引擎（常驻）。 */
	getCharacterEngine(): SimulationEngine {
		return this.requireEngine(CHARACTER_ENGINE_ID);
	}

	private assertInitialized(): void {
		// 唯一启动点是 bootstrap 的 engine 模块（modules.ts: service.init()）。
		// 此处不再惰性 init——漏启动是编程错误，应显形而非被偷偷补救。
		if (!this.initialized) {
			throw new Error("EngineService 尚未初始化：必须先由 bootstrap engine 模块调用 init()");
		}
	}

	private requireEngine(engineId: string): SimulationEngine {
		this.assertInitialized();
		const engine = this.engines.get(engineId);
		if (!engine) throw new Error(`engine not found: ${engineId}`);
		return engine;
	}

	// ==================== 原子分支任务原语 ====================

	/**
	 * 执行单个原子分支任务。
	 * 一次 WorkerPool.executeTask 调用，保证 [loadScenario → restore → patch → execute → collect] 在同一 Worker 上完成。
	 *
	 * @param task 分支任务描述（含 scenarioData、checkpoint、patches、runtimeConfig、outputSelector）
	 * @returns 分支结果（success + data 或 success + error）
	 */
	async executeBranchTask(task: BranchTask): Promise<{ ok: true; data: BranchResult } | { ok: false; error: string }> {
		this.assertInitialized();
		try {
			const pool = this.batchPool;
			if (!pool) throw new Error("branch worker pool not initialized");
			const result = await pool.executeTask("engine_rpc", { type: "branch_task", task } as never, "medium");
			const rpcResult = result.data as { success?: boolean; data?: BranchResult; error?: string } | undefined;
			if (!result.success || !rpcResult?.success) {
				return { ok: false, error: rpcResult?.error ?? result.error ?? "branch_task failed" };
			}
			return { ok: true, data: rpcResult.data ?? { outputType: "unknown" } };
		} catch (error) {
			return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
		}
	}

	/**
	 * 批量执行原子分支任务（全并行）。
	 * 每个 task 独立提交到 batchPool，由 pool 内负载均衡分配 Worker。
	 *
	 * @param tasks 分支任务数组
	 * @returns 与输入顺序一致的结果数组
	 */
	async executeBranchBatch(
		tasks: BranchTask[],
	): Promise<Array<{ ok: true; data: BranchResult } | { ok: false; error: string }>> {
		return Promise.all(tasks.map((t) => this.executeBranchTask(t)));
	}

	// ==================== 生命周期 ====================

	/**
	 * 关闭所有资源并将 instance 置空，支持重新 init()。
	 */
	async shutdown(): Promise<void> {
		if (!this.initialized) return;
		for (const engine of this.engines.values()) {
			await engine.dispose();
		}
		this.engines.clear();
		if (this.batchPool) {
			await this.batchPool.shutdown();
			this.batchPool = null;
		}
		this.initialized = false;
		EngineService.instance = null;
		log.info("EngineService 已关闭");
	}
}
