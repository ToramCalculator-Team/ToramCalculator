import { Color3 } from "@babylonjs/core/Maths/math";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { AppendSceneAsync, ImportMeshAsync, SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { Animation } from "@babylonjs/core/Animations/animation";
import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";
import {
  RendererCmd,
  RendererController,
  SpawnCmd,
  CameraFollowCmd,
  DestroyCmd,
  MoveStartCmd,
  MoveStopCmd,
  FaceCmd,
  TeleportCmd,
  SetNameCmd,
  ActionCmd,
  SetPropsCmd,
  ReconcileCmd,
} from "./RendererProtocol";

type EntityId = string;

// ==================== 动画系统类型定义 ====================

/**
 * 内置动画类型 - GLB文件中包含的基础运动动画
 * 这些动画应该在character.glb模型文件中预定义
 */
enum BuiltinAnimationType {
  IDLE = "idle",
  WALK = "walk",
  RUN = "run",
  JUMP = "jump",
  FALL = "fall",
  LAND = "land",
}

/**
 * 自定义动画数据 - 从数据库获取的关键帧数据
 * 用于技能动画、表情动画等动态生成的动画
 */
interface CustomAnimationData {
  /** 动画唯一标识 */
  id: string;
  /** 动画名称 */
  name: string;
  /** 动画时长（秒） */
  duration: number;
  /** 是否循环播放 */
  loop: boolean;
  /** 关键帧数据 - 预留接口，具体结构待定 */
  keyframes: unknown;
  /** 动画类型标记 */
  type: "skill" | "emote" | "custom";
  /** 优先级 */
  priority: number;
}

/** 动画播放请求 */
interface AnimationPlayRequest {
  /** 动画标识 */
  animationId: string;
  /** 播放模式 */
  mode: "play" | "loop" | "interrupt" | "queue";
  /** 过渡时间（秒） */
  transitionTime?: number;
  /** 播放速度倍率 */
  speed?: number;
  /** 完成回调 */
  onComplete?: () => void;
}

/** 动画状态 */
interface AnimationState {
  /** 当前播放的动画 */
  current: string | null;
  /** 排队的动画 */
  queue: AnimationPlayRequest[];
  /** 是否正在过渡 */
  transitioning: boolean;
  /** 上一个动画（用于过渡） */
  previous: string | null;
}

// ==================== 实体系统类型定义 ====================

/**
 * 实体运行时数据基类
 * 所有渲染实体的通用属性和物理状态
 */
interface BaseEntityRuntime {
  /** 实体ID */
  id: EntityId;
  /** 实体类型 */
  type: "character" | "sphere" | "prop";
  /** 主要网格对象 */
  mesh: AbstractMesh | TransformNode;
  /** 名称标签 */
  label?: Mesh;
  /** 标签纹理 */
  labelTexture?: DynamicTexture;
  /** 最后更新序列号 */
  lastSeq: number;
  /** 物理状态 */
  physics: {
  pos: Vector3;
  vel: Vector3;
  dir: { x: number; z: number };
  speed: number;
  accel: number;
  moving: boolean;
  yaw: number;
  decel: number;
};
}

/**
 * 角色实体 - 支持动画的GLB模型
 * 包含完整的动画系统和自定义动画支持
 */
interface CharacterEntityRuntime extends BaseEntityRuntime {
  type: "character";
  /** GLB模型中的动画组 */
  builtinAnimations: Map<string, AnimationGroup>;
  /** 自定义动画（运行时生成） */
  customAnimations: Map<string, AnimationGroup>;
  /** 动画状态 */
  animationState: AnimationState;
  /** 动画控制器 */
  animationController: CharacterAnimationController;
}

/**
 * 简单实体 - 球体等基础几何体
 * 用于测试和向后兼容
 */
interface SimpleEntityRuntime extends BaseEntityRuntime {
  type: "sphere" | "prop";
}

type EntityRuntime = CharacterEntityRuntime | SimpleEntityRuntime;

// ==================== 动画控制器 ====================

/**
 * 角色动画控制器
 * 负责管理角色的内置动画和自定义动画的播放、队列、过渡等
 */

class CharacterAnimationController {
  private entity: CharacterEntityRuntime;
  private scene: Scene;

  constructor(entity: CharacterEntityRuntime, scene: Scene) {
    this.entity = entity;
    this.scene = scene;
  }

  /** 播放内置动画 */
  playBuiltinAnimation(type: BuiltinAnimationType, options?: Partial<AnimationPlayRequest>): void {
    const animationGroup = this.entity.builtinAnimations.get(type);
    if (!animationGroup) {
      console.warn(`Character ${this.entity.id}: 内置动画 ${type} 不存在`);
      return;
    }

    this.playAnimation(type, options);
  }

  /** 播放自定义动画 */
  async playCustomAnimation(
    animationData: CustomAnimationData,
    options?: Partial<AnimationPlayRequest>,
  ): Promise<void> {
    // 检查是否已缓存
    let animationGroup = this.entity.customAnimations.get(animationData.id);

    if (!animationGroup) {
      // 动态创建自定义动画
      animationGroup = await this.createCustomAnimation(animationData);
      this.entity.customAnimations.set(animationData.id, animationGroup);
    }

    this.playAnimation(animationData.id, options);
  }

  /** 停止所有动画 */
  stopAllAnimations(): void {
    this.entity.builtinAnimations.forEach((group) => {group.stop()});
    this.entity.customAnimations.forEach((group) => {group.stop()});
    this.entity.animationState.current = null;
    this.entity.animationState.queue = [];
  }

  /** 获取当前动画状态 */
  getCurrentAnimation(): string | null {
    return this.entity.animationState.current;
  }

  /** 从关键帧数据创建Babylon动画 */
  private async createCustomAnimation(data: CustomAnimationData): Promise<AnimationGroup> {
    // TODO: 实现关键帧数据到Babylon动画的转换
    // 这里预留接口，等确定具体的关键帧数据结构后实现
    console.log(`创建自定义动画: ${data.name}`, data);

    // 临时实现：创建一个空的动画组
    const animationGroup = new AnimationGroup(data.name, this.scene);

    // 将来这里会根据 data.keyframes 创建具体的动画
    // 例如：位置、旋转、缩放等变换动画
    // const positionAnimation = Animation.CreateAndStartAnimation(...)
    // animationGroup.addTargetedAnimation(positionAnimation, this.entity.mesh)

    return animationGroup;
  }

  /** 播放指定动画 */
  private playAnimation(animationId: string, options?: Partial<AnimationPlayRequest>): void {
    const request: AnimationPlayRequest = {
      animationId,
      mode: "play",
      transitionTime: 0.3,
      speed: 1.0,
      ...options,
    };

    switch (request.mode) {
      case "interrupt":
        this.stopAllAnimations();
        this.startAnimation(request);
        break;
      case "queue":
        this.entity.animationState.queue.push(request);
        if (!this.entity.animationState.current) {
          this.processQueue();
        }
        break;
      case "play":
      case "loop":
      default:
        this.startAnimation(request);
        break;
    }
  }

  /** 开始播放动画 */
  private startAnimation(request: AnimationPlayRequest): void {
    // 查找动画组
    let animationGroup =
      this.entity.builtinAnimations.get(request.animationId) || this.entity.customAnimations.get(request.animationId);

    if (!animationGroup) {
      console.warn(`Character ${this.entity.id}: 动画 ${request.animationId} 不存在`);
      return;
    }

    // 停止当前动画
    if (this.entity.animationState.current) {
      const currentGroup =
        this.entity.builtinAnimations.get(this.entity.animationState.current) ||
        this.entity.customAnimations.get(this.entity.animationState.current);
      currentGroup?.stop();
    }

    // 播放新动画
    animationGroup.play(request.mode === "loop");
    animationGroup.speedRatio = request.speed || 1.0;

    // 更新状态
    this.entity.animationState.previous = this.entity.animationState.current;
    this.entity.animationState.current = request.animationId;

    // 设置完成回调
    if (request.onComplete || this.entity.animationState.queue.length > 0) {
      animationGroup.onAnimationGroupEndObservable.addOnce(() => {
        request.onComplete?.();
        this.entity.animationState.current = null;
        this.processQueue();
      });
    }
  }

  /** 处理动画队列 */
  private processQueue(): void {
    const next = this.entity.animationState.queue.shift();
    if (next) {
      this.startAnimation(next);
    }
  }
}

// ==================== 实体工厂 ====================

/**
 * 实体工厂类
 * 负责创建不同类型的实体（角色、球体等）并管理GLB模型缓存
 */

class EntityFactory {
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
    console.log(`🔍 模型信息: meshes数量=${modelData.meshes.length}, 动画数量=${modelData.animationGroups.length}`);
    modelData.meshes.forEach((mesh, index) => {
      console.log(`  Mesh[${index}]: ${mesh.name}, 类型=${mesh.constructor.name}, enabled=${mesh.isEnabled()}, visible=${mesh.isVisible}`);
    });

    // 使用instantiateHierarchy来正确复制整个层级结构
    // 选择理由：
    // 1. createInstance() - 只能共享几何体，无法独立动画
    // 2. clone() - 只复制单个网格，丢失骨骼层级  
    // 3. instantiateHierarchy() - 完整复制层级，支持独立动画
    const instantiatedMeshes = modelData.meshes[0].instantiateHierarchy(null, {
      doNotInstantiate: false, // 创建真正的副本，不是GPU实例
    });
    
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
        const hasGeometry = (mesh.geometry && mesh.geometry.getTotalVertices && mesh.geometry.getTotalVertices() > 0);
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
        console.warn(`⚠️ 跳过重复动画: ${originalGroup.name}`);
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
        if (unmappedTargets <= 3) { // 只显示前3个未找到的目标
          console.warn(`⚠️ 动画目标未找到: ${targetName}`);
        }
        return rootMesh;
      });
    
      if (clonedGroup) {
        builtinAnimations.set(originalGroup.name, clonedGroup);
      } else {
        console.error(`❌ 动画克隆失败: ${originalGroup.name}`);
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
      console.error(`❌ 角色模型加载失败:`, error);
      throw error;
    }
  }
}

