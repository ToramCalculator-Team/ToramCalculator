import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineLifecycleCommand, EngineLifecycleSnapshot } from "../GameEngineSM";
import { EngineScenarioDataSchema } from "../types";
import { EngineWorkerClient } from "./EngineWorkerClient";
import { engineLifecycleFailure, engineLifecycleSuccess } from "./protocol";

const scenario = EngineScenarioDataSchema.parse({
	scenario: {
		randomSeed: 1,
		logicHz: 60,
		primaryMemberId: "member-1",
		campA: [],
		campB: [],
	},
});

class FakeWorker {
	static failCommand: EngineLifecycleCommand["type"] | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	private port: MessagePort | null = null;
	private state: EngineLifecycleSnapshot["confirmedState"] = "idle";

	postMessage(message: { type: string; port?: MessagePort }): void {
		if (message.type !== "init" || !message.port) return;
		this.port = message.port;
		this.port.onmessage = (event) => this.handleTask(event.data as { belongToTaskId: string; payload: unknown });
		this.port.start();
		this.pushSnapshot();
		this.port.postMessage({ type: "system_event", data: { type: "worker_ready" } });
	}

	terminate(): void {
		this.port?.close();
		this.port = null;
	}

	private pushSnapshot(): void {
		this.port?.postMessage({
			type: "engine_lifecycle_snapshot",
			data: { state: this.state, confirmedState: this.state, pending: null },
		});
	}

	private targetState(command: EngineLifecycleCommand): EngineLifecycleSnapshot["confirmedState"] {
		switch (command.type) {
			case "CMD_INIT":
			case "CMD_STOP":
			case "CMD_RESET":
			case "CMD_FAST_FORWARD":
				return "ready";
			case "CMD_START":
			case "CMD_RESUME":
				return "running";
			case "CMD_PAUSE":
			case "CMD_STEP":
				return "paused";
			case "CMD_UNLOAD":
				return "idle";
		}
	}

	private handleTask(message: { belongToTaskId: string; payload: unknown }): void {
		const command = message.payload as EngineLifecycleCommand;
		if (!command.type.startsWith("CMD_")) {
			this.port?.postMessage({
				belongToTaskId: message.belongToTaskId,
				result: { success: true, data: undefined },
				error: null,
			});
			return;
		}

		const failed = FakeWorker.failCommand === command.type;
		const result = failed
			? engineLifecycleFailure(command, { code: "fake_failure", message: `${command.type} failed` })
			: command.type === "CMD_FAST_FORWARD"
				? engineLifecycleSuccess(command, { ticksRun: 5, elapsedMs: 100, reachedLimit: true })
				: engineLifecycleSuccess(command);
		if (!failed) this.state = this.targetState(command);
		this.pushSnapshot();
		this.port?.postMessage({ belongToTaskId: message.belongToTaskId, result, error: null });
	}
}

describe("EngineWorkerClient lifecycle controller", () => {
	beforeEach(() => {
		FakeWorker.failCommand = null;
		vi.stubGlobal("Worker", FakeWorker);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("只在 Worker 结果提交后完成命令并投影只读状态", async () => {
		const client = new EngineWorkerClient("engine-1");
		await client.whenReady();
		const states: string[] = [];
		const release = client.subscribeLifecycle((snapshot) => states.push(snapshot.state));

		await client.loadScenario(scenario);
		expect(client.getLifecycleSnapshot().confirmedState).toBe("ready");
		await client.start();
		expect(client.getLifecycleSnapshot().confirmedState).toBe("running");
		await client.pause();
		await client.step();
		expect(client.getLifecycleSnapshot().confirmedState).toBe("paused");
		await client.resume();
		await client.stop();
		const advanced = await client.fastForward({ maxTicks: 5 });
		expect(advanced).toEqual({ ticksRun: 5, elapsedMs: 100, reachedLimit: true });
		expect(client.getLifecycleSnapshot().confirmedState).toBe("ready");
		await client.unloadScenario();
		expect(client.getLifecycleSnapshot().confirmedState).toBe("idle");
		expect(states).toContain("advancing");

		release();
		await client.dispose();
		expect(() => client.getLifecycleSnapshot()).toThrow("已销毁");
	});

	it("结构化执行失败使 controller 回到命令来源状态", async () => {
		const client = new EngineWorkerClient("engine-2");
		await client.whenReady();
		await client.loadScenario(scenario);
		FakeWorker.failCommand = "CMD_START";

		await expect(client.start()).rejects.toMatchObject({
			name: "EngineExecutionFailure",
			executionError: { code: "fake_failure" },
		});
		expect(client.getLifecycleSnapshot()).toMatchObject({ state: "ready", confirmedState: "ready", pending: null });
		await client.dispose();
	});
});
