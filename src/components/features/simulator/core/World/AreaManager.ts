import type { MemberManager } from "../Member/MemberManager";
import { BuffAreaSystem } from "./BuffAreaSystem";
import { DamageAreaSystem } from "./DamageAreaSystem";
import type { SpaceManager } from "./SpaceManager";
import { TrapAreaSystem } from "./TrapAreaSystem";

/**
 * AreaManager
 * 区域实例的生命周期与规则调度
 * 作为调度壳，组合三个子系统并统一调度
 */
export class AreaManager {
	public readonly damageAreaSystem: DamageAreaSystem;
	public readonly buffAreaSystem: BuffAreaSystem;
	public readonly trapAreaSystem: TrapAreaSystem;

	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {
		this.damageAreaSystem = new DamageAreaSystem(spaceManager, memberManager);
		this.buffAreaSystem = new BuffAreaSystem(spaceManager, memberManager);
		this.trapAreaSystem = new TrapAreaSystem(spaceManager, memberManager);
	}

	/**
	 * 每帧更新区域逻辑
	 * 顺序调度三个子系统
	 */
	tick(frame: number): void {
		this.damageAreaSystem.tick(frame);
		this.trapAreaSystem.tick(frame);
		this.buffAreaSystem.tick(frame);
	}
}