// ==================== 命令处理系统 ====================

/**
 * 渲染命令处理器
 * 将高级渲染命令转换为具体的Babylon.js操作
 * 支持序列号验证，防止过期命令的执行
 */

class CommandHandler {
  private entities: Map<EntityId, EntityRuntime>;
  private factory: EntityFactory;
  private scene: Scene;

  constructor(entities: Map<EntityId, EntityRuntime>, factory: EntityFactory, scene: Scene) {
    this.entities = entities;
    this.factory = factory;
    this.scene = scene;
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
      case "setName":
        this.handleSetName(cmd, entity);
        break;
      case "setProps":
        this.handleSetProps(cmd, entity);
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

  /** 生成实体 - 优先创建角色模型，失败则回退到球体 */
  private async handleSpawn(cmd: SpawnCmd): Promise<void> {
    console.log(`🎬 处理spawn命令:`, cmd);

    const exists = this.entities.get(cmd.entityId);
    if (exists && exists.lastSeq > cmd.seq) {
      console.log(`🎬 跳过旧序列号的spawn命令: ${cmd.entityId}`);
      return;
    }

    if (exists) {
      console.log(`🎬 销毁已存在的实体: ${cmd.entityId}`);
      this.disposeEntity(cmd.entityId);
    }

    const pos = new Vector3(cmd.position.x, cmd.position.y, cmd.position.z);

    try {
      console.log(`🎬 开始创建角色: ${cmd.entityId}`);
      // 默认创建角色，如果失败则回退到球体
      const entity = await this.factory.createCharacter(cmd.entityId, cmd.name, pos, cmd.props);
      entity.lastSeq = cmd.seq;
      this.entities.set(cmd.entityId, entity);
      console.log(`🎬 角色创建成功: ${cmd.entityId}`);
    } catch (error) {
      console.warn(`🎬 角色创建失败，回退到球体模式:`, error);
      const entity = this.factory.createSphere(cmd.entityId, cmd.name, pos, cmd.props);
      entity.lastSeq = cmd.seq;
      this.entities.set(cmd.entityId, entity);
      console.log(`🎬 球体创建成功: ${cmd.entityId}`);
    }
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
      const animationType = cmd.speed > 3 ? BuiltinAnimationType.RUN : BuiltinAnimationType.WALK;
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
      charEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE);
    }
  }

  /** 执行动作/技能 */
  private handleAction(cmd: ActionCmd, entity?: EntityRuntime): void {
    if (!entity || entity.lastSeq > cmd.seq) return;

    entity.lastSeq = cmd.seq;

    // 处理角色动作
    if (entity.type === "character") {
      const charEntity = entity as CharacterEntityRuntime;

      // 根据动作名称映射到动画
      switch (cmd.name) {
        case "jump":
          charEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.JUMP, {
            mode: "interrupt",
            onComplete: () => {
              charEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE);
            },
          });
          break;
        case "skill":
          // 如果有自定义动画数据，播放自定义动画
          if (cmd.params?.animationData) {
            charEntity.animationController.playCustomAnimation(cmd.params.animationData as CustomAnimationData, {
              mode: "interrupt",
              onComplete: () => {
                charEntity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE);
              },
            });
          }
          break;
        default:
          console.warn(`未知的动作类型: ${cmd.name}`);
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

  /** 更新实体名称 */
  private handleSetName(cmd: SetNameCmd, entity?: EntityRuntime): void {
    if (!entity || entity.lastSeq > cmd.seq) return;
    entity.lastSeq = cmd.seq;

    if (entity.label && entity.labelTexture) {
      const ctx = entity.labelTexture.getContext();
      ctx.clearRect(0, 0, entity.labelTexture.getSize().width, entity.labelTexture.getSize().height);
          ctx.font = "bold 28px system-ui, sans-serif";
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 4;
          ctx.strokeText(cmd.name, 8, 42);
          ctx.fillText(cmd.name, 8, 42);
      entity.labelTexture.update();
    }
  }

  /** 更新实体属性 */
  private handleSetProps(cmd: SetPropsCmd, entity?: EntityRuntime): void {
    if (!entity || entity.lastSeq > cmd.seq) return;
    entity.lastSeq = cmd.seq;

    // 设置可见性
        if (cmd.props.visible !== undefined) {
      entity.mesh.setEnabled(cmd.props.visible);
      entity.label?.setEnabled(cmd.props.visible);
        }

    // 设置颜色（仅对球体有效）
    if (cmd.props.color && entity.type === "sphere") {
          const c = Color3.FromHexString(cmd.props.color.startsWith("#") ? cmd.props.color : `#${cmd.props.color}`);
      let mat = (entity.mesh as Mesh).material as StandardMaterial | null;
          if (!(mat instanceof StandardMaterial) || !mat) {
        mat = new StandardMaterial(`mat:${cmd.entityId}`, this.scene);
        (entity.mesh as Mesh).material = mat;
          }
          mat.diffuseColor = c;
          mat.emissiveColor = c.scale(0.2);
        }

    // 设置半径（仅对球体有效）
    if (cmd.props.radius && entity.type === "sphere") {
      // TODO: 实现球体半径动态调整
      console.warn("球体半径动态调整暂未实现");
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
      const cameraCmd = {
        type: "camera_control",
        subType: "follow",
        data: {
          followEntityId: cmd.entityId,
          // 只有明确指定了才发送距离，否则保持当前距离
          ...(cmd.distance !== undefined && { distance: cmd.distance }),
          // 不发送默认角度，让相机控制器保持当前角度
          ...(cmd.verticalAngle !== undefined && { verticalAngle: cmd.verticalAngle }),
        },
      };
      window.dispatchEvent(
        new CustomEvent("cameraControl", {
          detail: cameraCmd,
        }),
      );
      console.log(`📹 发送相机跟随命令: ${cmd.entityId}，保持当前视角`, cameraCmd);
    }
  }

  /**
   * 销毁实体并清理所有相关资源
   * 包括动画组、网格、标签和纹理
   */
  private disposeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    console.log(`🗑️ 开始清理实体: ${id}`);

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

    console.log(`✅ 实体清理完成: ${id}`);
  }
}

