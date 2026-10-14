import { Random } from "~/lib/random";
import { createPhysicalTerrainGenerator, type TerrainDefinition } from "~/lib/terrain";
import type { SimulationTickContext, WorldCheckpoint } from "../types";
import { AreaManager } from "./Area/AreaManager";
import { DamageSystem, type InstantDamageScheduler } from "./Damage/DamageSystem";
import { FsmMessageQueue } from "./FsmMessageQueue/MessageQueue";
import type { MemberMovementInput } from "./Member/runtime/SharedRuntime";
import { MemberManager } from "./MemberManager";
import { SpaceManager } from "./SpaceManager";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World {
	/** 确定性随机数生成器（seeded xorshift128），可 checkpoint */
	random: Random;

	/** 事件队列 - 管理时间片段事件 */
	private fsmMessageQueue: FsmMessageQueue;

	memberManager: MemberManager;

	spaceManager: SpaceManager;

	areaManager: AreaManager;

	damageSystem: DamageSystem;

	private sampleTerrainHeight: (x: number, z: number) => number = () => 0;

	constructor() {
		this.random = new Random();
		this.fsmMessageQueue = new FsmMessageQueue();
		this.memberManager = new MemberManager();
		this.spaceManager = new SpaceManager(this.memberManager);
		this.damageSystem = new DamageSystem(this.spaceManager, this.memberManager);
		this.areaManager = new AreaManager(this.spaceManager, this.memberManager);
	}

	/** 场景加载时设置唯一地形定义；点采样保持同步，不能依赖渲染区块是否就绪。 */
	setTerrainDefinition(definition: TerrainDefinition): void {
		this.sampleTerrainHeight = createPhysicalTerrainGenerator(definition).sampleHeight;
	}

	projectToGround(position: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
		return { x: position.x, y: this.sampleTerrainHeight(position.x, position.z), z: position.z };
	}

	/**
	 * 每 Tick 更新：成员 → 瞬时伤害同步结算点 → 持续区域。
	 */
	tick(
		tick: SimulationTickContext,
		movementInputs: ReadonlyMap<string, MemberMovementInput> | undefined,
		instantDamageScheduler: InstantDamageScheduler,
	): void {
		// console.log(`🌍 [World] tick: ${tick.tickIndex}`);
		const members = this.memberManager.getAllMembers();
		for (const member of members) {
			member.tick(tick, movementInputs?.get(member.id) ?? null);
			member.integrateTerrainHeight(this.sampleTerrainHeight(member.position.x, member.position.z), tick);
		}

		this.damageSystem.flushInstantDamage(instantDamageScheduler);

		// 区域更新（AreaManager 调度三个子系统）
		this.areaManager.tick(tick);
	}

	clear(): void {
		this.memberManager.clear();
		this.damageSystem.clear();
		this.areaManager.clear();
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
