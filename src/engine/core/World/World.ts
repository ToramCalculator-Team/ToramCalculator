import { DamageSystem } from "~/game/toramOnline/service/Damage/DamageSystem";
import { Random } from "~/lib/random";
import { createPhysicalTerrainGenerator, type TerrainDefinition } from "~/lib/terrain";
import type { Checkpointable } from "../Checkpoint";
import { EventBus } from "../EventBus/EventBus";
import { JSProcessor } from "../JSProcessor/JSProcessor";
import { MessageQueue } from "../MessageQueue/MessageQueue";
import { PipelineService } from "../Pipeline/PipelineService";
import { STANDARD_PIPELINES } from "../Pipeline/standard";
import type { SimulationTickContext } from "../types";
import { AreaManager } from "./Entity/Area/AreaManager";
import { MemberManager } from "./MemberManager";
import { SpaceManager } from "./SpaceManager";
import type { WorldCheckpoint, WorldScenarioData } from "./types";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World implements Checkpointable<WorldCheckpoint> {
	random: Random; // 确定性随机数生成器（seeded xorshift128），可 checkpoint

	private MessageQueue: MessageQueue; // FSM消息队列
	private eventBus: EventBus;

	// 基础设施（跨场景复用）
	private jsProcessor: JSProcessor; // JS编译和执行器
	private pipelineService: PipelineService; // 计算管线服务

	memberManager: MemberManager;

	spaceManager: SpaceManager;

	areaManager: AreaManager;

	damageSystem: DamageSystem;

	private sampleTerrainHeight: (x: number, z: number) => number = () => 0;

	constructor(stepMs: number, outboundPrefixes: string[]) {
		this.random = new Random();
		this.jsProcessor = new JSProcessor();
		this.pipelineService = new PipelineService(STANDARD_PIPELINES);
		this.MessageQueue = new MessageQueue();
		this.eventBus = new EventBus(outboundPrefixes);
		this.memberManager = new MemberManager();
		this.spaceManager = new SpaceManager(this.memberManager);
		this.damageSystem = new DamageSystem(this.spaceManager, this.memberManager);
		this.areaManager = new AreaManager(this.spaceManager, this.memberManager);
	}

	loadScenario(data: WorldScenarioData): void {}

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
	tick(tick: SimulationTickContext, commons: unknown[]): void {}

	clear(): void {
		this.memberManager.clear();
		this.damageSystem.clear();
		this.areaManager.clear();
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): WorldCheckpoint {
		return {};
	}

	restoreCheckpoint(checkpoint: WorldCheckpoint): void {}
}