// ==================== 渲染同步系统 ====================

/**
 * 渲染同步系统 - 仅负责将实体状态同步到渲染网格
 * 不进行物理计算，只根据实体的状态更新Babylon.js网格位置和朝向
 *
 * 注意：物理计算应该在GameEngine中完成，这里只做显示同步
 */
class RenderSyncSystem {
  /**
   * 同步所有实体的渲染状态
   * 仅将实体的physics状态同步到网格，不进行任何计算
   */
  syncEntities(entities: Map<EntityId, EntityRuntime>): void {
    entities.forEach((entity) => {
      this.syncEntityRender(entity);
    });
  }

  /**
   * 同步单个实体的渲染状态
   * 将实体的物理位置、朝向同步到Babylon.js网格
   */
  private syncEntityRender(entity: EntityRuntime): void {
    const physics = entity.physics;

    // 同步网格位置（直接使用physics.pos，不进行任何计算）
    entity.mesh.position.copyFrom(physics.pos);

    // 同步网格旋转
    if (entity.mesh instanceof Mesh || entity.mesh instanceof TransformNode) {
      entity.mesh.rotation.y = physics.yaw;
    }

    // 更新标签位置（在实体上方）
    if (entity.label) {
      entity.label.position = physics.pos.add(new Vector3(0, 0.6, 0));
    }
  }
}

