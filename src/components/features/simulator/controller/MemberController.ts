import { createId } from "@paralleldrive/cuid2";
import type { IntentMessage } from "../core/MessageRouter/MessageRouter";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";

/**
 * 成员控制器
 * - 只负责成员意图（move/skill/target/stop/复活 等）
 * - 通过 controllerId + binding 路由到目标成员
 * - 与引擎生命周期（operatorId）解耦
 */
export class MemberController {
	public readonly controllerId: string;

	constructor(controllerId?: string) {
		this.controllerId = controllerId ?? createId();
	}

	async bind(memberId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "绑定控制对象",
			controllerId: this.controllerId,
			data: { memberId },
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}

	async unbind() {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "解绑控制对象",
			controllerId: this.controllerId,
			data: {},
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}

	async selectTarget(targetMemberId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "切换目标",
			controllerId: this.controllerId,
			data: { targetId: targetMemberId },
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}

	async castSkill(skillId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "使用技能",
			controllerId: this.controllerId,
			data: { skillId },
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}

	async move(x: number, y: number) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "移动",
			controllerId: this.controllerId,
			data: { position: { x, y } },
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}

	async stopMove() {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "停止移动",
			controllerId: this.controllerId,
			data: {},
		};
		await realtimeSimulatorPool.sendIntent(intent);
	}
}


