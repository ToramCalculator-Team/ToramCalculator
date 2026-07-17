/**
 * 实体工厂（内容编排关注点）。
 *
 * 负责创建不同类型的实体（角色、球体等）并管理GLB模型缓存。从 RendererController 拆出。
 */

import type { AbstractMesh, AnimationGroup, Scene, TransformNode } from "~/lib/babylon/runtime";
import {
	Color3,
	DynamicTexture,
	ImportMeshAsync,
	Mesh,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from "~/lib/babylon/runtime";
import { createLogger } from "~/lib/Logger";
import type { CharacterWorldResource, MobWorldResource } from "../contracts/worldResource";
import { CharacterAnimationController } from "./CharacterAnimationController";
import type { CharacterAnimationTarget, CharacterEntityRuntime, SimpleEntityRuntime } from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);

type CharacterModelTemplate = { meshes: AbstractMesh[]; animationGroups: AnimationGroup[] };
type RenderHierarchyNode = {
	name: string;
	setEnabled: (enabled: boolean) => void;
	getChildren: () => RenderHierarchyNode[];
	isVisible?: boolean;
};

export class EntityFactory {
	private scene: Scene;
	private contentRoot?: TransformNode;
	private characterModelCache = new Map<string, Promise<CharacterModelTemplate>>();

	constructor(scene: Scene, contentRoot?: TransformNode) {
		this.scene = scene;
		this.contentRoot = contentRoot;
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

		// 使用instantiateHierarchy来正确复制整个层级结构
		// 选择理由：
		// 1. createInstance() - 只能共享几何体，无法独立动画
		// 2. clone() - 只复制单个网格，丢失骨骼层级
		// 3. instantiateHierarchy() - 完整复制层级，支持独立动画
		const instantiatedMeshes = modelData.meshes[0].instantiateHierarchy(
			null,
			{
				doNotInstantiate: false,
			},
			(sourceNode, instantiatedNode) => {
				// Babylon 的 InstancedMesh 不会自动复制 source metadata；显式保留 glTF extras 供装备槽拾取读取。
				instantiatedNode.metadata = sourceNode.metadata;
			},
		);

		if (!instantiatedMeshes) {
			throw new Error("角色层级实例化失败");
		}

		// 重命名实例化的网格
		const rootMesh = instantiatedMeshes;
		rootMesh.name = `character:${id}`;
		rootMesh.id = `character:${id}`;
		rootMesh.parent = this.contentRoot ?? null;

		rootMesh.position.copyFrom(position);
		rootMesh.scaling.scaleInPlace(resource.appearance.scale);

		// 模板节点默认隐藏；实例层级需要整体启用，并仅对真实 mesh 恢复可见性。
		const enableInstantiatedMeshes = (node: RenderHierarchyNode) => {
			node.setEnabled(true);
			if (typeof node.isVisible === "boolean") node.isVisible = true;
			node.getChildren().forEach(enableInstantiatedMeshes);
		};

		enableInstantiatedMeshes(rootMesh);

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

				// 使用场景的getNodeByName来查找实例化的骨骼
				const clonedTarget = this.scene.getNodeByName(targetName);

				if (clonedTarget) {
					return clonedTarget;
				}

				// 如果场景中找不到，再尝试递归查找
				const findInHierarchy = (parent: RenderHierarchyNode, name: string): RenderHierarchyNode | null => {
					if (parent.name === name) {
						return parent;
					}

					for (const child of parent.getChildren()) {
						const found = findInHierarchy(child, name);
						if (found) return found;
					}

					return null;
				};

				const hierarchyTarget = findInHierarchy(rootMesh, targetName);

				if (hierarchyTarget) {
					return hierarchyTarget;
				}

				unmappedTargets++;
				if (unmappedTargets <= 3) {
					// 只显示前3个未找到的目标
					logger.warn(`⚠️ 动画目标未找到: ${targetName}`);
				}
				return rootMesh;
			});

			if (clonedGroup) {
				builtinAnimations.set(originalGroup.name, clonedGroup);
			} else {
				logger.error(`❌ 动画克隆失败: ${originalGroup.name}`);
			}
		});

		// 创建标签
		const { label, texture } = this.createLabel(id, name, position, 0.2);

		// 创建实体
		const entity: CharacterAnimationTarget = {
			id,
			type: "character",
			animationClips: resource.animation.clips,
			mesh: rootMesh,
			label,
			labelTexture: texture,
			lastSeq: -1,
			physics: {
				pos: position.clone(),
				vel: Vector3.Zero(),
				dir: { x: 0, z: 0 },
				speed: 0,
				accel: 0,
				moving: false,
				yaw: 0,
				decel: 0,
			},
			builtinAnimations,
			customAnimations: new Map(),
			animationState: {
				current: null,
				queue: [],
				transitioning: false,
				previous: null,
			},
		};

		const animationController = new CharacterAnimationController(entity, this.scene);

		// 播放默认idle动画（循环）
		animationController.playBuiltinAnimation(resource.animation.clips.idle, {
			mode: "loop",
		});
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
		const sphere = MeshBuilder.CreateSphere(`sphere:${id}`, { diameter: radius * 2 }, this.scene);
		sphere.parent = this.contentRoot ?? null;
		sphere.position.copyFrom(position);

		// 材质
		const mat = new StandardMaterial(`mat:${id}`, this.scene);
		const baseColor = Color3.FromHexString(color);
		mat.diffuseColor = baseColor;
		mat.emissiveColor = baseColor.scale(0.2);
		sphere.material = mat;

		// 标签
		const { label, texture } = this.createLabel(id, name, position, radius);

		return {
			id,
			type: "sphere",
			mesh: sphere,
			label,
			labelTexture: texture,
			lastSeq: -1,
			physics: {
				pos: position.clone(),
				vel: Vector3.Zero(),
				dir: { x: 0, z: 0 },
				speed: 0,
				accel: 0,
				moving: false,
				yaw: 0,
				decel: 0,
			},
		};
	}

	/** 创建标签 */
	createLabel(id: string, name: string, position: Vector3, radius: number): { label: Mesh; texture: DynamicTexture } {
		const label = MeshBuilder.CreatePlane(`label:${id}`, { size: radius * 4 }, this.scene);
		label.parent = this.contentRoot ?? null;
		label.billboardMode = Mesh.BILLBOARDMODE_ALL;
		label.position = position.add(new Vector3(0, radius * 3, 0));

		const texture = new DynamicTexture(`lbl:${id}`, { width: 256, height: 64 }, this.scene, false);
		const ctx = texture.getContext();
		ctx.font = "bold 28px system-ui, sans-serif";
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 4;
		ctx.strokeText(name, 8, 42);
		ctx.fillText(name, 8, 42);
		texture.update();

		const lblMat = new StandardMaterial(`lblMat:${id}`, this.scene);
		lblMat.diffuseTexture = texture;
		lblMat.emissiveColor = Color3.White();
		lblMat.backFaceCulling = false;
		label.material = lblMat;

		return { label, texture };
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
