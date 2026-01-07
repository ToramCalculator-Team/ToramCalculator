import type { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import { createId } from "@paralleldrive/cuid2";
import { createActor, waitFor } from "xstate";
import { type EngineControlMessage, GameEngineSM } from "../core/GameEngineSM";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";

/**
 * 引擎生命周期控制器
 * - 只负责引擎生命周期（INIT/START/PAUSE/RESUME/STOP/RESET/STEP）
 * - 使用 operatorId 做权限控制（host）
 * - 与成员控制器（controllerId/binding）解耦
 */
export class EngineLifecycleController {
	public readonly engineActor: ReturnType<typeof createActor<typeof GameEngineSM>>;
	public readonly operatorId: string;

	private seqCounter = 0;

	constructor() {
		this.operatorId = createId();

		this.engineActor = createActor(GameEngineSM, {
			input: {
				role: "controller",
				threadName: "main",
				peer: {
					send: (msg: EngineControlMessage) => {
						realtimeSimulatorPool
							.executeTask("engine_command", msg, "high")
							.catch((error) => {
								console.error("EngineLifecycleController: 发送引擎命令失败:", error);
							});
					},
				},
				engine: undefined,
				controller: undefined,
				nextSeq: () => ++this.seqCounter,
				newCorrelationId: () => createId(),
			},
		});

		this.engineActor.start();
	}

	private createCommand(
		type: "CMD_START" | "CMD_STOP" | "CMD_PAUSE" | "CMD_RESUME" | "CMD_RESET" | "CMD_STEP",
	): EngineControlMessage {
		const context = this.engineActor.getSnapshot().context;
		return {
			type,
			sourceSide: "controller" as const,
			seq: context.nextSeq(),
			correlationId: context.newCorrelationId(),
			operatorId: this.operatorId,
		} as EngineControlMessage;
	}

	async initialize(simulatorData: SimulatorWithRelations): Promise<void> {
		const context = this.engineActor.getSnapshot().context;
		this.engineActor.send({
			type: "CMD_INIT",
			data: simulatorData,
			sourceSide: "controller",
			seq: context.nextSeq(),
			correlationId: context.newCorrelationId(),
			operatorId: this.operatorId,
		});

		await waitFor(this.engineActor, (state) => state.matches("ready"), {
			timeout: 5000,
		});
	}

	start() {
		this.engineActor.send(this.createCommand("CMD_START"));
	}
	stop() {
		this.engineActor.send(this.createCommand("CMD_STOP"));
	}
	pause() {
		this.engineActor.send(this.createCommand("CMD_PAUSE"));
	}
	resume() {
		this.engineActor.send(this.createCommand("CMD_RESUME"));
	}
	reset() {
		this.engineActor.send(this.createCommand("CMD_RESET"));
	}
	step() {
		this.engineActor.send(this.createCommand("CMD_STEP"));
	}

	destroy() {
		this.engineActor.stop();
	}
}


