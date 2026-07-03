/**
 * 渲染实体运行时类型（内容编排关注点）。
 *
 * 从 RendererController 拆出的共享类型：动画系统类型 + 实体运行时类型 + 内置动画枚举。
 * 各子系统（动画控制器 / 实体工厂 / 命令处理 / 渲染同步）共同引用本模块，避免相互直接耦合。
 */

import type { AbstractMesh, AnimationGroup, DynamicTexture, Mesh, TransformNode, Vector3 } from "~/lib/babylon/runtime";
import type { CharacterAnimationController } from "./CharacterAnimationController";

// ==================== 动画系统类型 ====================

/**
 * 内置动画类型 - GLB文件中包含的基础运动动画
 * 这些动画应该在character.glb模型文件中预定义
 */
export enum BuiltinAnimationType {
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

/** 动画播放请求 */
export interface AnimationPlayRequest {
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
export interface AnimationState {
	/** 当前播放的动画 */
	current: string | null;
	/** 排队的动画 */
	queue: AnimationPlayRequest[];
	/** 是否正在过渡 */
	transitioning: boolean;
	/** 上一个动画（用于过渡） */
	previous: string | null;
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
export interface CharacterEntityRuntime extends BaseEntityRuntime {
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
export interface SimpleEntityRuntime extends BaseEntityRuntime {
	type: "sphere" | "prop";
}

export type EntityRuntime = CharacterEntityRuntime | SimpleEntityRuntime;
