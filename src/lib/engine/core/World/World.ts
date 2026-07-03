import type { SimulationTickContext, WorldCheckpoint } from "../types";
import { AreaManager } from "./Area/AreaManager";
import { MemberManager } from "./MemberManager";
import { SpaceManager } from "./SpaceManager";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World {
	memberManager: MemberManager;
	spaceManager: SpaceManager;
	areaManager: AreaManager;
	constructor(renderMessageSender: ((payload: unknown) => void) | null) {
		this.memberManager = new MemberManager(renderMessageSender);
		this.spaceManager = new SpaceManager(this.memberManager);
		this.areaManager = new AreaManager(this.spaceManager, this.memberManager);
	}

	/**
	 * 每 tick 更新：成员 → 区域 → 统一执行 Intent。
	 */
	tick(tick: SimulationTickContext): void {
		// console.log(`🌍 [World] tick: ${tick.tickIndex}`);
		const members = this.memberManager.getAllMembers();
		for (const member of members) {
			member.tick(tick);
		}

		// 区域更新（AreaManager 调度三个子系统）
		this.areaManager.tick(tick);
	}

	clear(): void {
		this.memberManager.clear();
		this.areaManager.clear();
	}

	setRenderMessageSender(renderMessageSender: ((payload: unknown) => void) | null): void {
		this.memberManager.setRenderMessageSender(renderMessageSender);
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): WorldCheckpoint {
		return {
			members: this.memberManager.captureMemberCheckpoints(),
			damageAreaSystem: this.areaManager.damageAreaSystem.captureCheckpoint(),
		};
	}

	restoreCheckpoint(checkpoint: WorldCheckpoint): void {
		this.memberManager.restoreMemberCheckpoints(checkpoint.members);
		this.areaManager.damageAreaSystem.restoreCheckpoint(checkpoint.damageAreaSystem);
	}
}
