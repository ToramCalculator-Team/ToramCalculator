import { createLogger } from "~/lib/Logger";
import type { DPSImpactResult, PreviewReport, SkillProbeResult } from "../Preview/types";
import type { EngineScenarioData, SimulationProfile } from "../types";
import { SimulatorPool } from "./SimulatorPool";
import { SimulationEngineImpl, type SimulationEngine } from "./SimulationEngine";
import simulationWorker from "./Simulation.worker?worker&url";
import { SimulatorTaskPriority } from "./protocol";

const log = createLogger("EngineService");

/**
 * 批量分发阈值：任务数 <= 此值时在单 worker 内顺序执行，超过时分发到 batchPool 并行执行。
 */
const BATCH_DISPATCH_THRESHOLD = 5;

/**
 * 提供给 UI 页面与游戏引擎交互的主线程门面。
 * 实时引擎由 Service 直管，分支/分析任务由 batchPool 执行。
 */
export class EngineService {
	private static instance: EngineService | null = null;

	static getInstance(): EngineService {
		if (!EngineService.instance) {
			EngineService.instance = new EngineService();
		}
		return EngineService.instance;
	}

	private readonly engines = new Map<string, SimulationEngine>();
	private readonly batchPool: SimulatorPool;
	private readonly defaultEngineId = "__default__";

