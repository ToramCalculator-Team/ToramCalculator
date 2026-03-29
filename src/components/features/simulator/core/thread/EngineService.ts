import { createLogger } from "~/lib/Logger";
import type { DPSImpactResult, PreviewReport, SkillProbeResult } from "../Preview/types";
import type { EngineInitializationData, SimulationProfile } from "../types";
import type { SimulatorPool } from "./SimulatorPool";

const log = createLogger("EngineService");

/**
 * 批量分发阈值：任务数 <= 此值时在单 worker 内顺序执行，超过时分发到 batchPool 并行执行。
 */
const BATCH_DISPATCH_THRESHOLD = 5;

/**
 * 提供给 UI 页面与游戏引擎交互的主线程门面。
 * 封装 SimulatorPool 实例，并提供具备业务语义的 API。
 *
 * 用法：
 *   const service = EngineService.getInstance();
 *   service.attachRealtimePool(realtimeSimulatorPool);
 *   service.attachBatchPool(batchSimulatorPool);
 *   await service.loadScenario(data);
 *   service.setProfile(createRealtimeProfile());
 *   service.start();
 */
export class EngineService {
	private static instance: EngineService | null = null;

	static getInstance(): EngineService {
		if (!EngineService.instance) {
			EngineService.instance = new EngineService();
		}
		return EngineService.instance;
	}

	private realtimePool: SimulatorPool | null = null;
	private batchPool: SimulatorPool | null = null;

	private constructor() {
		log.info("EngineService: 初始化");
	}

	attachRealtimePool(pool: SimulatorPool): void {
		this.realtimePool = pool;
		log.info("EngineService: realtime pool attached");
	}

	attachBatchPool(pool: SimulatorPool): void {
		this.batchPool = pool;
		log.info("EngineService: batch pool attached");
	}

	getRealtimePool(): SimulatorPool | null {
		return this.realtimePool;
	}

	private requireRealtimePool(): SimulatorPool {
		if (!this.realtimePool) throw new Error("EngineService: realtime pool not attached");
		return this.realtimePool;
	}

	// ==================== 生命周期 ====================

	async loadScenario(data: EngineInitializationData): Promise<void> {
		const pool = this.requireRealtimePool();
		const res = await pool.loadScenario(data);
		if (!res.success) throw new Error(`loadScenario failed: ${res.error}`);
		log.info("EngineService: loadScenario complete");
	}

	async setProfile(profile: SimulationProfile): Promise<void> {
		const pool = this.requireRealtimePool();
		const res = await pool.setProfile(profile);
		if (!res.success) throw new Error(`setProfile failed: ${res.error}`);
		log.info("EngineService: setProfile complete");
	}

	async start(): Promise<void> {
		const pool = this.requireRealtimePool();
		await pool.executeTask("engine_command", { type: "START" } as never, "high");
		log.info("EngineService: start");
	}

	async stop(): Promise<void> {
		const pool = this.requireRealtimePool();
		await pool.executeTask("engine_command", { type: "STOP" } as never, "high");
		log.info("EngineService: stop");
	}

	async pause(): Promise<void> {
		const pool = this.requireRealtimePool();
		await pool.executeTask("engine_command", { type: "PAUSE" } as never, "high");
		log.info("EngineService: pause");
	}

	async resume(): Promise<void> {
		const pool = this.requireRealtimePool();
		await pool.executeTask("engine_command", { type: "RESUME" } as never, "high");
		log.info("EngineService: resume");
	}

	/**
	 * 增量更新成员配置（Character 页面配置变更）。
	 * 将变更推送到 realtime worker 的引擎实例上。
	 */
	async patchMemberConfig(memberId: string, memberData: unknown): Promise<void> {
		const pool = this.requireRealtimePool();
		const res = await pool.patchMember(memberId, memberData);
		if (!res.success) throw new Error(`patchMemberConfig failed: ${res.error}`);
		log.info(`EngineService: patchMemberConfig for ${memberId} complete`);
	}

	// ==================== 预览 API ====================

	/**
	 * 对单个成员运行预览——探测其所有技能。
	 * 始终在实时 worker 上执行（单任务，无需分发）。
	 */
	async runSkillPreview(memberId: string): Promise<PreviewReport> {
		const pool = this.requireRealtimePool();
		const report = await pool.runPreview(memberId);
		if (!report) {
			return { memberId, statSnapshot: {}, skillProbes: [], elapsedMs: 0 };
		}
		return report;
	}

