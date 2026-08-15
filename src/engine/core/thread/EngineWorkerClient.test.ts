import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TERRAIN_DEFINITION } from "~/lib/terrain";
import type { EngineLifecycleCommand, EngineLifecycleSnapshot } from "../GameEngineSM";
import { EngineScenarioDataSchema } from "../types";
import { EngineWorkerClient } from "./EngineWorkerClient";
import { type EngineRPC, engineLifecycleFailure, engineLifecycleSuccess } from "./protocol";
import { createWorldStateLayoutDescriptor, WorldStateWriter } from "./worldStateBuffer";

const worldStateLayout = createWorldStateLayoutDescriptor([], { memberCapacity: 1, areaCapacity: 1 });

const scenario = EngineScenarioDataSchema.parse({
	terrain: DEFAULT_TERRAIN_DEFINITION,
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
		const command = message.payload as EngineLifecycleCommand | EngineRPC;
		if (!command.type.startsWith("CMD_")) {
			let data: unknown;
			if (command.type === "get_world_state_layout") data = worldStateLayout;
			if (command.type === "attach_world_state_buffer") {
				const writer = new WorldStateWriter(command.buffer, command.descriptor);
				writer.write({ logicalTimeMs: 25, tickIndex: 2, members: [], areas: [] });
			}
			this.port?.postMessage({
				belongToTaskId: message.belongToTaskId,
				result: { success: true, data },
				error: null,
			});
			return;
		}

		const lifecycleCommand = command as EngineLifecycleCommand;
		const failed = FakeWorker.failCommand === lifecycleCommand.type;
		const result = failed
			? engineLifecycleFailure(lifecycleCommand, { code: "fake_failure", message: `${lifecycleCommand.type} failed` })
			: lifecycleCommand.type === "CMD_FAST_FORWARD"
				? engineLifecycleSuccess(lifecycleCommand, { ticksRun: 5, elapsedMs: 100, reachedLimit: true })
				: engineLifecycleSuccess(lifecycleCommand);
		if (!failed) this.state = this.targetState(lifecycleCommand);
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

	it("两阶段附件完成后立即暴露稳定提交，并在 unload 时解除 reader", async () => {
		const client = new EngineWorkerClient("engine-world-state");
		await client.whenReady();
		await client.loadScenario(scenario);
		await client.startWorldStateProjection();

		expect(client.getWorldStateLayout()).toEqual(worldStateLayout);
		expect(client.getWorldStateReader()?.readLatest()).toMatchObject({
			commitVersion: 2,
			logicalTimeMs: 25,
			tickIndex: 2,
		});

		await client.unloadScenario();
		expect(client.getWorldStateReader()).toBeNull();
		expect(client.getWorldStateLayout()).toBeNull();
		await client.dispose();
	});
});
