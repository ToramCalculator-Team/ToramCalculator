/**
 * 渲染命令处理器（内容编排关注点）。
 *
 * 将高级渲染命令转换为具体的Babylon.js操作，支持序列号验证防止过期命令执行。
 * 也承担首帧渲染快照的全量应用。从 RendererController 拆出。
 */

import type { Scene } from "~/lib/babylon/runtime";
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "~/lib/babylon/runtime";
import { createLogger } from "~/lib/Logger";
import type {
	ActionCmd,
	CameraFollowCmd,
	DestroyCmd,
	FaceCmd,
	MoveStartCmd,
	MoveStopCmd,
	ReconcileCmd,
	RendererCmd,
	RenderSnapshot,
	RenderSnapshotArea,
	SpawnCmd,
	TeleportCmd,
} from "../../engine/core/thread/RendererProtocol";
import type { WorldResourcePose } from "../contracts/worldContent";
import type { WorldResource } from "../contracts/worldResource";
import type { EntityFactory } from "./EntityFactory";
import type { CharacterEntityRuntime, CustomAnimationData, EntityRuntime } from "./entityTypes";
import { canReuseWorldResource } from "./worldResourceDiff";

const logger = createLogger("RenderController");
logger.setLevel(0);

export class CommandHandler {
	private entities: Map<string, EntityRuntime>;
	private factory: EntityFactory;
	private scene: Scene;
	private worldResources: Map<string, WorldResource>;
	private areaVisuals: Map<string, Mesh> = new Map();

	constructor(entities: Map<string, EntityRuntime>, factory: EntityFactory, scene: Scene) {
		this.entities = entities;
		this.factory = factory;
		this.scene = scene;
		this.worldResources = new Map();
	}

	/**
	 * 投影同一解析版本的静态资源。设计态直接调用；进入验证后动态命令只更新这些实体的运行状态。
	 */
	async applyWorldResources(resources: WorldResource[], poses: WorldResourcePose[]): Promise<void> {
		const nextResources = new Map(resources.map((resource) => [resource.memberId, resource]));
		if (nextResources.size !== resources.length) throw new Error("worldResources 中存在重复 memberId");

		for (const memberId of [...this.entities.keys()]) {
			const previous = this.worldResources.get(memberId);
			const next = nextResources.get(memberId);
			if (!previous || !next || !canReuseWorldResource(previous, next)) this.disposeEntity(memberId);
		}
		this.worldResources = nextResources;
		const posesByMemberId = new Map(poses.map((pose) => [pose.memberId, pose]));
		for (const resource of resources) {
			const pose = posesByMemberId.get(resource.memberId);
			await this.handle({
				type: "spawn",
				entityId: resource.memberId,
				position: pose?.position ?? { x: 0, y: 0, z: 0 },
				seq: -1,
				ts: 0,
			});
			if (pose) {
				await this.handle({ type: "face", entityId: resource.memberId, yaw: pose.yaw, seq: -1, ts: 0 });
			}
		}
	}

	async handle(cmd: RendererCmd): Promise<void> {
		if (cmd.type === "batch") {
			for (const c of cmd.cmds) {
				await this.handle(c);
			}
			return;
		}

		const entity = this.entities.get(cmd.entityId);

		switch (cmd.type) {
			case "spawn":
				await this.handleSpawn(cmd);
				break;
			case "destroy":
				this.handleDestroy(cmd, entity);
				break;
			case "moveStart":
				this.handleMoveStart(cmd, entity);
				break;
			case "moveStop":
				this.handleMoveStop(cmd, entity);
				break;
			case "face":
				this.handleFace(cmd, entity);
				break;
			case "teleport":
				this.handleTeleport(cmd, entity);
				break;
			case "action":
				this.handleAction(cmd, entity);
				break;
			case "reconcile":
				this.handleReconcile(cmd, entity);
				break;
			case "camera_follow":
				this.handleCameraFollow(cmd);
				break;
		}
	}

