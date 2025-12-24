import { QueueSnapshot, QueueStats } from "./EventQueue/types";
import { FrameLoopSnapshot, FrameLoopStats } from "./FrameLoop/types";
import { MemberSerializeData } from "./Member/Member";
import { MessageRouterStats } from "./MessageRouter/MessageRouter";
import { z } from "zod/v4";
import { EventQueueConfigSchema } from "./EventQueue/types";
import { FrameLoopConfigSchema } from "./FrameLoop/types";

/**
 * 引擎状态枚举
 */
export type EngineState =
	| "unInitialized" // 未初始化
	| "initialized" // 已初始化
	| "running" // 运行中
	| "paused" // 已暂停
	| "stopped"; // 已停止

/**
 * 引擎配置接口
 */
export const EngineConfigSchema = z.object({
	enableRealtimeControl: z.boolean(),
	eventQueueConfig: EventQueueConfigSchema,
	frameLoopConfig: FrameLoopConfigSchema,
});
export type EngineConfig = z.output<typeof EngineConfigSchema>;

/**
 * 引擎统计信息接口
 */
export interface EngineStats {
	/** 引擎状态 */
	SMState: string; // 待优化
	/** 当前帧号 */
	currentFrame: number;
	/** 运行时间（毫秒） */
	runTime: number;
	/** 成员 */
	members: MemberSerializeData[];
	/** 事件队列统计 */
	eventQueueStats: QueueStats;
	/** 帧循环统计 */
	frameLoopStats: FrameLoopStats;
	/** 消息路由统计 */
	messageRouterStats: MessageRouterStats;
}

/**
 * 单帧执行结果
 * FrameLoop 在每次调用 engine.stepFrame 后，使用该结果更新统计与快照
 */
export interface FrameStepResult {
	/** 本次执行处理的帧号 */
	frameNumber: number;
	/** 本帧逻辑执行耗时（毫秒） */
	duration: number;
	/** 本帧处理的事件数量 */
	eventsProcessed: number;
	/** 本帧更新的成员数量 */
	membersUpdated: number;
	/** 是否仍有当前帧待处理事件（executeFrame 等于当前帧且未 processed） */
	hasPendingEvents: boolean;
	/** 当前仍挂起的帧内任务数量（pendingFrameTasksCount） */
	pendingFrameTasks: number;
}

/**
 * 技能计算数据 - 预计算的动态值，用于UI显示
 */
export const ComputedSkillInfoSchema = z.object({
	id: z.string(),
	name: z.string(),
	level: z.number(),
	computed: z.object({
		mpCost: z.number(),
		hpCost: z.number(),
		castingRange: z.string().nullable(),
		cooldownRemaining: z.number(),
		isAvailable: z.boolean(),
	}),
});
export type ComputedSkillInfo = z.output<typeof ComputedSkillInfoSchema>;

/**
 * 帧快照接口 - 包含引擎和所有成员的完整状态
 */
export interface GameEngineSnapshot {
	frameNumber: number;
	timestamp: number;
	engine: {
		frameNumber: number;
		runTime: number;
		frameLoop: FrameLoopSnapshot;
		eventQueue: QueueSnapshot;
		memberCount: number;
	};
	members: MemberSerializeData[];
}

/**
 * 高频成员快照 - 面向渲染和即时交互
 * 仅包含 UI 需要的基础字段（位置 / HP / MP 等）
 */
export const RealtimeMemberSnapshotSchema = z.object({
	id: z.string(),
	type: z.string(),
	name: z.string(),
	position: z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	}),
	campId: z.string(),
	teamId: z.string(),
	hp: z.object({
		current: z.number(),
		max: z.number(),
	}),
	mp: z.object({
		current: z.number(),
		max: z.number(),
	}),
});

export type RealtimeMemberSnapshot = z.output<
	typeof RealtimeMemberSnapshotSchema
>;

/**
 * Buff 视图数据 Schema - 与 BuffViewData 对齐
 */
export const BuffViewDataSchema = z.object({
	id: z.string(),
	name: z.string(),
	duration: z.number(),
	startTime: z.number(),
	currentStacks: z.number().optional(),
	maxStacks: z.number().optional(),
	source: z.string().optional(),
	description: z.string().optional(),
	variables: z.record(z.string(), z.number()).optional(),
	dynamicEffects: z
		.array(
			z.object({
				pipelineName: z.string(),
				afterActionName: z.string(),
				priority: z.number().optional(),
			}),
		)
		.optional(),
	activeDynamicActions: z.any().optional(),
});

export type BuffViewDataSnapshot = z.output<typeof BuffViewDataSchema>;

/**
 * 高频帧快照 - 用于 frame_snapshot 通道
 * 将来 SAB 也会以此结构为基础设计布局
 */
export const FrameSnapshotSchema = z.object({
	/** 逻辑帧号 */
	frameNumber: z.number(),
	/** 时间戳（毫秒） */
	timestamp: z.number(),
	engine: z.object({
		frameNumber: z.number(),
		runTime: z.number(),
		fps: z.number(),
	}),
	/** 所有成员的高频视图 */
	members: z.array(RealtimeMemberSnapshotSchema),
	/** 当前选中成员ID（主控目标），用于技能栏绑定 */
	selectedMemberId: z.string().nullable(),
	/** 仅当前选中成员的技能计算结果 */
	selectedMemberSkills: z.array(ComputedSkillInfoSchema),
	/**
	 * 当前选中成员的详细视图（属性 + Buff）
	 * 仅在 selectedMemberId 不为 null 时提供
	 */
	selectedMemberDetail: z
		.object({
			attrs: z.record(z.string(), z.unknown()),
			buffs: z.array(BuffViewDataSchema).optional(),
		})
		.nullable()
		.optional(),
});

export type FrameSnapshot = z.output<typeof FrameSnapshotSchema>;

/**
 * 引擎统计完整类型
 * 扩展的引擎统计信息，支持动态属性
 */
export const EngineStatsFullSchema = z
	.object({
		currentFrame: z.number(),
	})
	.passthrough();

export type EngineStatsFull = z.output<typeof EngineStatsFullSchema>;

/**
 * 战斗快照接口
 */
export interface BattleSnapshot {
	/** 快照时间戳 */
	timestamp: number;
	/** 帧号 */
	frameNumber: number;
	/** 所有成员状态 */
	members: Array<MemberSerializeData>;
	/** 战斗状态 */
	battleStatus: {
		isEnded: boolean;
		winner?: string;
		reason?: string;
	};
}