	private constructor() {
		this.batchPool = new SimulatorPool({
			workerUrl: simulationWorker,
			priority: [...SimulatorTaskPriority],
			maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 6),
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
		this.createEngine(this.defaultEngineId);
		log.info("初始化");
	}

	getDefaultEngine(): SimulationEngine {
		return this.createEngine(this.defaultEngineId);
	}
	createEngine(id = `engine_${Date.now()}`): SimulationEngine {
		const existing = this.engines.get(id);
		if (existing) return existing;
		const engine = new SimulationEngineImpl(id);
		this.engines.set(id, engine);
		return engine;
	}
	getEngine(id: string): SimulationEngine | null {
		return this.engines.get(id) ?? null;
	}
	getAllEngines(): SimulationEngine[] {
		return [...this.engines.values()];
	}
	async disposeEngine(id: string): Promise<void> {
		const engine = this.engines.get(id);
		if (!engine) return;
		await engine.dispose();
		this.engines.delete(id);
	}

	private requireEngine(engineId?: string): SimulationEngine {
		const id = engineId ?? this.defaultEngineId;
		const engine = this.engines.get(id);
		if (!engine) throw new Error(`engine not found: ${id}`);
		return engine;
	}

	// ==================== 生命周期 ====================

	async loadScenario(data: EngineScenarioData, engineId?: string): Promise<void> {
		await this.requireEngine(engineId).loadScenario(data);
		log.info("初始化数据加载完成");
	}

	async setProfile(profile: SimulationProfile, engineId?: string): Promise<void> {
		await this.requireEngine(engineId).setProfile(profile);
		log.info("运行模式设置完成");
	}

	/**
	 * 增量更新成员配置（Character 页面配置变更）。
	 * 将变更推送到 realtime worker 的引擎实例上。
	 */
	async patchMemberConfig(memberId: string, memberData: unknown, engineId?: string): Promise<void> {
		await this.requireEngine(engineId).patchMemberConfig(memberId, memberData);
		log.info(`成员配置更新完成: ${memberId}`);
	}

	// ==================== 预览 API ====================

	/**
	 * 对单个成员运行预览——探测其所有技能。
	 * 始终在实时 worker 上执行（单任务，无需分发）。
	 */
	async runSkillPreview(memberId: string, engineId?: string): Promise<PreviewReport> {
		const report = await this.requireEngine(engineId).runPreview(memberId);
		if (!report) {
			return { memberId, statSnapshot: {}, skillProbes: [], elapsedMs: 0 };
		}
		return report;
	}

	predictSkillDamage(sourceEngineId: string, memberId: string, skillIds?: string[]): Promise<PreviewReport> {
		return this.runBatchPreview(memberId, skillIds ?? [], sourceEngineId);
	}

	/**
	 * 对多个技能运行批量预览。
	 * 使用动态分发策略：
	 * - taskCount <= BATCH_DISPATCH_THRESHOLD → 单 worker 顺序执行
	 * - taskCount > BATCH_DISPATCH_THRESHOLD → 分发到 batchPool workers
	 */
	async runBatchPreview(memberId: string, skillIds: string[], sourceEngineId?: string): Promise<PreviewReport> {
		const shouldParallelize = skillIds.length > BATCH_DISPATCH_THRESHOLD && this.batchPool !== null;

		if (shouldParallelize) {
			log.info(
				`批量预览并行执行: 成员 ${memberId}, ${skillIds.length} 技能，通过 batchPool 并行执行`,
			);
			return this.runBatchPreviewParallel(memberId, skillIds, sourceEngineId);
		}

		log.info(
			`批量预览顺序执行: 成员 ${memberId}, ${skillIds.length} 技能，通过 realtimePool 顺序执行`,
		);
		return this.runSkillPreview(memberId, sourceEngineId);
	}

	/**
	 * 跨多个道具运行 DPS 对比。
	 * - itemCount <= BATCH_DISPATCH_THRESHOLD → 单 worker 执行
	 * - itemCount > BATCH_DISPATCH_THRESHOLD → 分发到 batchPool
	 */
	async runBatchDPSCompare(itemIds: string[], memberId: string, sourceEngineId?: string): Promise<DPSImpactResult[]> {
		const shouldParallelize = itemIds.length > BATCH_DISPATCH_THRESHOLD && this.batchPool !== null;

		if (shouldParallelize) {
			log.info(
				`DPS 对比并行执行: ${itemIds.length} 道具，通过 batchPool 并行执行`,
			);
			return this.runBatchDPSParallel(itemIds, memberId, sourceEngineId);
		}

		log.info(
			`DPS 对比顺序执行: ${itemIds.length} 道具，通过 realtimePool 顺序执行`,
		);
		return this.runBatchDPSSequential(itemIds, memberId, sourceEngineId);
	}

	calculateDPSImpact(sourceEngineId: string, memberId: string, equipmentConfigs: Array<{ id: string }>): Promise<DPSImpactResult[]> {
		return this.runBatchDPSCompare(
			equipmentConfigs.map((x) => x.id),
			memberId,
			sourceEngineId,
		);
	}

	async previewMemberState(sourceEngineId: string, memberId: string): Promise<Record<string, unknown>> {
		return this.queryMemberStats(memberId, sourceEngineId);
	}

	// ==================== 查询 API ====================

	async queryMemberStats(memberId: string, engineId?: string): Promise<Record<string, unknown>> {
		const members = await this.requireEngine(engineId).getMembers();
		const match = members.find((m) => m.id === memberId);
		return match?.attrs ?? {};
	}

	async queryDPSImpact(itemId: string, _memberId: string): Promise<DPSImpactResult> {
		// TODO: 后续迭代接入完整 DPS 模拟
		return { itemId, dpsDelta: 0, dpsPercent: "0%" };
	}

	async queryComputedSkills(memberId: string, engineId?: string): Promise<unknown[]> {
		return this.requireEngine(engineId).getComputedSkills(memberId);
	}

	// ==================== 内部：批量分发 ====================

	/**
	 * 在 batch workers 间并行执行（大批量）。
	 * 流程：
	 * 1. 从实时 worker 捕获 checkpoint + 表达式字典
	 * 2. 将技能探测分块分发到 batch workers
	 * 3. 每个 batch worker：导入 checkpoint + 表达式字典 → 探测技能 → 返回结果
	 * 4. 聚合结果
	 */
	private async runBatchPreviewParallel(memberId: string, skillIds: string[], sourceEngineId?: string): Promise<PreviewReport> {
		const sourceEngine = this.requireEngine(sourceEngineId);
		const batchPool = this.batchPool;

		const [checkpoint, exprDict] = await Promise.all([
			sourceEngine.captureCheckpoint(),
			sourceEngine.exportExprDict(),
		]);

		const workerCount = Math.min(skillIds.length, 4);
		const chunkSize = Math.ceil(skillIds.length / workerCount);
		const chunks: string[][] = [];
		for (let i = 0; i < skillIds.length; i += chunkSize) {
			chunks.push(skillIds.slice(i, i + chunkSize));
		}

		log.info(`技能探测分发: ${skillIds.length} 技能，通过 ${chunks.length} 个 worker 并行执行`);

		// Each batch worker: import state → run preview → return partial results
		const tasks = chunks.map(async (_chunk) => {
			await batchPool.importExprDict(exprDict);
			if (checkpoint) {
				await batchPool.restoreCheckpoint(checkpoint);
			}
			const report = await batchPool.runPreview(memberId);
			return report?.skillProbes ?? [];
		});

		const chunkResults = await Promise.all(tasks);
		const allProbes: SkillProbeResult[] = chunkResults.flat();

		return { memberId, statSnapshot: {}, skillProbes: allProbes, elapsedMs: 0 };
	}

	private async runBatchDPSSequential(itemIds: string[], _memberId: string, _sourceEngineId?: string): Promise<DPSImpactResult[]> {
		// TODO: 后续迭代接入完整 DPS 模拟
		return itemIds.map((itemId) => ({ itemId, dpsDelta: 0, dpsPercent: "0%" }));
	}

	private async runBatchDPSParallel(itemIds: string[], _memberId: string, _sourceEngineId?: string): Promise<DPSImpactResult[]> {
		// TODO: 后续迭代接入完整并行 DPS 模拟
		return itemIds.map((itemId) => ({ itemId, dpsDelta: 0, dpsPercent: "0%" }));
	}

	async shutdown(): Promise<void> {
		for (const engine of this.engines.values()) {
			await engine.dispose();
		}
		this.engines.clear();
		await this.batchPool.shutdown();
	}
}
