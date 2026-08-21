/**
 * 实时世界内容处理器（内容编排关注点）。
 *
 * 静态视觉资源只在 Session 初始化时注册；实体和区域运行状态来自实时状态 SAB。
 */

import {
	type WorldStateArea,
	WorldStateAreaShapeKind,
	WorldStateDamageRangeKind,
	type WorldStateLayoutDescriptor,
	type WorldStateSnapshot,
	worldStateStringId,
} from "~/engine/core/thread/worldStateBuffer";
import { evalTrajectory, type TrajectoryAnchors, trajectoryDurationMs } from "~/engine/core/World/EffectRange/trajectory";
import { createLogger } from "~/lib/logger";
import type { Scene } from "~/platform/render/babylon/runtime";
import {
	type AbstractMesh,
	Color3,
	Mesh,
	MeshBuilder,
	StandardMaterial,
	TransformNode,
	Vector3,
} from "~/platform/render/babylon/runtime";
import type { WorldResourcePose } from "../contracts/worldContent";
import type { StateAnimationEntry, WorldResource } from "../contracts/worldResource";
import { VisualProfileRegistry } from "../resources/visualProfileRegistry";
import type { EntityFactory } from "./EntityFactory";
import type { EntityRuntime } from "./entityTypes";
import { canReuseWorldResource } from "./worldResourceDiff";

const logger = createLogger("RenderController");
logger.setLevel(0);

/** 伤害区域统一离开逻辑地面，避免透明圆盘与地形共面产生深度冲突。 */
const AREA_VISUAL_GROUND_OFFSET_METERS = 0.1;

type AreaVisual = {
	meshes: AbstractMesh[];
	dynamicMesh?: Mesh;
};

export class CommandHandler {
	private entities: Map<string, EntityRuntime>;
	private factory: EntityFactory;
	private scene: Scene;
	private worldResources: Map<string, WorldResource>;
	private areaVisuals: Map<string, AreaVisual> = new Map();
	private readonly visualProfiles = new VisualProfileRegistry();
	private readonly stateTimelines = new Map<string, string>();
	private readonly stateAnimationMappings = new Map<
		string,
		Map<number, { name: string; entry: StateAnimationEntry }>
	>();
	private readonly entityCreations = new Map<string, Promise<void>>();

	constructor(entities: Map<string, EntityRuntime>, factory: EntityFactory, scene: Scene) {
		this.entities = entities;
		this.factory = factory;
		this.scene = scene;
		this.worldResources = new Map();
	}

	/**
	 * 投影同一解析版本的静态资源；进入验证后实体运行状态只从统一 SAB 更新。
	 */
	async applyWorldResources(
		resources: WorldResource[],
		poses: WorldResourcePose[],
		contentMode: "static" | "realtime",
	): Promise<void> {
		this.visualProfiles.clear();
		this.visualProfiles.register(resources);
		const nextResources = new Map(resources.map((resource) => [resource.memberId, resource]));
		if (nextResources.size !== resources.length) throw new Error("worldResources 中存在重复 memberId");

		for (const memberId of [...this.entities.keys()]) {
			const previous = this.worldResources.get(memberId);
			const next = nextResources.get(memberId);
			if (!previous || !next || !canReuseWorldResource(previous, next)) this.disposeEntity(memberId);
		}
		this.worldResources = nextResources;
		this.rebuildStateAnimationMappings();
		if (contentMode === "realtime") return;
		const posesByMemberId = new Map(poses.map((pose) => [pose.memberId, pose]));
		for (const resource of resources) {
			const pose = posesByMemberId.get(resource.memberId);
			await this.createEntity(resource.memberId, pose?.position ?? { x: 0, y: 0, z: 0 }, -1);
			const entity = this.entities.get(resource.memberId);
			if (entity && pose) entity.physics.yaw = pose.yaw;
		}
	}

	/** 由实时状态目录发现新活动槽位时，按同一静态注册表创建实体。 */
	async ensureEntityFromVisualProfile(
		entityId: string,
		visualProfileId: number,
		position: WorldResourcePose["position"],
		seq: number,
	): Promise<void> {
		if (this.entities.has(entityId)) return;
		const pending = this.entityCreations.get(entityId);
		if (pending) return pending;
		const profile = this.visualProfiles.resolve(visualProfileId);
		if (!profile) return;
		const resource = { ...profile.resource, memberId: entityId };
		this.worldResources.set(entityId, resource);
		this.rebuildStateAnimationMappings();
		const creation = this.createEntity(entityId, position, seq)
			.then(() => {
				if (!this.worldResources.has(entityId)) this.disposeEntity(entityId);
			})
			.finally(() => this.entityCreations.delete(entityId));
		this.entityCreations.set(entityId, creation);
		await creation;
	}

