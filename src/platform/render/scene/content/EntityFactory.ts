/**
 * 实体工厂（内容编排关注点）。
 *
 * 负责创建不同类型的实体（角色、球体等）并管理GLB模型缓存。从 RendererController 拆出。
 */

import { PlayerBodyProfile } from "~/game/locomotion";
import { createLogger } from "~/lib/logger";
import type { AbstractMesh, AnimationGroup, Scene } from "~/platform/render/babylon/runtime";
import {
	Color3,
	DynamicTexture,
	ImportMeshAsync,
	Mesh,
	MeshBuilder,
	StandardMaterial,
	TransformNode,
	Vector3,
} from "~/platform/render/babylon/runtime";
import type { CharacterWorldResource, MobWorldResource } from "../contracts/worldResource";
import { applyCharacterModelOrientation } from "../resources/characterVisual";
import { CharacterAnimationController } from "./CharacterAnimationController";
import type { CharacterAnimationTarget, CharacterEntityRuntime, SimpleEntityRuntime } from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);
const LABEL_MODEL_GAP = 0.3;

type CharacterModelTemplate = { meshes: AbstractMesh[]; animationGroups: AnimationGroup[] };

export class EntityFactory {
	private scene: Scene;
	private contentRoot?: TransformNode;
	private onMemberMeshCreated?: (mesh: AbstractMesh) => void;
	private characterModelCache = new Map<string, Promise<CharacterModelTemplate>>();

	constructor(scene: Scene, contentRoot?: TransformNode, onMemberMeshCreated?: (mesh: AbstractMesh) => void) {
		this.scene = scene;
		this.contentRoot = contentRoot;
		this.onMemberMeshCreated = onMemberMeshCreated;
	}

	/** 成员装配完成后统一发布真实模型网格；名称标签在此之后创建，不会进入成员渲染能力。 */
	private publishMemberMeshes(modelRoot: TransformNode): void {
		if (!this.onMemberMeshCreated) return;
		if (modelRoot instanceof Mesh) this.onMemberMeshCreated(modelRoot);
		for (const mesh of modelRoot.getChildMeshes(false)) this.onMemberMeshCreated(mesh);
	}

