/**
 * 实时世界内容处理器（内容编排关注点）。
 *
 * 静态视觉资源只在 Session 初始化时注册；实体和区域运行状态来自实时状态 SAB。
 */

import {
	WorldStateAreaShapeKind,
	type WorldStateLayoutDescriptor,
	type WorldStateSnapshot,
	worldStateStringId,
} from "~/engine/core/thread/worldStateBuffer";
import { evalTrajectory } from "~/engine/core/World/Area/trajectory";
import { createLogger } from "~/lib/logger";
import type { Scene } from "~/platform/render/babylon/runtime";
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "~/platform/render/babylon/runtime";
import type { WorldResourcePose } from "../contracts/worldContent";
import type { StateAnimationEntry, WorldResource } from "../contracts/worldResource";
import { VisualProfileRegistry } from "../resources/visualProfileRegistry";
import type { EntityFactory } from "./EntityFactory";
import type { EntityRuntime } from "./entityTypes";
import { canReuseWorldResource } from "./worldResourceDiff";

const logger = createLogger("RenderController");
logger.setLevel(0);

export class CommandHandler {
	private entities: Map<string, EntityRuntime>;
	private factory: EntityFactory;
	private scene: Scene;
	private worldResources: Map<string, WorldResource>;
	private areaVisuals: Map<string, Mesh> = new Map();
	private readonly visualProfiles = new VisualProfileRegistry();
	private readonly stateTimelines = new Map<string, string>();
	private readonly stateAnimationMappings = new Map<
		string,
		Map<number, { name: string; entry: StateAnimationEntry }>
	>();
	private readonly entityCreations = new Map<string, Promise<void>>();

	constructor(
		entities: Map<string, EntityRuntime>,
		factory: EntityFactory,
		scene: Scene,
		private readonly lifecycle: {
			onPoseDiscontinuity: (entityId: string) => void;
			onEntityRemoved: (entityId: string) => void;
		},
	) {
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
	syncAreas(snapshot: WorldStateSnapshot): void {
		const activeIds = new Set<string>();
		for (const [slot, area] of snapshot.areas.entries()) {
			if (!area.active) continue;
			const id = `area:${slot}:${area.generation}:${area.idHash}`;
			activeIds.add(id);
			const sourcePos = snapshot.members[area.sourceMemberIndex]?.position ?? { x: 0, y: 0, z: 0 };
			const targetPos = snapshot.members[area.targetMemberIndex]?.position ?? sourcePos;
			const position = evalTrajectory(area.trajectory, Math.max(0, snapshot.logicalTimeMs - area.spawnTimeMs), {
				source: sourcePos,
				target: targetPos,
			});
			this.createOrUpdateAreaVisual({
				id,
				position,
				shape: area.shape,
			});
		}
		for (const [id, mesh] of this.areaVisuals) {
			if (activeIds.has(id)) continue;
			mesh.dispose();
			this.areaVisuals.delete(id);
		}
	}

	/** 从统一 SAB 描述重建成员状态表现；进度由逻辑时间差和本地静态资源计算。 */
	syncMemberStates(
		snapshot: WorldStateSnapshot,
		layout: WorldStateLayoutDescriptor,
		entitySlots: ReadonlyMap<string, number>,
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
				(snapshot.logicalTimeMs - member.state.startedAtLogicalTimeMs) / mapping.entry.durationMs,
			);
			if (this.stateTimelines.get(entityId) !== timelineVersion) {
				this.stateTimelines.set(entityId, timelineVersion);
				entity.animationController.playStateTimeline(mapping.entry.clip, progress, mapping.entry.play);
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
		shape: { kind: number; radius: number; width: number; height: number };
	}): void {
		const radius = area.shape.kind === WorldStateAreaShapeKind.POINT ? 0.18 : Math.max(0.1, area.shape.radius);
		let mesh = this.areaVisuals.get(area.id);
		if (!mesh) {
			mesh = MeshBuilder.CreateDisc(`area:${area.id}`, { radius, tessellation: 32 }, this.scene);
			mesh.rotation.x = Math.PI / 2;
			(mesh as Mesh & { __baseRadius?: number }).__baseRadius = radius;
			const mat = new StandardMaterial(`areaMat:${area.id}`, this.scene);
			mat.alpha = 0.35;
			mat.diffuseColor = new Color3(1, 0.2, 0.2);
			mat.backFaceCulling = false;
			mesh.material = mat;
			this.areaVisuals.set(area.id, mesh);
		}
		mesh.position.set(area.position.x, area.position.y, area.position.z);
		const base = (mesh as Mesh & { __baseRadius?: number }).__baseRadius ?? radius;
		const scale = radius / base;
		mesh.scaling.x = scale;
		mesh.scaling.y = 1;
		mesh.scaling.z = scale;
	}

	disposeAreaVisuals(): void {
		for (const mesh of this.areaVisuals.values()) {
			mesh.dispose();
		}
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
			this.lifecycle.onPoseDiscontinuity(entityId);
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
		this.lifecycle.onEntityRemoved(id);

		logger.info(`✅ 实体清理完成: ${id}`);
	}
}
