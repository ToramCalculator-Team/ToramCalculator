import { createPhysicalTerrainGenerator } from "~/lib/terrain";
import type { WorkerMessage, WorkerMessageEvent } from "~/lib/workerPool/type";
import type {
	TerrainChunkGenerateTask,
	TerrainChunkTaskResult,
	TerrainTaskPriority,
	TerrainWorkerTaskMap,
} from "./worldGeneration";

self.onmessage = (event: MessageEvent<{ type: "init"; port?: MessagePort }>) => {
	if (event.data.type !== "init" || !event.data.port) return;
	const port = event.data.port;

	port.onmessage = (
		portEvent: MessageEvent<WorkerMessage<TerrainChunkGenerateTask, TerrainTaskPriority>>,
	) => {
		const { belongToTaskId, payload } = portEvent.data;
		const startedAt = performance.now();
		try {
			if (payload.type !== "generate_chunk") throw new Error(`未知地形任务: ${String(payload.type)}`);
			const generator = createPhysicalTerrainGenerator(payload.definition);
			const chunk = generator.generateChunk(payload.key);
			const heights = chunk.heights.buffer;
			if (!(heights instanceof ArrayBuffer)) throw new Error("地形高度缓冲区不能作为 transferable 输出");
			const result: TerrainChunkTaskResult = {
				key: chunk.key,
				originX: chunk.originX,
				originZ: chunk.originZ,
				size: chunk.size,
				resolution: chunk.resolution,
				heights,
			};
			const response: WorkerMessageEvent<TerrainChunkTaskResult, TerrainWorkerTaskMap, never> = {
				belongToTaskId,
				result,
				error: null,
				metrics: { duration: performance.now() - startedAt, memoryUsage: 0 },
			};
			port.postMessage(response, [heights]);
		} catch (error) {
			const response: WorkerMessageEvent<TerrainChunkTaskResult, TerrainWorkerTaskMap, never> = {
				belongToTaskId,
				result: null,
				error: error instanceof Error ? error.message : String(error),
				metrics: { duration: performance.now() - startedAt, memoryUsage: 0 },
			};
			port.postMessage(response);
		}
	};

	port.postMessage({ type: "system_event", data: { type: "worker_ready" } });
};