	/** 创建角色实体 */
	async createCharacter(
		id: string,
		name: string,
		position: Vector3,
		resource: CharacterWorldResource,
	): Promise<CharacterEntityRuntime> {
		// 加载GLB模型
		const modelData = await this.loadCharacterModel(resource.model.uri);

		if (!modelData.meshes.length) {
			throw new Error("角色模型加载失败：没有找到网格");
		}

		// 调试：打印模型信息
		logger.info(`🔍 模型信息: meshes数量=${modelData.meshes.length}, 动画数量=${modelData.animationGroups.length}`);
		modelData.meshes.forEach((mesh, index) => {
			logger.info(
				`  Mesh[${index}]: ${mesh.name}, 类型=${mesh.constructor.name}, enabled=${mesh.isEnabled()}, visible=${mesh.isVisible}`,
			);
		});

		// 克隆完整节点层级；几何缓冲仍由 Mesh clone 共享，但角色变换节点和骨架必须独立。
		const instanceNodesBySource = new Map<TransformNode, TransformNode>();
		const instanceNodesBySourceName = new Map<string, TransformNode>();
		const instantiatedMeshes = modelData.meshes[0].instantiateHierarchy(
			null,
			{
				doNotInstantiate: true,
			},
			(sourceNode, instantiatedNode) => {
				// Babylon 的层级克隆不会可靠传播 source metadata；显式保留 glTF extras 供装备槽拾取读取。
				instantiatedNode.metadata = sourceNode.metadata;
				instanceNodesBySource.set(sourceNode, instantiatedNode);
				if (sourceNode.name) instanceNodesBySourceName.set(sourceNode.name, instantiatedNode);
			},
		);

		if (!instantiatedMeshes) {
			throw new Error("角色层级实例化失败");
		}

		const modelRoot = instantiatedMeshes;
		modelRoot.name = `character-model:${id}`;
		modelRoot.id = `character-model:${id}`;

		modelRoot.computeWorldMatrix(true);
		const bounds = modelRoot.getHierarchyBoundingVectors(true);
		const modelHeight = bounds.max.y - bounds.min.y;
		const heightScale = modelHeight > 0 ? PlayerBodyProfile.HEIGHT / modelHeight : 1;
		modelRoot.scaling.scaleInPlace(resource.appearance.scale * heightScale);

		// 世界变换与资产变换分层：模型保留 GLB 坐标系，实体根节点只承载位置和逻辑朝向。
		const entityRoot = new TransformNode(`character:${id}`, this.scene);
		entityRoot.id = `character:${id}`;
		entityRoot.parent = this.contentRoot ?? null;
		entityRoot.position.copyFrom(position);
		modelRoot.parent = entityRoot;
		applyCharacterModelOrientation(modelRoot);

		// 模板节点默认隐藏；实例层级需要整体启用，并仅对真实 mesh 恢复可见性。
		instanceNodesBySource.forEach((node) => {
			node.setEnabled(true);
			if (node instanceof Mesh) node.isVisible = true;
		});
		modelRoot.setEnabled(true);

		// Babylon 的层级克隆仍会复用源 Skeleton，必须为角色克隆骨架并重新链接到当前节点。
		const clonedSkeletons = new Map<NonNullable<AbstractMesh["skeleton"]>, NonNullable<AbstractMesh["skeleton"]>>();
		modelData.meshes.forEach((sourceMesh) => {
			const sourceSkeleton = sourceMesh.skeleton;
			const instantiatedMesh = instanceNodesBySource.get(sourceMesh);
			if (!sourceSkeleton || !(instantiatedMesh instanceof Mesh)) return;

			let clonedSkeleton = clonedSkeletons.get(sourceSkeleton);
			if (!clonedSkeleton) {
				clonedSkeleton = sourceSkeleton.clone(`${sourceSkeleton.name}_${id}`);
				sourceSkeleton.bones.forEach((sourceBone, index) => {
					const sourceTransform = sourceBone.getTransformNode();
					const clonedTransform = sourceTransform ? (instanceNodesBySource.get(sourceTransform) ?? null) : null;
					clonedSkeleton?.bones[index]?.linkTransformNode(clonedTransform);
				});
				clonedSkeletons.set(sourceSkeleton, clonedSkeleton);
			}
			instantiatedMesh.skeleton = clonedSkeleton;
		});

		// 克隆动画组，去除重复
		const builtinAnimations = new Map<string, AnimationGroup>();
		const processedAnimations = new Set<string>(); // 防止重复动画

		modelData.animationGroups.forEach((originalGroup) => {
			// 跳过已处理的动画（防止重复）
			if (processedAnimations.has(originalGroup.name)) {
				logger.warn(`⚠️ 跳过重复动画: ${originalGroup.name}`);
				return;
			}
			processedAnimations.add(originalGroup.name);

			let unmappedTargets = 0;

			// 克隆动画组，重新映射到实例化的网格
			const clonedGroup = originalGroup.clone(`${originalGroup.name}_${id}`, (oldTarget) => {
				const targetName = typeof oldTarget?.name === "string" ? oldTarget.name : "";

				// 优先按源节点身份映射；名称只用于兼容非 TransformNode 的动画目标。
				const instanceTarget =
					(oldTarget instanceof TransformNode ? instanceNodesBySource.get(oldTarget) : undefined) ??
					instanceNodesBySourceName.get(targetName);
				if (instanceTarget) return instanceTarget;

				unmappedTargets++;
				if (unmappedTargets <= 3) {
					// 只显示前3个未找到的目标
					logger.warn(`⚠️ 动画目标未找到: ${targetName}`);
				}
				return null;
			});

			if (clonedGroup) {
				builtinAnimations.set(originalGroup.name, clonedGroup);
			} else {
				logger.error(`❌ 动画克隆失败: ${originalGroup.name}`);
			}
		});

		modelRoot.computeWorldMatrix(true);
		const unalignedBounds = modelRoot.getHierarchyBoundingVectors(true);
		const rootWorldY = entityRoot.getAbsolutePosition().y;
		modelRoot.position.y -= unalignedBounds.min.y - rootWorldY;
		modelRoot.computeWorldMatrix(true);
		const scaledBounds = modelRoot.getHierarchyBoundingVectors(true);
		const modelTopOffsetY = Math.max(0, scaledBounds.max.y - entityRoot.getAbsolutePosition().y);

		this.publishMemberMeshes(modelRoot);
		const label = this.createLabel(id, name, entityRoot, 1.2, modelTopOffsetY);

		// 创建实体
		const entity: CharacterAnimationTarget = {
			id,
			type: "character",
			animationClips: resource.animation.clips,
			locomotionAnimation: resource.animation.locomotion,
			mesh: entityRoot,
			label,
			lastSeq: -1,
			physics: {
				pos: position.clone(),
				vel: Vector3.Zero(),
				speed: 0,
				moving: false,
				yaw: 0,
			},
			builtinAnimations,
			customAnimations: new Map(),
			ownedSkeletons: [...clonedSkeletons.values()],
		};

		const animationController = new CharacterAnimationController(entity, this.scene);

		// 播放默认idle动画（循环）
		animationController.setLocomotion("idle");
		return { ...entity, animationController };
	}

