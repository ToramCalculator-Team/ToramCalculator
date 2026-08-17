/**
 * 渲染实体运行时类型（内容编排关注点）。
 *
 * 从 RendererController 拆出的共享类型：动画系统类型 + 实体运行时类型。
 * 各子系统（动画控制器 / 实体工厂 / 命令处理 / 渲染同步）共同引用本模块，避免相互直接耦合。
 */

import type {
	AbstractMesh,
	AnimationGroup,
	Mesh,
	Skeleton,
	TransformNode,
	Vector3,
} from "~/platform/render/babylon/runtime";
import type { CharacterAnimationClips, CharacterLocomotionAnimation } from "../contracts/worldResource";
import type { CharacterAnimationController } from "./CharacterAnimationController";

/**
 * 自定义动画数据 - 从数据库获取的关键帧数据
 * 用于技能动画、表情动画等动态生成的动画
 */
export interface CustomAnimationData {
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

// ==================== 实体系统类型 ====================

/**
 * 实体运行时数据基类
 * 所有渲染实体的通用属性和物理状态
 */
export interface BaseEntityRuntime {
	/** 实体ID */
	id: string;
	/** 实体类型 */
	type: "character" | "sphere" | "prop";
	/** 实体世界变换根节点；不得携带模型资产自身的缩放或坐标轴转换。 */
	mesh: AbstractMesh | TransformNode;
	/** 名称标签 */
	label?: Mesh;
	/** 最后更新序列号 */
	lastSeq: number;
	/** 物理状态 */
	physics: {
		pos: Vector3;
		vel: Vector3;
		speed: number;
		moving: boolean;
		yaw: number;
	};
}

/**
 * 角色实体 - 支持动画的GLB模型
 * 包含完整的动画系统和自定义动画支持
 */
export interface CharacterEntityRuntime extends BaseEntityRuntime {
	type: "character";
	/** 语义动作到当前模型内嵌动画片段的映射，来自同版本 worldResources。 */
	animationClips: CharacterAnimationClips;
	/** 当前模型步态片段在 1 倍播放时对应的参考速度。 */
	locomotionAnimation: CharacterLocomotionAnimation;
	/** GLB模型中的动画组 */
	builtinAnimations: Map<string, AnimationGroup>;
	/** 自定义动画（运行时生成） */
	customAnimations: Map<string, AnimationGroup>;
	/** 当前角色独占的骨架；网格共享几何数据，但骨骼状态不能与模板或其他角色共享。 */
	ownedSkeletons: Skeleton[];
	/** 动画控制器 */
	animationController: CharacterAnimationController;
}

/** 创建动画控制器时的最小实体视图，解除实体与控制器之间的循环初始化。 */
export type CharacterAnimationTarget = Omit<CharacterEntityRuntime, "animationController">;

/**
 * 简单实体 - 球体等基础几何体
 * 用于测试和向后兼容
 */
export interface SimpleEntityRuntime extends BaseEntityRuntime {
	type: "sphere" | "prop";
}

export type EntityRuntime = CharacterEntityRuntime | SimpleEntityRuntime;
