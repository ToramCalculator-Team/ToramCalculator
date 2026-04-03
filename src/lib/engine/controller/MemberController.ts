import { createId } from "@paralleldrive/cuid2";
import type { IntentMessage } from "../core/MessageRouter/MessageRouter";
import type { SimulationEngine } from "../core/thread/SimulationEngine";

/**
 * 成员控制器
 * - 只负责成员意图（move/skill/target/stop/复活 等）
 * - 通过 controllerId + binding 路由到目标成员
 * - 与引擎生命周期（operatorId）解耦
 */
export class MemberController {
	public readonly controllerId: string;
	private targets: SimulationEngine[];

	constructor(
		targets: SimulationEngine | SimulationEngine[],
		controllerId?: string,
	) {
		this.targets = Array.isArray(targets) ? [...targets] : [targets];
		this.controllerId = controllerId ?? createId();
	}

	addTarget(engine: SimulationEngine): void {
		if (!this.targets.some((item) => item.id === engine.id)) {
			this.targets.push(engine);
		}
	}

	removeTarget(engineId: string): void {
		this.targets = this.targets.filter((item) => item.id !== engineId);
	}

	setTargets(engines: SimulationEngine[]): void {
		this.targets = [...engines];
	}

	getPrimaryTarget(): SimulationEngine | null {
		return this.targets[0] ?? null;
	}

	private async broadcastIntent(intent: IntentMessage): Promise<Array<{ engineId: string; success: boolean; error?: string }>> {
		return await Promise.all(
			this.targets.map(async (engine) => {
				const result = await engine.sendIntent(intent);
				return { engineId: engine.id, success: result.success, error: result.error };
			}),
		);
	}

	async bind(memberId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "绑定控制对象",
			controllerId: this.controllerId,
			data: { memberId },
		};
		return await this.broadcastIntent(intent);
	}

	async unbind() {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "解绑控制对象",
			controllerId: this.controllerId,
			data: {},
		};
		return await this.broadcastIntent(intent);
	}

	async selectTarget(targetMemberId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "切换目标",
			controllerId: this.controllerId,
			data: { targetId: targetMemberId },
		};
		return await this.broadcastIntent(intent);
	}

	async castSkill(skillId: string) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "使用技能",
			controllerId: this.controllerId,
			data: { skillId },
		};
		return await this.broadcastIntent(intent);
	}

	async move(x: number, y: number) {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "移动",
			controllerId: this.controllerId,
			data: { position: { x, y } },
		};
		return await this.broadcastIntent(intent);
	}

	async stopMove() {
		const intent: IntentMessage = {
			id: createId(),
			timestamp: Date.now(),
			type: "停止移动",
			controllerId: this.controllerId,
			data: {},
		};
		return await this.broadcastIntent(intent);
	}
}