	/** 创建球体实体（向后兼容） */
	createSphere(
		id: string,
		name: string,
		position: Vector3,
		appearance: MobWorldResource["appearance"],
	): SimpleEntityRuntime {
		const { radius, color } = appearance;
		const entityRoot = new TransformNode(`mob:${id}`, this.scene);
		entityRoot.parent = this.contentRoot ?? null;
		entityRoot.position.copyFrom(position);
		const sphere = MeshBuilder.CreateSphere(`sphere:${id}`, { diameter: radius * 2 }, this.scene);
		sphere.parent = entityRoot;
		sphere.position.y = radius;

		// 材质
		const mat = new StandardMaterial(`mat:${id}`, this.scene);
		const baseColor = Color3.FromHexString(color);
		mat.diffuseColor = baseColor;
		mat.emissiveColor = baseColor.scale(0.2);
		sphere.material = mat;

		this.publishMemberMeshes(sphere);
		const label = this.createLabel(id, name, entityRoot, radius * 4, radius * 2);

		return {
			id,
			type: "sphere",
			mesh: entityRoot,
			label,
			lastSeq: -1,
			physics: {
				pos: position.clone(),
				vel: Vector3.Zero(),
				speed: 0,
				moving: false,
				yaw: 0,
			},
		};
	}

	/**
	 * 创建名称标签并绑定到实体世界根节点。
	 * 世界根节点不携带资产变换，因此标签只需使用稳定的局部高度即可自动跟随实体。
	 */
	createLabel(id: string, name: string, parent: TransformNode, width: number, modelTopOffsetY: number): Mesh {
		const labelWidth = Math.max(1.2, width);
		const labelHeight = labelWidth / 4;
		const offsetY = modelTopOffsetY + LABEL_MODEL_GAP + labelHeight / 2;
		const label = MeshBuilder.CreatePlane(`label:${id}`, { width: labelWidth, height: labelHeight }, this.scene);
		label.parent = parent;
		label.position.set(0, offsetY, 0);
		label.billboardMode = Mesh.BILLBOARDMODE_ALL;
		label.isPickable = false;

		const textureWidth = 256;
		const textureHeight = 64;
		const texture = new DynamicTexture(`lbl:${id}`, { width: textureWidth, height: textureHeight }, this.scene, false);
		texture.hasAlpha = true;
		const ctx = texture.getContext();
		ctx.clearRect(0, 0, textureWidth, textureHeight);
		ctx.lineJoin = "round";
		let fontSize = 28;
		ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
		while (fontSize > 14 && ctx.measureText(name).width > textureWidth - 16) {
			fontSize -= 2;
			ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
		}
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 4;
		const metrics = ctx.measureText(name);
		const measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
		const textX = (textureWidth - metrics.width) / 2;
		const textY =
			measuredHeight > 0
				? (textureHeight - measuredHeight) / 2 + metrics.actualBoundingBoxAscent
				: textureHeight / 2 + fontSize * 0.35;
		ctx.strokeText(name, textX, textY);
		ctx.fillText(name, textX, textY);
		texture.update();

		const lblMat = new StandardMaterial(`lblMat:${id}`, this.scene);
		lblMat.diffuseTexture = texture;
		lblMat.emissiveTexture = texture;
		lblMat.emissiveColor = Color3.White();
		lblMat.useAlphaFromDiffuseTexture = true;
		lblMat.disableLighting = true;
		lblMat.backFaceCulling = false;
		label.material = lblMat;

		return label;
	}

	/** 加载角色模型 */
	private async loadCharacterModel(modelUri: string): Promise<CharacterModelTemplate> {
		const cached = this.characterModelCache.get(modelUri);
		if (cached) return cached;

		const loading = (async (): Promise<CharacterModelTemplate> => {
			const result = await ImportMeshAsync(modelUri, this.scene);

			// 隐藏原始模型，只用作模板
			result.meshes.forEach((mesh) => {
				mesh.setEnabled(false);
				mesh.isVisible = false; // 确保完全隐藏
			});

			// 停止并移除重复的动画组
			const uniqueAnimationGroups: AnimationGroup[] = [];
			const seenAnimations = new Set<string>();

			result.animationGroups.forEach((group) => {
				if (!seenAnimations.has(group.name)) {
					seenAnimations.add(group.name);
					group.stop();
					group.reset();
					uniqueAnimationGroups.push(group);
				} else {
					// 移除重复的动画组
					group.dispose();
				}
			});

			return {
				meshes: result.meshes,
				animationGroups: uniqueAnimationGroups, // 使用去重后的动画组
			};
		})();
		this.characterModelCache.set(modelUri, loading);

		try {
			return await loading;
		} catch (error) {
			if (this.characterModelCache.get(modelUri) === loading) this.characterModelCache.delete(modelUri);
			logger.error(`❌ 角色模型加载失败:`, error);
			throw error;
		}
	}
}