	/** 应用渲染快照（首次同步时按全量世界状态创建/更新实体与区域，与逻辑快照区分） */
	async applyRenderSnapshot(renderSnapshot: RenderSnapshot): Promise<void> {
		const seq = renderSnapshot.tickIndex;
		const ts = renderSnapshot.currentTimeMs;
		for (const member of renderSnapshot.members) {
			if (!this.entities.has(member.id)) {
				await this.handle({
					type: "spawn",
					entityId: member.id,
					position: member.position,
					seq,
					ts,
				});
			}
			await this.handle({
				type: "teleport",
				entityId: member.id,
				position: member.position,
				seq,
				ts,
			});
			await this.handle({
				type: "face",
				entityId: member.id,
				yaw: member.yaw,
				seq,
				ts,
			});
			if (member.animation) {
				await this.handle({
					type: "action",
					entityId: member.id,
					name: member.animation.name,
					params: { progress: member.animation.progress, currentTimeMs: renderSnapshot.currentTimeMs },
					seq,
					ts,
				});
			}
		}
		if (renderSnapshot.cameraFollowEntityId) {
			await this.handle({
				type: "camera_follow",
				entityId: renderSnapshot.cameraFollowEntityId,
				seq,
				ts,
			});
		}
		if (renderSnapshot.areas?.length) {
			const areaIds = new Set(renderSnapshot.areas.map((a) => a.id));
			for (const [id, mesh] of this.areaVisuals) {
				if (!areaIds.has(id)) {
					mesh.dispose();
					this.areaVisuals.delete(id);
				}
			}
			for (const area of renderSnapshot.areas) {
				this.createOrUpdateAreaVisual(area);
			}
		}
	}

	private createOrUpdateAreaVisual(area: RenderSnapshotArea): void {
		const radius = (area.shape?.radius as number) ?? 1;
		const safeRadius = Math.max(0.1, radius);
		let mesh = this.areaVisuals.get(area.id);
		if (!mesh) {
			mesh = MeshBuilder.CreateDisc(`area:${area.id}`, { radius: safeRadius, tessellation: 32 }, this.scene);
			mesh.rotation.x = Math.PI / 2;
			(mesh as Mesh & { __baseRadius?: number }).__baseRadius = safeRadius;
			const mat = new StandardMaterial(`areaMat:${area.id}`, this.scene);
			mat.alpha = 0.35;
			mat.diffuseColor = new Color3(1, 0.2, 0.2);
			mat.backFaceCulling = false;
			mesh.material = mat;
			this.areaVisuals.set(area.id, mesh);
		}
		mesh.position.set(area.position.x, area.position.y, area.position.z);
		const base = (mesh as Mesh & { __baseRadius?: number }).__baseRadius ?? safeRadius;
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
	}

	/** 按静态 worldResources 生成实体；动态命令不得自行选择模型或外观。 */
	private async handleSpawn(cmd: SpawnCmd): Promise<void> {
		logger.info(`🎬 处理spawn命令:`, cmd);
		const resource = this.worldResources.get(cmd.entityId);
		if (!resource) throw new Error(`实体 ${cmd.entityId} 没有已解析的 worldResource`);

		const exists = this.entities.get(cmd.entityId);
		if (exists && exists.lastSeq > cmd.seq) {
			logger.info(`🎬 跳过旧序列号的spawn命令: ${cmd.entityId}`);
			return;
		}

		if (exists) {
			exists.lastSeq = cmd.seq;
			exists.physics.pos.copyFromFloats(cmd.position.x, cmd.position.y, cmd.position.z);
			exists.mesh.position.copyFrom(exists.physics.pos);
			return;
		}

		const pos = new Vector3(cmd.position.x, cmd.position.y, cmd.position.z);

		if (resource.kind === "mob") {
			const entity = this.factory.createSphere(cmd.entityId, resource.displayName, pos, resource.appearance);
			entity.lastSeq = cmd.seq;
			this.entities.set(cmd.entityId, entity);
			logger.info(`🎬 Mob 静态资源创建成功: ${cmd.entityId}`);
			return;
		}

		logger.info(`🎬 开始创建角色: ${cmd.entityId}`);
		const entity = await this.factory.createCharacter(cmd.entityId, resource.displayName, pos, resource);
		entity.lastSeq = cmd.seq;
		this.entities.set(cmd.entityId, entity);
		logger.info(`🎬 角色创建成功: ${cmd.entityId}`);
	}

