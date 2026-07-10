/**
 * 实体工厂（内容编排关注点）。
 *
 * 负责创建不同类型的实体（角色、球体等）并管理GLB模型缓存。从 RendererController 拆出。
 */

import type { AbstractMesh, AnimationGroup, Scene } from "~/lib/babylon/runtime";
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
import type { SpawnCmd } from "../../engine/core/thread/RendererProtocol";
import { CharacterAnimationController } from "./CharacterAnimationController";
import { BuiltinAnimationType, type CharacterEntityRuntime, type SimpleEntityRuntime } from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);

export class EntityFactory {
	private scene: Scene;
	private characterModelCache: Map<string, { meshes: AbstractMesh[]; animationGroups: AnimationGroup[] }> = new Map();

	constructor(scene: Scene) {
		this.scene = scene;
	}

	/** 创建角色实体 */
	async createCharacter(
		id: string,
		name: string,
		position: Vector3,
		props?: SpawnCmd["props"],
	): Promise<CharacterEntityRuntime> {
		// 加载GLB模型
		const modelData = await this.loadCharacterModel();

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

		if (rootMesh) {
			// 设置位置
			rootMesh.position.copyFrom(position);

			// 启用实例化的网格层级（优化版：只处理可见网格和关键骨骼）
			const enableInstantiatedMeshes = (mesh: any, depth: number = 0) => {
				const meshType = mesh.constructor.name;
				const hasGeometry = mesh.geometry && mesh.geometry.getTotalVertices && mesh.geometry.getTotalVertices() > 0;
				const isVisibleMesh = hasGeometry || meshType.includes("InstancedMesh");

				// 启用网格
				mesh.setEnabled(true);
				if (mesh.isVisible !== undefined) {
					mesh.isVisible = true;
				}

				// 递归处理子网格
				const children = mesh.getChildren();

				children.forEach((child: any) => {
					enableInstantiatedMeshes(child, depth + 1);
				});
			};

			enableInstantiatedMeshes(rootMesh);
		}

		// 克隆动画组，去除重复
		const builtinAnimations = new Map<string, AnimationGroup>();
		const processedAnimations = new Set<string>(); // 防止重复动画

		modelData.animationGroups.forEach((originalGroup, index) => {
			// 跳过已处理的动画（防止重复）
			if (processedAnimations.has(originalGroup.name)) {
				logger.warn(`⚠️ 跳过重复动画: ${originalGroup.name}`);
				return;
			}
			processedAnimations.add(originalGroup.name);

			// 统计动画目标映射情况
			let mappedTargets = 0;
			let unmappedTargets = 0;

			// 克隆动画组，重新映射到实例化的网格
			const clonedGroup = originalGroup.clone(`${originalGroup.name}_${id}`, (oldTarget) => {
				const targetName = (oldTarget as any).name;

				// 使用场景的getNodeByName来查找实例化的骨骼
				const clonedTarget = this.scene.getNodeByName(targetName);

				if (clonedTarget) {
					mappedTargets++;
					return clonedTarget;
				}

				// 如果场景中找不到，再尝试递归查找
				const findInHierarchy = (parentMesh: any, targetName: string): any => {
					if (parentMesh.name === targetName) {
						return parentMesh;
					}

					if (parentMesh.getChildren) {
						for (const child of parentMesh.getChildren()) {
							const found = findInHierarchy(child, targetName);
							if (found) return found;
						}
					}

					return null;
				};

				const hierarchyTarget = findInHierarchy(rootMesh, targetName);

				if (hierarchyTarget) {
					mappedTargets++;
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
		const entity: CharacterEntityRuntime = {
			id,
			type: "character",
			mesh: rootMesh!,
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
			animationController: null as any, // 稍后设置
		};

		// 创建动画控制器
		entity.animationController = new CharacterAnimationController(entity, this.scene);

		// 播放默认idle动画（循环）
		entity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE, {
			mode: "loop",
		});
		return entity;
	}

	/** 创建球体实体（向后兼容） */
	createSphere(id: string, name: string, position: Vector3, props?: SpawnCmd["props"]): SimpleEntityRuntime {
		const radius = props?.radius || 0.2;
		const sphere = MeshBuilder.CreateSphere(`sphere:${id}`, { diameter: radius * 2 }, this.scene);
		sphere.position.copyFrom(position);

		// 材质
		const mat = new StandardMaterial(`mat:${id}`, this.scene);
		const baseColor = props?.color
			? Color3.FromHexString(props.color.startsWith("#") ? props.color : `#${props.color}`)
			: Color3.FromHexString("#3aa6ff");
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
	private async loadCharacterModel(): Promise<{ meshes: AbstractMesh[]; animationGroups: AnimationGroup[] }> {
		const cacheKey = "character";

		if (this.characterModelCache.has(cacheKey)) {
			return this.characterModelCache.get(cacheKey)!;
		}

		try {
			const result = await ImportMeshAsync("/models/character.glb", this.scene);

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

			const modelData = {
				meshes: result.meshes,
				animationGroups: uniqueAnimationGroups, // 使用去重后的动画组
			};
			this.characterModelCache.set(cacheKey, modelData);

			return modelData;
		} catch (error) {
			logger.error(`❌ 角色模型加载失败:`, error);
			throw error;
		}
	}
}