	/** 以一个 SAB 提交同步全部区域，过期槽位立即清理。 */
	syncAreas(
		snapshot: WorldStateSnapshot,
		renderLogicalTimeMs: number,
		sampledMemberPositions: ReadonlyArray<{ x: number; y: number; z: number } | null>,
	): void {
		const activeIds = new Set<string>();
		for (const [slot, area] of snapshot.areas.entries()) {
			if (!area.active) continue;
			const id = `area:${slot}:${area.generation}:${area.idHash}`;
			activeIds.add(id);
			const sourcePos = sampledMemberPositions[area.sourceMemberIndex] ?? { x: 0, y: 0, z: 0 };
			const targetPos = sampledMemberPositions[area.targetMemberIndex] ?? sourcePos;
			const anchors = { source: sourcePos, target: targetPos };
			const position = area.trajectory
				? evalTrajectory(area.trajectory, Math.max(0, renderLogicalTimeMs - area.spawnTimeMs), anchors)
				: area.position;
			if (area.rangeKind === WorldStateDamageRangeKind.SINGLE) continue;
			this.createOrUpdateAreaVisual({
				id,
				position,
				area,
				anchors,
			});
		}
		for (const [id, visual] of this.areaVisuals) {
			if (activeIds.has(id)) continue;
			this.disposeAreaVisual(visual);
			this.areaVisuals.delete(id);
		}
	}

	/** 从统一 SAB 描述重建成员状态表现；进度由逻辑时间差和本地静态资源计算。 */
	syncMemberStates(
		snapshot: WorldStateSnapshot,
		layout: WorldStateLayoutDescriptor,
		entitySlots: ReadonlyMap<string, number>,
		renderLogicalTimeMs: number,
	): void {
		const entityIdsBySlot = new Map(Array.from(entitySlots, ([entityId, slot]) => [slot, entityId]));
		snapshot.members.forEach((member, slot) => {
			const entityId = entityIdsBySlot.get(slot);
			if (!entityId) return;
			const memberLayout = layout.memberDirectory[slot];
			const entity = memberLayout ? this.entities.get(entityId) : undefined;
			if (!member.active || member.state.id === 0) {
				if (this.stateTimelines.delete(entityId) && entity?.type === "character") {
					entity.animationController.stopAllAnimations();
				}
				return;
			}
			const resource = memberLayout ? this.worldResources.get(entityId) : undefined;
			if (!memberLayout || !entity || entity.type !== "character" || resource?.kind !== "character") return;
			const mapping = this.stateAnimationMappings.get(entityId)?.get(member.state.id);
			if (!mapping) {
				if (this.stateTimelines.delete(entityId)) entity.animationController.stopAllAnimations();
				return;
			}
			const timelineVersion = `${member.generation}:${member.state.id}:${member.state.instance}`;
			if (mapping.name === "idle") {
				if (this.stateTimelines.delete(entityId)) entity.animationController.stopAllAnimations();
				return;
			}
			const progress = Math.max(
				0,
				(renderLogicalTimeMs - member.state.startedAtLogicalTimeMs) / mapping.entry.durationMs,
			);
			if (this.stateTimelines.get(entityId) !== timelineVersion) {
				this.stateTimelines.set(entityId, timelineVersion);
				entity.animationController.playStateTimeline(mapping.entry, progress);
			} else {
				entity.animationController.updateStateTimelineProgress(progress);
			}
		});
	}

	/** 在静态资源版本落地时建立 stateId 到动画资源的反向索引。 */
	private rebuildStateAnimationMappings(): void {
		this.stateAnimationMappings.clear();
		for (const [memberId, resource] of this.worldResources) {
			if (resource.kind !== "character") continue;
			const byStateId = new Map<number, { name: string; entry: StateAnimationEntry }>();
			for (const [name, entry] of Object.entries(resource.animation.states)) {
				const stateId = worldStateStringId(name);
				const previous = byStateId.get(stateId);
				if (previous && previous.name !== name) {
					throw new Error(`状态名 hash 冲突: ${previous.name} / ${name}`);
				}
				byStateId.set(stateId, { name, entry });
			}
			this.stateAnimationMappings.set(memberId, byStateId);
		}
	}

	/** 由实时成员目录确认槽位失活或代次变化时删除实体。 */
	removeEntity(entityId: string): void {
		this.disposeEntity(entityId);
		this.worldResources.delete(entityId);
	}