	/**
	 * 开始移动 - 仅处理动画切换
	 * 物理状态应该由GameEngine更新，这里只处理视觉效果
	 */
	private handleMoveStart(cmd: MoveStartCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;

		entity.lastSeq = cmd.seq;

		// 只更新朝向，其他物理状态由GameEngine管理
		entity.physics.yaw = Math.atan2(cmd.dir.x, cmd.dir.z);

		// 动画控制：根据速度切换动画
		if (entity.type === "character") {
			const charEntity = entity as CharacterEntityRuntime;
			const animationType = cmd.speed > 3 ? charEntity.animationClips.run : charEntity.animationClips.walk;
			charEntity.animationController.playBuiltinAnimation(animationType);
		}
	}

	/**
	 * 停止移动 - 仅处理动画切换
	 * 物理状态由GameEngine管理，这里只处理视觉效果
	 */
	private handleMoveStop(cmd: MoveStopCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;

		entity.lastSeq = cmd.seq;

		// 动画控制：切换到idle
		if (entity.type === "character") {
			const charEntity = entity as CharacterEntityRuntime;
			charEntity.animationController.playBuiltinAnimation(charEntity.animationClips.idle);
		}
	}

	/** 执行动作/技能；支持 params.progress（0..1）用于渲染快照应用时按进度恢复动画 seek */
	private handleAction(cmd: ActionCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;

		entity.lastSeq = cmd.seq;

		// 处理角色动作
		if (entity.type === "character") {
			const charEntity = entity as CharacterEntityRuntime;
			const clips = charEntity.animationClips;
			const progress = typeof cmd.params?.progress === "number" ? cmd.params.progress : undefined;

			const playWithSeek = (animationId: string, loop: boolean) => {
				const group = charEntity.builtinAnimations.get(animationId) || charEntity.customAnimations.get(animationId);
				if (!group) return;
				charEntity.animationController.stopAllAnimations();
				if (progress !== undefined && progress >= 0 && progress < 1) {
					try {
						const keys = group.targetedAnimations?.flatMap(
							(ta: { animation: { getKeys?: () => Array<{ frame: number }> } }) => ta.animation.getKeys?.() ?? [],
						);
						const maxFrame = keys.length ? Math.max(...keys.map((k) => k.frame)) : 60;
						group.goToFrame(progress * maxFrame);
					} catch {
						// 无法 seek 时降级从头播
					}
				}
				group.play(loop);
				charEntity.animationState.current = animationId;
			};

			switch (cmd.name) {
				case "jump":
					charEntity.animationController.playBuiltinAnimation(clips.jump, {
						mode: "interrupt",
						onComplete: () => {
							charEntity.animationController.playBuiltinAnimation(clips.idle);
						},
					});
					break;
				case "idle":
					playWithSeek(clips.idle, true);
					break;
				case "walk":
					playWithSeek(clips.walk, true);
					break;
				case "run":
					playWithSeek(clips.run, true);
					break;
				case "skill":
					// 如果有自定义动画数据，播放自定义动画
					if (cmd.params?.animationData) {
						charEntity.animationController.playCustomAnimation(cmd.params.animationData as CustomAnimationData, {
							mode: "interrupt",
							onComplete: () => {
								charEntity.animationController.playBuiltinAnimation(clips.idle);
							},
						});
					}
					break;
				default:
					// 尝试按名称作为 builtin/custom 动画 id 播放（含 seek）
					playWithSeek(cmd.name, false);
			}
		}
	}

