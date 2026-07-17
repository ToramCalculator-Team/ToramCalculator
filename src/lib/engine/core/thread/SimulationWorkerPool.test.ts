import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineProtocolError, EngineTransportError, engineRPCFailure } from "./protocol";
import { SimulationWorkerPool } from "./SimulationWorkerPool";

type WorkerTaskHandler = (message: { belongToTaskId: string; payload: unknown }, port: MessagePort) => void;

class FakeWorker {
	static instances: FakeWorker[] = [];
	static taskHandler: WorkerTaskHandler = () => {};

	onerror: ((event: ErrorEvent) => void) | null = null;
	private port?: MessagePort;

	constructor() {
		FakeWorker.instances.push(this);
	}

	postMessage(message: unknown): void {
		const init = message as { type?: unknown; port?: MessagePort };
		if (init.type !== "init" || !init.port) return;
		this.port = init.port;
		this.port.onmessage = (event) => {
			FakeWorker.taskHandler(event.data as { belongToTaskId: string; payload: unknown }, this.port as MessagePort);
		};
		queueMicrotask(() => {
			this.port?.postMessage({ type: "system_event", data: { type: "worker_ready" } });
		});
	}

	terminate(): void {
		this.port?.close();
	}
}

function createPool() {
	return new SimulationWorkerPool({
		workerUrl: "fake-simulator.worker.js",
		priority: ["high", "medium", "low"],
		maxWorkers: 1,
		maxRetries: 0,
		taskTimeout: 500,
		monitorInterval: 60_000,
		isWorkerReadyMessage: (message) =>
			message.type === "system_event" &&
			typeof message.data === "object" &&
			message.data !== null &&
			(message.data as { type?: unknown }).type === "worker_ready",
	});
}

beforeEach(() => {
	FakeWorker.instances = [];
	FakeWorker.taskHandler = () => {};
	vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("SimulationWorkerPool Engine 协议边界", () => {
	it("构造无副作用并且只公开窄生命周期与 Engine 协议", async () => {
		const pool = createPool();
		expect(FakeWorker.instances).toHaveLength(0);
		expect(pool.getStatus().totalWorkers).toBe(0);
		expect("executeTask" in pool).toBe(false);
		expect("isReady" in pool).toBe(false);
		expect("on" in pool).toBe(false);
		expect("emit" in pool).toBe(false);
		pool.start();
		pool.start();
		expect(FakeWorker.instances).toHaveLength(1);
		await pool.shutdown();
	});

	it("漏启动时映射为 transport failure，不惰性创建 Worker", async () => {
		const pool = createPool();
		await expect(pool.executeEngineRPC({ type: "get_members" }, "low")).rejects.toBeInstanceOf(EngineTransportError);
		expect(FakeWorker.instances).toHaveLength(0);
		await pool.shutdown();
	});

	it("保留结构化 Engine 执行失败", async () => {
		FakeWorker.taskHandler = (message, port) => {
			port.postMessage({
				belongToTaskId: message.belongToTaskId,
				result: engineRPCFailure("member query failed", "member_query_failed"),
			});
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeEngineRPC({ type: "get_members" }, "low")).resolves.toEqual({
			success: false,
			error: { code: "member_query_failed", message: "member query failed" },
		});

		await pool.shutdown();
	});

	it("响应 payload 不匹配时抛 EngineProtocolError", async () => {
		FakeWorker.taskHandler = (message, port) => {
			port.postMessage({
				belongToTaskId: message.belongToTaskId,
				result: { success: true, data: "not-members" },
			});
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeEngineRPC({ type: "get_members" }, "low")).rejects.toBeInstanceOf(EngineProtocolError);
		await pool.shutdown();
	});

	it("无效 Worker 信封映射为 EngineTransportError", async () => {
		FakeWorker.taskHandler = (_message, port) => {
			port.postMessage({ invalid: true });
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeEngineRPC({ type: "get_members" }, "low")).rejects.toBeInstanceOf(EngineTransportError);
		await pool.shutdown();
	});

	it("空字符串 transport error 仍然是失败，不被 truthy 判断当作成功", async () => {
		FakeWorker.taskHandler = (message, port) => {
			port.postMessage({ belongToTaskId: message.belongToTaskId, error: "" });
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeEngineRPC({ type: "get_members" }, "low")).rejects.toBeInstanceOf(EngineTransportError);
		await pool.shutdown();
	});
});
