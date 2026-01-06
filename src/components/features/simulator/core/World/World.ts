import { MemberManager } from "../Member/MemberManager";
import { AreaManager } from "./AreaManager";
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
	 * 每帧 tick：成员 → 区域 → 统一执行 Intent
	 */
	tick(frame: number): void {
		// console.log(`🌍 [World] tick: ${frame}`);
		const members = this.memberManager.getAllMembers();
		for (const member of members) {
			member.tick(frame);
		}

		// 区域更新（AreaManager 调度三个子系统）
		this.areaManager.tick(frame);
	}

	clear(): void {
		this.memberManager.clear();
		this.areaManager.clear();
	}
}
