import { type PoolConfig, type PoolHealthMetrics, WorkerPool } from "~/lib/WorkerPool/WorkerPool";
import {
	EngineProtocolError,
	type EngineRPC,
	type EngineRPCResult,
	type EngineTaskPriority,
	EngineTransportError,
	type EngineWorkerTaskMap,
	type EngineWorkerTaskTypeMapKey,
	parseEngineRPCResult,
} from "./protocol";

/**
 * 池化模拟器 Worker 的资源管理边界。
 *
 * SimulationWorkerPool 私有组合通用 WorkerPool，只公开 Engine 协议能力、健康投影和生命周期；
 * 原始 executeTask、Worker wrapper 与通用消息事件不会泄漏给 EngineService 或业务层。
 */
export class SimulationWorkerPool {
	private readonly workerPool: WorkerPool<EngineWorkerTaskTypeMapKey, EngineWorkerTaskMap, EngineTaskPriority>;

	constructor(config: PoolConfig<EngineTaskPriority>) {
		this.workerPool = new WorkerPool(config);
	}

	start(): void {
		this.workerPool.start();
	}

	/** 实时与池化调用端共用同一请求—响应映射和运行时解析器（ADR 0040）。 */
	async executeEngineRPC<TRequest extends EngineRPC>(
		rpc: TRequest,
		priority: EngineTaskPriority,
	): Promise<EngineRPCResult<TRequest["type"]>> {
		try {
			const result = await this.workerPool.executeTask("engine_rpc", rpc, priority);
			if (!result.success) {
				throw new EngineTransportError(result.error);
			}
			return parseEngineRPCResult<TRequest["type"]>(rpc.type, result.data);
		} catch (error) {
			if (error instanceof EngineTransportError || error instanceof EngineProtocolError) throw error;
			throw new EngineTransportError("SimulationWorkerPool task transport failed", error);
		}
	}

	getStatus(): PoolHealthMetrics {
		return this.workerPool.getStatus();
	}

	async shutdown(): Promise<void> {
		await this.workerPool.shutdown();
	}
}
