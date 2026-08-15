/**
 * 实时世界内容处理器（内容编排关注点）。
 *
 * 静态视觉资源只在 Session 初始化时注册；实体和区域运行状态来自实时状态 SAB。
 */

import {
	type WorldStateArea,
	WorldStateAreaShapeKind,
	type WorldStateLayoutDescriptor,
	type WorldStateReader,
	type WorldStateSnapshot,
	worldStateStringId,
} from "~/engine/core/thread/worldStateBuffer";
import { createLogger } from "~/lib/logger";
import type { Scene } from "~/platform/render/babylon/runtime";
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "~/platform/render/babylon/runtime";
import type { WorldResourcePose } from "../contracts/worldContent";
import type { WorldResource } from "../contracts/worldResource";
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
	private readonly animationTimelines = new Map<string, string>();
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
		const creation = this.createEntity(entityId, position, seq)
			.then(() => {
				if (!this.worldResources.has(entityId)) this.disposeEntity(entityId);
			})
			.finally(() => this.entityCreations.delete(entityId));
		this.entityCreations.set(entityId, creation);
		await creation;
	}

	/** 以一个 SAB 提交同步全部区域，过期槽位立即清理。 */
	syncAreas(areas: readonly WorldStateArea[]): void {
		const activeIds = new Set<string>();
		for (const [slot, area] of areas.entries()) {
			if (!area.active) continue;
			const id = `area:${slot}:${area.generation}:${area.idHash}`;
			activeIds.add(id);
			this.createOrUpdateAreaVisual({
				id,
				position: area.position,
				shape: area.shape,
			});
		}
		for (const [id, mesh] of this.areaVisuals) {
			if (activeIds.has(id)) continue;
			mesh.dispose();
			this.areaVisuals.delete(id);
		}
	}

	/** 从任意稳定提交重建当前动画基线，后续帧交给 Babylon 本地时钟推进。 */
	syncMemberAnimations(
		snapshot: WorldStateSnapshot,
		layout: WorldStateLayoutDescriptor,
		reader: WorldStateReader,
		entitySlots: ReadonlyMap<string, number>,
	): void {
		const entityIdsBySlot = new Map(Array.from(entitySlots, ([entityId, slot]) => [slot, entityId]));
		snapshot.members.forEach((member, slot) => {
			const entityId = entityIdsBySlot.get(slot);
			if (!entityId) return;
			if (!member.active || member.animation.id === 0 || member.animation.ended) {
				this.animationTimelines.delete(entityId);
				return;
			}
			const memberLayout = layout.memberDirectory[slot];
			const entity = memberLayout ? this.entities.get(entityId) : undefined;
			const resource = memberLayout ? this.worldResources.get(entityId) : undefined;
			if (!memberLayout || !entity || entity.type !== "character" || resource?.kind !== "character") return;
			const timelineVersion = `${member.generation}:${member.animation.id}:${member.animation.logicTimeMs}`;
			if (this.animationTimelines.get(entityId) === timelineVersion) return;
			this.animationTimelines.set(entityId, timelineVersion);
			const mapping = Object.entries(resource.animation.clips).find(
				([semantic, clip]) =>
					worldStateStringId(semantic) === member.animation.id || worldStateStringId(clip) === member.animation.id,
			);
			if (!mapping) return;
			const [semantic, clip] = mapping;
			const mspd = reader.readMspd(slot, snapshot) ?? 0;
			const progress = member.animation.progress;
			entity.animationController.setMotionSpeed(mspd);
			if (semantic === "idle" || semantic === "walk" || semantic === "run") {
				entity.animationController.setLocomotion(semantic, progress);
			} else if (semantic === "jump" || semantic === "fall") {
				entity.animationController.setAirborne(true, progress);
			} else if (semantic === "land") {
				entity.animationController.setAirborne(false, progress);
			} else {
				entity.animationController.playAction(clip, progress);
			}
		});
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
		this.animationTimelines.clear();
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
		this.animationTimelines.delete(id);

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