	// ==================== 命令处理函数 ====================
	/** 销毁实体 */
	private handleDestroy(cmd: DestroyCmd, entity?: EntityRuntime): void {
		if (entity && entity.lastSeq <= cmd.seq) {
			this.disposeEntity(cmd.entityId);
		}
	}

	/** 改变朝向 */
	private handleFace(cmd: FaceCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;
		entity.lastSeq = cmd.seq;
		entity.physics.yaw = cmd.yaw;
	}

	/**
	 * 瞬移传送 - 立即更新实体位置
	 * 这是一个立即生效的位置更新，不经过物理系统
	 */
	private handleTeleport(cmd: TeleportCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;
		entity.lastSeq = cmd.seq;

		// 直接更新位置（瞬移是立即生效的）
		entity.physics.pos.copyFromFloats(cmd.position.x, cmd.position.y, cmd.position.z);

		// 立即同步到渲染网格
		entity.mesh.position.copyFrom(entity.physics.pos);
		if (entity.label) {
			entity.label.position = entity.physics.pos.add(new Vector3(0, 0.6, 0));
		}
	}

	/**
	 * 位置校正 - 同步权威状态
	 * 用于修正客户端与服务端的位置差异
	 */
	private handleReconcile(cmd: ReconcileCmd, entity?: EntityRuntime): void {
		if (!entity || entity.lastSeq > cmd.seq) return;
		entity.lastSeq = cmd.seq;

		// 更新实体的物理状态
		entity.physics.pos.copyFromFloats(cmd.position.x, cmd.position.y, cmd.position.z);

		if (cmd.velocity) {
			entity.physics.vel.copyFromFloats(cmd.velocity.x, cmd.velocity.y, cmd.velocity.z);
		}

		if (cmd.hard) {
			// 硬校正：立即同步到渲染
			entity.mesh.position.copyFrom(entity.physics.pos);
			if (entity.label) {
				entity.label.position = entity.physics.pos.add(new Vector3(0, 0.6, 0));
			}
		}
		// 软校正由渲染同步系统在下一帧处理
	}

	/** 相机跟随命令 - 转发给相机控制器 */
	private handleCameraFollow(cmd: CameraFollowCmd): void {
		// 将相机跟随命令转发给第三人称相机控制器
		if (typeof window !== "undefined") {
			// 只转发"跟随目标"，不带距离/角度：由相机控制器保持当前视角与默认距离。
			const cameraCmd = {
				type: "camera_control",
				subType: "follow",
				data: {
					followEntityId: cmd.entityId,
				},
			};
			window.dispatchEvent(
				new CustomEvent("cameraControl", {
					detail: cameraCmd,
				}),
			);
			logger.info(`📹 发送相机跟随命令: ${cmd.entityId}，保持当前视角`, cameraCmd);
		}
	}

	/**
	 * 销毁实体并清理所有相关资源
	 * 包括动画组、网格、标签和纹理
	 */
	private disposeEntity(id: string): void {
		const entity = this.entities.get(id);
		if (!entity) return;

		logger.info(`🗑️ 开始清理实体: ${id}`);

		// 清理动画和动画组
		if (entity.type === "character") {
			const charEntity = entity as CharacterEntityRuntime;
			charEntity.animationController.stopAllAnimations();

			// 清理动画组
			charEntity.builtinAnimations.forEach((group) => {
				group.dispose();
			});
			charEntity.customAnimations.forEach((group) => {
				group.dispose();
			});
			charEntity.builtinAnimations.clear();
			charEntity.customAnimations.clear();
		}

		// 清理网格
		if (entity.mesh instanceof Mesh) {
			entity.mesh.dispose(false, true);
		} else if (entity.mesh instanceof TransformNode) {
			entity.mesh.dispose();
		}

		// 清理UI相关资源
		entity.label?.dispose(false, true);
		entity.labelTexture?.dispose();

		// 从实体映射中移除
		this.entities.delete(id);

		logger.info(`✅ 实体清理完成: ${id}`);
	}
}
