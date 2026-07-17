import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerPool } from "./WorkerPool";

type JobMap = {
	job: { value: number };
};
type Priority = "high" | "low";

type WorkerTaskHandler = (message: { belongToTaskId: string; payload: unknown }, port: MessagePort) => void;

class FakeWorker {
	static instances: FakeWorker[] = [];
	static taskHandler: WorkerTaskHandler = () => {};
	static failOnInstance: number | null = null;

	onerror: ((event: ErrorEvent) => void) | null = null;
	terminated = false;
	private port?: MessagePort;

	constructor(_url: string | URL, _options?: WorkerOptions) {
		if (FakeWorker.instances.length === FakeWorker.failOnInstance) throw new Error("worker construction failed");
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
		this.terminated = true;
		this.port?.close();
	}
}

function createPool(options: { taskTimeout?: number; maxRetries?: number; maxWorkers?: number } = {}) {
	return new WorkerPool<keyof JobMap, JobMap, Priority>({
		workerUrl: "fake.worker.js",
		priority: ["high", "low"],
		maxWorkers: options.maxWorkers ?? 1,
		taskTimeout: options.taskTimeout ?? 500,
		maxRetries: options.maxRetries ?? 0,
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
	FakeWorker.failOnInstance = null;
	vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("WorkerPool unknown 结果边界", () => {
	it("构造和查询不创建 Worker，只有显式 start 启动且关闭后不能重启", async () => {
		const intervalSpy = vi.spyOn(globalThis, "setInterval");
		const pool = createPool();
		expect(FakeWorker.instances).toHaveLength(0);
		expect(intervalSpy).not.toHaveBeenCalled();
		expect(pool.getStatus().totalWorkers).toBe(0);
		expect(pool.isReady()).toBe(false);
		await expect(pool.executeTask("job", { value: 1 }, "high")).rejects.toThrow("WorkerPool 尚未启动");

		pool.start();
		pool.start();
		expect(FakeWorker.instances).toHaveLength(1);
		expect(intervalSpy).toHaveBeenCalledTimes(2);
		await vi.waitFor(() => expect(pool.isReady()).toBe(true));

		await pool.shutdown();
		expect(() => pool.start()).toThrow("无法从 stopped 状态启动");
	});

	it("部分启动失败会回收已创建 Worker，并且失败实例不能重新启动", async () => {
		FakeWorker.failOnInstance = 1;
		const pool = createPool({ maxWorkers: 2 });

		expect(() => pool.start()).toThrow("worker construction failed");
		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminated).toBe(true);
		expect(pool.getStatus().totalWorkers).toBe(0);
		expect(() => pool.start()).toThrow("无法从 stopped 状态启动");
		await pool.shutdown();
	});

	it("只返回 Result<unknown> 并保留合法业务 payload", async () => {
		FakeWorker.taskHandler = (message, port) => {
			port.postMessage({ belongToTaskId: message.belongToTaskId, result: { value: 7 } });
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeTask("job", { value: 7 }, "high")).resolves.toEqual({
			success: true,
			data: { value: 7 },
			metrics: undefined,
		});

		await pool.shutdown();
	});

	it("非法响应信封立即失败并替换 Worker", async () => {
		FakeWorker.taskHandler = (_message, port) => {
			port.postMessage({ invalid: true });
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeTask("job", { value: 1 }, "high")).rejects.toThrow("invalid task response");
		expect(FakeWorker.instances).toHaveLength(2);
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await pool.shutdown();
	});

	it("未知 taskId 不会让真实任务等待到超时", async () => {
		FakeWorker.taskHandler = (_message, port) => {
			port.postMessage({ belongToTaskId: "unknown-task", result: null });
		};
		const pool = createPool();
		pool.start();

		await expect(pool.executeTask("job", { value: 1 }, "high")).rejects.toThrow("unknown task id");
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await pool.shutdown();
	});

	it("任务超时会释放并替换占用的 Worker", async () => {
		const pool = createPool({ taskTimeout: 20 });
		pool.start();

		await expect(pool.executeTask("job", { value: 1 }, "high")).rejects.toThrow("Task timeout");
		expect(FakeWorker.instances).toHaveLength(2);
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await pool.shutdown();
	});

	it("可重试 transport 失败会在替换 Worker 后重新执行同一任务", async () => {
		let attempt = 0;
		FakeWorker.taskHandler = (message, port) => {
			attempt++;
			if (attempt === 1) {
				port.postMessage({ belongToTaskId: message.belongToTaskId, error: "temporary transport failure" });
				return;
			}
			port.postMessage({ belongToTaskId: message.belongToTaskId, result: 9 });
		};
		const pool = createPool({ maxRetries: 1 });
		pool.start();

		await expect(pool.executeTask("job", { value: 9 }, "high")).resolves.toEqual({
			success: true,
			data: 9,
			metrics: undefined,
		});
		expect(attempt).toBe(2);
		expect(FakeWorker.instances[0].terminated).toBe(true);

		await pool.shutdown();
	});

	it("并发 shutdown 共享关闭过程，最后一个任务最终失败后不创建空闲替代 Worker", async () => {
		let rejectTask = () => {};
		let taskDispatched = false;
		FakeWorker.taskHandler = (message, port) => {
			taskDispatched = true;
			rejectTask = () => {
				port.postMessage({ belongToTaskId: message.belongToTaskId, error: "final transport failure" });
			};
		};
		const pool = createPool();
		pool.start();
		const task = pool.executeTask("job", { value: 1 }, "high");
		await vi.waitFor(() => expect(taskDispatched).toBe(true));

		const firstShutdown = pool.shutdown();
		const secondShutdown = pool.shutdown();
		expect(secondShutdown).toBe(firstShutdown);
		rejectTask();

		await expect(task).rejects.toThrow("final transport failure");
		await firstShutdown;
		expect(FakeWorker.instances).toHaveLength(1);
		expect(FakeWorker.instances[0].terminated).toBe(true);
	});

	it("shutdown 期间仍替换故障 Worker 以排空可重试任务", async () => {
		let attempt = 0;
		let failFirstAttempt = () => {};
		FakeWorker.taskHandler = (message, port) => {
			attempt++;
			if (attempt === 1) {
				failFirstAttempt = () => {
					port.postMessage({ belongToTaskId: message.belongToTaskId, error: "retry during shutdown" });
				};
				return;
			}
			port.postMessage({ belongToTaskId: message.belongToTaskId, result: 2 });
		};
		const pool = createPool({ maxRetries: 1 });
		pool.start();
		const task = pool.executeTask("job", { value: 2 }, "high");
		await vi.waitFor(() => expect(attempt).toBe(1));

		const shutdown = pool.shutdown();
		failFirstAttempt();

		await expect(task).resolves.toMatchObject({ success: true, data: 2 });
		await shutdown;
		expect(attempt).toBe(2);
		expect(FakeWorker.instances).toHaveLength(2);
		expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
	});
});