	private createOrUpdateAreaVisual(area: {
		id: string;
		position: { x: number; y: number; z: number };
		area: WorldStateArea;
		anchors: TrajectoryAnchors;
	}): void {
		let visual = this.areaVisuals.get(area.id);
		if (!visual) {
			visual = this.createAreaVisual(area.id, area.area, area.anchors);
			this.areaVisuals.set(area.id, visual);
		}
		const mesh = visual.dynamicMesh;
		if (!mesh) return;
		mesh.position.set(area.position.x, area.position.y + AREA_VISUAL_GROUND_OFFSET_METERS, area.position.z);
		mesh.rotation.y = area.area.yaw;
	}

	/** 一个逻辑 Area 可以投影为多个图元，但这些图元共享同一创建和销毁生命周期。 */
	private createAreaVisual(id: string, area: WorldStateArea, anchors: TrajectoryAnchors): AreaVisual {
		const meshes: AbstractMesh[] = [];
		let dynamicMesh: Mesh | undefined;
		if (area.rangeKind === WorldStateDamageRangeKind.MOVE_ATTACK) {
			const path = this.createTrajectoryRectangle(id, area);
			if (path) meshes.push(path);
			dynamicMesh = this.createShapeMesh(`${id}:range`, area);
		} else if (area.rangeKind === WorldStateDamageRangeKind.GROUND) {
			const path = this.createTrajectoryLine(id, area, anchors);
			if (path) meshes.push(path);
			dynamicMesh = this.createShapeMesh(`${id}:range`, area);
		} else {
			dynamicMesh = this.createShapeMesh(`${id}:range`, area);
		}
		if (dynamicMesh) meshes.push(dynamicMesh);
		return { meshes, dynamicMesh };
	}

	private createShapeMesh(id: string, area: WorldStateArea): Mesh | undefined {
		let mesh: Mesh;
		if (area.shape.kind === WorldStateAreaShapeKind.RECTANGLE) {
			mesh = MeshBuilder.CreateGround(
				id,
				{ width: Math.max(0.1, area.shape.width), height: Math.max(0.1, area.shape.height) },
				this.scene,
			);
		} else if (area.shape.kind === WorldStateAreaShapeKind.CIRCLE) {
			mesh = MeshBuilder.CreateDisc(id, { radius: Math.max(0.1, area.shape.radius), tessellation: 32 }, this.scene);
			mesh.rotation.x = Math.PI / 2;
		} else {
			return undefined;
		}
		mesh.material = this.createAreaMaterial(`${id}:material`, new Color3(1, 0.2, 0.2), 0.35);
		return mesh;
	}

	private createTrajectoryRectangle(id: string, area: WorldStateArea): Mesh | undefined {
		const endpoints = this.getLinearTrajectoryEndpoints(area);
		if (!endpoints) return undefined;
		const dx = endpoints.to.x - endpoints.from.x;
		const dz = endpoints.to.z - endpoints.from.z;
		const length = Math.hypot(dx, dz);
		if (length <= 0) return undefined;
		const width = Math.max(0.1, area.shape.radius * 2 || area.shape.width);
		const mesh = MeshBuilder.CreateGround(`${id}:trajectory`, { width, height: length }, this.scene);
		mesh.position.set(
			(endpoints.from.x + endpoints.to.x) / 2,
			(endpoints.from.y + endpoints.to.y) / 2 + AREA_VISUAL_GROUND_OFFSET_METERS,
			(endpoints.from.z + endpoints.to.z) / 2,
		);
		mesh.rotation.y = Math.atan2(dx, dz);
		mesh.material = this.createAreaMaterial(`${id}:trajectory:material`, new Color3(1, 0.55, 0.1), 0.22);
		return mesh;
	}

	private createTrajectoryLine(id: string, area: WorldStateArea, anchors: TrajectoryAnchors): AbstractMesh | undefined {
		const trajectory = area.trajectory;
		if (!trajectory) return undefined;
		const durationMs = trajectoryDurationMs(trajectory);
		if (durationMs == null || durationMs <= 0) return undefined;
		const points = Array.from({ length: 33 }, (_, index) => {
			const point = evalTrajectory(trajectory, (durationMs * index) / 32, anchors);
			return new Vector3(point.x, point.y + AREA_VISUAL_GROUND_OFFSET_METERS, point.z);
		});
		const line = MeshBuilder.CreateLines(`${id}:trajectory`, { points }, this.scene);
		line.color = new Color3(1, 0.55, 0.1);
		line.alpha = 0.75;
		return line;
	}

