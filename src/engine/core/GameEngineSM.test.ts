import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { type EngineLifecycleCommand, GameEngineSM, projectEngineLifecycleSnapshot } from "./GameEngineSM";
import { engineLifecycleFailure, engineLifecycleSuccess } from "./thread/protocol";
import { EngineScenarioDataSchema } from "./types";

const scenario = EngineScenarioDataSchema.parse({
	scenario: {
		randomSeed: 1,
		logicHz: 60,
		primaryMemberId: "member-1",
		campA: [],
		campB: [],
	},
});

const command = <TCommand extends EngineLifecycleCommand>(value: TCommand): TCommand => value;

describe("GameEngineSM 双端协议状态图", () => {
	for (const role of ["controller", "executor"] as const) {
		it(`${role} 使用同一条成功转换路径`, () => {
			const actor = createActor(GameEngineSM, { input: { role } });
			actor.start();

			const init = command({
				type: "CMD_INIT",
				sourceSide: "controller",
				correlationId: `${role}:init`,
				data: scenario,
			});
			actor.send(init);
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("initializing");
			actor.send(engineLifecycleSuccess(init));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("ready");

			const start = command({
				type: "CMD_START",
				sourceSide: "controller",
				correlationId: `${role}:start`,
			});
			actor.send(start);
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("starting");
			actor.send(engineLifecycleSuccess(start));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("running");

			const pause = command({
				type: "CMD_PAUSE",
				sourceSide: "controller",
				correlationId: `${role}:pause`,
			});
			actor.send(pause);
			actor.send(engineLifecycleSuccess(pause));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("paused");

			const step = command({
				type: "CMD_STEP",
				sourceSide: "controller",
				correlationId: `${role}:step`,
			});
			actor.send(step);
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("stepping");
			actor.send(engineLifecycleSuccess(step));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("paused");

			const resume = command({
				type: "CMD_RESUME",
				sourceSide: "controller",
				correlationId: `${role}:resume`,
			});
			actor.send(resume);
			actor.send(engineLifecycleSuccess(resume));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("running");

			const stop = command({
				type: "CMD_STOP",
				sourceSide: "controller",
				correlationId: `${role}:stop`,
			});
			actor.send(stop);
			actor.send(engineLifecycleSuccess(stop));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("ready");

			const advance = command({
				type: "CMD_FAST_FORWARD",
				sourceSide: "controller",
				correlationId: `${role}:advance`,
				options: { maxTicks: 10 },
			});
			actor.send(advance);
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("advancing");
			actor.send(engineLifecycleSuccess(advance, { ticksRun: 10, elapsedMs: 100, reachedLimit: true }));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot())).toMatchObject({
				state: "ready",
				confirmedState: "ready",
				pending: null,
			});

			const unload = command({
				type: "CMD_UNLOAD",
				sourceSide: "controller",
				correlationId: `${role}:unload`,
			});
			actor.send(unload);
			actor.send(engineLifecycleSuccess(unload));
			expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("idle");
			actor.stop();
		});
	}

	it("失败回到来源稳定状态，错误 correlationId 不提交", () => {
		const actor = createActor(GameEngineSM, { input: { role: "controller" } });
		actor.start();
		const init = command({
			type: "CMD_INIT",
			sourceSide: "controller",
			correlationId: "init",
			data: scenario,
		});
		actor.send(init);
		actor.send(engineLifecycleSuccess(init));

		const start = command({ type: "CMD_START", sourceSide: "controller", correlationId: "start" });
		actor.send(start);
		actor.send(engineLifecycleFailure(start, "start failed"));
		expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("ready");

		const reset = command({ type: "CMD_RESET", sourceSide: "controller", correlationId: "reset" });
		actor.send(reset);
		actor.send({
			type: "RESULT_RESET",
			sourceSide: "executor",
			correlationId: "other-reset",
			success: true,
		});
		expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("resetting");
		actor.send(engineLifecycleFailure(reset, "reset failed"));
		expect(projectEngineLifecycleSnapshot(actor.getSnapshot()).state).toBe("ready");
		actor.stop();
	});

	it("非法命令不建立 pending 状态", () => {
		const actor = createActor(GameEngineSM, { input: { role: "executor" } });
		actor.start();
		actor.send({ type: "CMD_START", sourceSide: "controller", correlationId: "invalid-start" });
		expect(projectEngineLifecycleSnapshot(actor.getSnapshot())).toEqual({
			state: "idle",
			confirmedState: "idle",
			pending: null,
		});
		actor.stop();
	});
});
