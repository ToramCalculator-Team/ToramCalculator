import { z } from "zod/v4";
import type { TerrainChunkData, TerrainChunkKey, TerrainDefinition } from "~/lib/terrain";
import { WorkerPool } from "~/lib/workerPool/WorkerPool";
import terrainWorkerUrl from "./worldGeneration.worker?worker&url";

export interface TerrainChunkGenerateTask {
	type: "generate_chunk";
	definition: TerrainDefinition;
	key: TerrainChunkKey;
}

export type TerrainWorkerTaskMap = {
	generate_chunk: TerrainChunkGenerateTask;
};

export type TerrainTaskPriority = "near" | "normal";

const TerrainChunkResultSchema = z
	.object({
		key: z.object({ x: z.number().int(), z: z.number().int() }).strict(),
		originX: z.number().finite(),
		originZ: z.number().finite(),
		size: z.number().finite().positive(),
		resolution: z.number().int().min(2),
		heights: z.instanceof(ArrayBuffer),
	})
	.strict();

export type TerrainChunkTaskResult = z.output<typeof TerrainChunkResultSchema>;

export interface TerrainGenerationClient {
	generateChunk(key: TerrainChunkKey, priority?: TerrainTaskPriority): Promise<TerrainChunkData>;
	dispose(): void;
}

/**
 * 地形任务的独立线程池边界。
 *
 * 通用 WorkerPool 只处理任务信封和生命周期；本类封闭地形协议、运行时校验和高度缓冲区恢复，
 * 避免渲染层接触原始 Worker 或 unknown 结果。
 */
export class TerrainWorkerPool implements TerrainGenerationClient {
	private readonly workerPool = new WorkerPool<"generate_chunk", TerrainWorkerTaskMap, TerrainTaskPriority>({
		workerUrl: terrainWorkerUrl,
		priority: ["near", "normal"],
		maxWorkers: 1,
		taskTimeout: 15_000,
		maxRetries: 1,
		maxQueueSize: 512,
		isWorkerReadyMessage: (message) => {
			if (message.type !== "system_event" || typeof message.data !== "object" || message.data === null) {
				return false;
			}
			return (message.data as { type?: unknown }).type === "worker_ready";
		},
	});
	private disposed = false;

	constructor(private readonly definition: TerrainDefinition) {}

	start(): void {
		if (this.disposed) throw new Error("TerrainWorkerPool 已销毁");
		this.workerPool.start();
	}

	async generateChunk(key: TerrainChunkKey, priority: TerrainTaskPriority = "normal"): Promise<TerrainChunkData> {
		if (this.disposed) throw new Error("TerrainWorkerPool 已销毁");
		const result = await this.workerPool.executeTask(
			"generate_chunk",
			{ type: "generate_chunk", definition: this.definition, key },
			priority,
		);
		if (!result.success) throw new Error(result.error);
		const chunk = TerrainChunkResultSchema.parse(result.data);
		return { ...chunk, heights: new Float32Array(chunk.heights) };
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		void this.workerPool.shutdown();
	}
}

/** 创建并显式启动地形任务池；WorldTerrain 是该生命周期的唯一所有者。 */
export function startTerrainGenerationClient(definition: TerrainDefinition): TerrainGenerationClient {
	const pool = new TerrainWorkerPool(definition);
	pool.start();
	return pool;
}