	private getLinearTrajectoryEndpoints(
		area: WorldStateArea,
	): { from: WorldStateArea["position"]; to: WorldStateArea["position"] } | null {
		const trajectory = area.trajectory;
		if (!trajectory) return null;
		if (trajectory.kind === "segment") return { from: trajectory.from, to: trajectory.to };
		if (trajectory.kind === "ray") {
			return {
				from: trajectory.from,
				to: {
					x: trajectory.from.x + trajectory.dir.x * trajectory.maxDistance,
					y: trajectory.from.y + trajectory.dir.y * trajectory.maxDistance,
					z: trajectory.from.z + trajectory.dir.z * trajectory.maxDistance,
				},
			};
		}
		return null;
	}

	private createAreaMaterial(id: string, color: Color3, alpha: number): StandardMaterial {
		const material = new StandardMaterial(id, this.scene);
		material.alpha = alpha;
		material.diffuseColor = color;
		material.backFaceCulling = false;
		return material;
	}

	private disposeAreaVisual(visual: AreaVisual): void {
		for (const mesh of visual.meshes) mesh.dispose(false, true);
	}

	disposeAreaVisuals(): void {
		for (const visual of this.areaVisuals.values()) this.disposeAreaVisual(visual);
		this.areaVisuals.clear();
	}

	/** 清空当前世界投影；模型模板缓存由 EntityFactory 保留，供后续内容会话复用。 */
	clearWorldResources(): void {
		for (const memberId of [...this.entities.keys()]) this.disposeEntity(memberId);
		this.worldResources.clear();
		this.visualProfiles.clear();
		this.stateTimelines.clear();
		this.stateAnimationMappings.clear();
		this.entityCreations.clear();
	}

	/** 按静态注册表创建实体；运行状态只由 SAB 提供。 */
	private async createEntity(
		entityId: string,
		position: { x: number; y: number; z: number },
		seq: number,
	): Promise<void> {
		const resource = this.worldResources.get(entityId);
		if (!resource) throw new Error(`实体 ${entityId} 没有已解析的静态视觉资源`);

		const exists = this.entities.get(entityId);
		if (exists && exists.lastSeq > seq) {
			logger.info(`跳过旧提交的实体创建: ${entityId}`);
			return;
		}

		if (exists) {
			exists.lastSeq = seq;
			exists.physics.pos.copyFromFloats(position.x, position.y, position.z);
			exists.mesh.position.copyFrom(exists.physics.pos);
			return;
		}

		const pos = new Vector3(position.x, position.y, position.z);

		if (resource.kind === "mob") {
			const entity = this.factory.createSphere(entityId, resource.displayName, pos, resource.appearance);
			entity.lastSeq = seq;
			this.entities.set(entityId, entity);
			logger.info(`Mob 静态资源创建成功: ${entityId}`);
			return;
		}

		logger.info(`开始创建角色: ${entityId}`);
		const entity = await this.factory.createCharacter(entityId, resource.displayName, pos, resource);
		entity.lastSeq = seq;
		this.entities.set(entityId, entity);
		logger.info(`角色创建成功: ${entityId}`);
	}

	/**
	 * 销毁实体并清理所有相关资源
	 * 包括动画组、网格、标签和纹理
	 */
	private disposeEntity(id: string): void {
		const entity = this.entities.get(id);
		if (!entity) return;
		this.stateTimelines.delete(id);

		logger.info(`🗑️ 开始清理实体: ${id}`);

		// 清理动画和动画组
		if (entity.type === "character") {
			entity.animationController.stopAllAnimations();

			// 清理动画组
			entity.builtinAnimations.forEach((group) => {
				group.dispose();
			});
			entity.customAnimations.forEach((group) => {
				group.dispose();
			});
			entity.builtinAnimations.clear();
			entity.customAnimations.clear();
			entity.ownedSkeletons.forEach((skeleton) => {
				skeleton.dispose();
			});
			entity.ownedSkeletons.length = 0;
		}

		// 标签材质独占动态纹理，先于实体父节点释放，避免递归销毁后丢失纹理所有权。
		entity.label?.dispose(false, true);

		// 清理网格
		if (entity.mesh instanceof Mesh) {
			entity.mesh.dispose(false, true);
		} else if (entity.mesh instanceof TransformNode) {
			entity.mesh.dispose();
		}

		// 从实体映射中移除
		this.entities.delete(id);

		logger.info(`✅ 实体清理完成: ${id}`);
	}
}