// ==================== 主控制器 ====================

/**
 * 渲染控制器工厂函数
 * 创建并返回渲染控制器实例，集成所有子系统
 *
 * 架构说明：
 * - 物理计算在GameEngine中进行，这里只负责渲染同步
 * - 通过MessageChannel接收渲染命令，不直接使用window.dispatchEvent
 * - 相机控制通过自定义事件转发给ThirdPersonCameraController
 * - 实体状态通过命令模式更新，确保时序正确性
 */

export function createRendererController(scene: Scene): RendererController {
  const entities = new Map<EntityId, EntityRuntime>();
  const factory = new EntityFactory(scene);
  const commandHandler = new CommandHandler(entities, factory, scene);
  const renderSyncSystem = new RenderSyncSystem();

  function send(cmd: RendererCmd | RendererCmd[]): void {
    if (Array.isArray(cmd)) {
      cmd.forEach((c) => {
        commandHandler.handle(c).catch((error) => {
          console.error("RendererController: 处理命令失败", c, error);
        });
      });
    } else {
      commandHandler.handle(cmd).catch((error) => {
        console.error("RendererController: 处理命令失败", cmd, error);
      });
    }
  }

  /**
   * 渲染帧更新 - 仅同步实体状态到渲染网格
   * 不进行物理计算，物理计算应该在GameEngine中完成
   */
  function tick(dtSec: number): void {
    // 注意：这里不再进行物理计算，只同步渲染状态
    renderSyncSystem.syncEntities(entities);
  }

  /** 销毁所有实体并清理资源 */
  function dispose(): void {
    // 为每个实体发送销毁命令，复用现有逻辑
    entities.forEach((entity, id) => {
      commandHandler.handle({
        type: "destroy",
        entityId: id,
        seq: Number.MAX_SAFE_INTEGER, // 使用最大序列号确保执行
        ts: Date.now(),
      });
    });
    entities.clear();
  }

  function getEntityPose(id: EntityId) {
    const entity = entities.get(id);
    if (!entity) return undefined;
    return {
      pos: {
        x: entity.physics.pos.x,
        y: entity.physics.pos.y,
        z: entity.physics.pos.z,
      },
      yaw: entity.physics.yaw,
    };
  }

  return { send, tick, dispose, getEntityPose };
}

// ==================== 导出接口 ====================

export type { 
  CustomAnimationData, 
  AnimationPlayRequest, 
  CharacterEntityRuntime, 
  SimpleEntityRuntime,
  EntityRuntime,
  BaseEntityRuntime
};
export { CharacterAnimationController, EntityFactory, BuiltinAnimationType };