	/**
	 * 对多个技能运行批量预览。
	 * 使用动态分发策略：
	 * - taskCount <= BATCH_DISPATCH_THRESHOLD → 单 worker 顺序执行
	 * - taskCount > BATCH_DISPATCH_THRESHOLD → 分发到 batchPool workers
	 */
	async runBatchPreview(memberId: string, skillIds: string[]): Promise<PreviewReport> {
		const shouldParallelize = skillIds.length > BATCH_DISPATCH_THRESHOLD && this.batchPool !== null;

		if (shouldParallelize) {
			log.info(
				`EngineService: runBatchPreview PARALLEL for member ${memberId}, ${skillIds.length} skills across batch workers`,
			);
			return this.runBatchPreviewParallel(memberId, skillIds);
		}

		log.info(
			`EngineService: runBatchPreview SEQUENTIAL for member ${memberId}, ${skillIds.length} skills on realtime worker`,
		);
		return this.runSkillPreview(memberId);
	}

	/**
	 * 跨多个道具运行 DPS 对比。
	 * - itemCount <= BATCH_DISPATCH_THRESHOLD → 单 worker 执行
	 * - itemCount > BATCH_DISPATCH_THRESHOLD → 分发到 batchPool
	 */
	async runBatchDPSCompare(itemIds: string[], memberId: string): Promise<DPSImpactResult[]> {
		const shouldParallelize = itemIds.length > BATCH_DISPATCH_THRESHOLD && this.batchPool !== null;

		if (shouldParallelize) {
			log.info(
				`EngineService: runBatchDPSCompare PARALLEL for ${itemIds.length} items across batch workers`,
			);
			return this.runBatchDPSParallel(itemIds, memberId);
		}

		log.info(
			`EngineService: runBatchDPSCompare SEQUENTIAL for ${itemIds.length} items on realtime worker`,
		);
		return this.runBatchDPSSequential(itemIds, memberId);
	}

	// ==================== 查询 API ====================

	async queryMemberStats(memberId: string): Promise<Record<string, unknown>> {
		const pool = this.requireRealtimePool();
		const members = await pool.getMembers();
		const match = members.find((m) => m.id === memberId);
		return match?.attrs ?? {};
	}

	async queryDPSImpact(itemId: string, _memberId: string): Promise<DPSImpactResult> {
		// TODO: 后续迭代接入完整 DPS 模拟
		return { itemId, dpsDelta: 0, dpsPercent: "0%" };
	}

	async queryComputedSkills(memberId: string): Promise<unknown[]> {
		const pool = this.requireRealtimePool();
		return pool.getComputedSkills(memberId);
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
	private async runBatchPreviewParallel(memberId: string, skillIds: string[]): Promise<PreviewReport> {
		const rtPool = this.requireRealtimePool();
		if (!this.batchPool) throw new Error("EngineService: batch pool not attached");
		const batchPool = this.batchPool;

		const [checkpoint, exprDict] = await Promise.all([
			rtPool.captureCheckpoint(),
			rtPool.exportExprDict(),
		]);

		const workerCount = Math.min(skillIds.length, 4);
		const chunkSize = Math.ceil(skillIds.length / workerCount);
		const chunks: string[][] = [];
		for (let i = 0; i < skillIds.length; i += chunkSize) {
			chunks.push(skillIds.slice(i, i + chunkSize));
		}

		log.info(`EngineService: distributing ${skillIds.length} skill probes across ${chunks.length} workers`);

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

	private async runBatchDPSSequential(itemIds: string[], _memberId: string): Promise<DPSImpactResult[]> {
		// TODO: 后续迭代接入完整 DPS 模拟
		return itemIds.map((itemId) => ({ itemId, dpsDelta: 0, dpsPercent: "0%" }));
	}

	private async runBatchDPSParallel(itemIds: string[], _memberId: string): Promise<DPSImpactResult[]> {
		// TODO: 后续迭代接入完整并行 DPS 模拟
		return itemIds.map((itemId) => ({ itemId, dpsDelta: 0, dpsPercent: "0%" }));
	}
}
