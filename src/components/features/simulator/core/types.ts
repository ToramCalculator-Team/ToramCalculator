import { SimulatorWithRelationsSchema } from "@db/generated/repositories/simulator";
import { MEMBER_TYPE } from "@db/schema/enums";
import { z } from "zod/v4";
import {
	EventQueueConfigSchema,
	type QueueSnapshot,
	type QueueStats,
} from "./EventQueue/types";
import {
	FrameLoopConfigSchema,
	type FrameLoopSnapshot,
	type FrameLoopStats,
} from "./FrameLoop/types";
import type { JSProcessor } from "./JSProcessor/JSProcessor";
import type { MessageRouterStats } from "./MessageRouter/MessageRouter";
import type { PipelineRegistry } from "./Pipline/PipelineRegistry";
import type { StagePool } from "./Pipline/types";
import type { MemberSerializeData } from "./World/Member/Member";
import type { MemberContext } from "./World/Member/MemberContext";

/**
 * 引擎基础设施 -- 长期驻留的编译缓存和管线定义。
 * 在 Worker 级别持有，跨 GameEngine reset/cleanup 存活。
 */
export interface EngineInfrastructure {
	jsProcessor: JSProcessor;
	pipelineRegistry: PipelineRegistry<MemberContext, StagePool<MemberContext>>;
}

/**
 * 引擎状态枚举
 */
export type EngineState =
	| "unInitialized" // 未初始化
	| "initialized" // 已初始化
	| "running" // 运行中
	| "paused" // 已暂停
	| "stopped"; // 已停止

// ==================== SimulationProfile ====================

/** 帧驱动方式 */
export type DriveMode = "clocked" | "unclocked";

/** 执行语义 */
export type ExecutionSemantics = "full" | "previewSafe";

/** 停止策略 */
export type StopPolicy =
	| { kind: "manual" }
	| { kind: "untilFrame"; targetFrame: number }
	| { kind: "untilBattleEnd" }
	| { kind: "untilSequencesDone" };

/** 输出策略 */
export type OutputPolicy =
	| "streamRealtime"
	| "collectFrameSnapshots"
	| "returnPreviewReport";

/** 探针策略 */
export type ProbePolicy =
	| "disabled"
	| "rollbackAfterSkillProbe";

/**
 * 仿真配置描述符。
 * 多维度配置替代旧的 EngineMode / FrameLoopMode / enableIntentInput。
 */
export interface SimulationProfile {
	driveMode: DriveMode;
	executionSemantics: ExecutionSemantics;
	stopPolicy: StopPolicy;
	outputPolicy: OutputPolicy;
	probePolicy: ProbePolicy;
	acceptExternalIntents: boolean;
	targetFPS: number;
	timeScale: number;
	maxFrameSkip: number;
}

export function createRealtimeProfile(overrides?: Partial<SimulationProfile>): SimulationProfile {
	return {
		driveMode: "clocked",
		executionSemantics: "full",
		stopPolicy: { kind: "manual" },
		outputPolicy: "streamRealtime",
		probePolicy: "disabled",
		acceptExternalIntents: true,
		targetFPS: 60,
		timeScale: 1,
		maxFrameSkip: 5,
		...overrides,
	};
}

export function createFastForwardProfile(
	stopPolicy: StopPolicy = { kind: "untilBattleEnd" },
	overrides?: Partial<SimulationProfile>,
): SimulationProfile {
	return {
		driveMode: "unclocked",
		executionSemantics: "full",
		stopPolicy,
		outputPolicy: "collectFrameSnapshots",
		probePolicy: "disabled",
		acceptExternalIntents: false,
		targetFPS: 60,
		timeScale: 1,
		maxFrameSkip: 5,
		...overrides,
	};
}

export function createPreviewProfile(overrides?: Partial<SimulationProfile>): SimulationProfile {
	return {
		driveMode: "unclocked",
		executionSemantics: "previewSafe",
		stopPolicy: { kind: "untilSequencesDone" },
		outputPolicy: "returnPreviewReport",
		probePolicy: "rollbackAfterSkillProbe",
		acceptExternalIntents: false,
		targetFPS: 60,
		timeScale: 1,
		maxFrameSkip: 5,
		...overrides,
	};
}

// ==================== EngineScenarioData ====================

export const EngineScenarioDataSchema = z.object({
	simulator: SimulatorWithRelationsSchema,
	runtimeSelection: z.object({
		primaryMemberId: z.string(),
		activeCharacterId: z.string(),
	}),
});

export type EngineScenarioData = z.output<typeof EngineScenarioDataSchema>;

// ==================== EngineConfig ====================

/**
 * 引擎配置接口
 */
export const EngineConfigSchema = z.object({
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
		castingRange: z.number(),
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
	type: z.enum(MEMBER_TYPE),
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
				afterStageName: z.string(),
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
	/**
	 * 按控制器分组的快照（多控制器）
	 * - key: controllerId
	 * - value: 该控制器绑定成员的视图
	 */
	byController: z
		.record(
			z.string(),
			z.object({
				/** 绑定的成员ID */
				boundMemberId: z.string().nullable(),
				/** 绑定的成员详细视图（属性 + Buff） */
				boundMemberDetail: z
					.object({
						attrs: z.record(z.string(), z.unknown()),
						buffs: z.array(BuffViewDataSchema).optional(),
					})
					.nullable()
					.optional(),
				/** 绑定的成员技能计算结果 */
				boundMemberSkills: z.array(ComputedSkillInfoSchema),
			}),
		)
		.optional(),
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
 * 成员域事件（引擎内部）
 */
export const MemberDomainEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("state_changed"),
		memberId: z.string(),
		hp: z.number().nullable(),
		mp: z.number().nullable(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
				z: z.number(),
			})
			.optional(),
	}),
	z.object({
		type: z.literal("hit"),
		memberId: z.string(),
		damage: z.number(),
		hp: z.number().nullable(),
	}),
	z.object({
		type: z.literal("death"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("move_started"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("move_stopped"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("cast_progress"),
		memberId: z.string(),
		skillId: z.string(),
		progress: z.number(), // 0~1
	}),
	z.object({
		type: z.literal("skill_availability_changed"),
		memberId: z.string(),
		skillId: z.string(),
		available: z.boolean(),
	}),
	z.object({
		type: z.literal("skill_cast_denied"),
		memberId: z.string(),
		skillId: z.string(),
		reason: z.string(),
	}),
]);

export type MemberDomainEvent = z.output<typeof MemberDomainEventSchema>;

/**
 * 控制器域事件（已投影到 controllerId）
 */
export const ControllerDomainEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("state_changed"),
		controllerId: z.string(),
		memberId: z.string(),
		hp: z.number().nullable(),
		mp: z.number().nullable(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
				z: z.number(),
			})
			.optional(),
	}),
	z.object({
		type: z.literal("hit"),
		controllerId: z.string(),
		memberId: z.string(),
		damage: z.number(),
		hp: z.number().nullable(),
	}),
	z.object({
		type: z.literal("death"),
		controllerId: z.string(),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("move_started"),
		controllerId: z.string(),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("move_stopped"),
		controllerId: z.string(),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("cast_progress"),
		controllerId: z.string(),
		memberId: z.string(),
		skillId: z.string(),
		progress: z.number(),
	}),
	z.object({
		type: z.literal("skill_availability_changed"),
		controllerId: z.string(),
		memberId: z.string(),
		skillId: z.string(),
		available: z.boolean(),
	}),
	z.object({
		type: z.literal("skill_cast_denied"),
		controllerId: z.string(),
		memberId: z.string(),
		skillId: z.string(),
		reason: z.string(),
	}),
	z.object({
		type: z.literal("camera_follow"),
		controllerId: z.string(),
		entityId: z.string(),
	}),
]);

export type ControllerDomainEvent = z.output<typeof ControllerDomainEventSchema>;

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

// ==================== Checkpoint / Restore ====================

/**
 * 可检查点化接口。实现此接口的子系统支持状态捕获和恢复。
 * T 必须为 plain data（无函数、无闭包），以支持 postMessage 跨 Worker 传输。
 */
export interface Checkpointable<T> {
	captureCheckpoint(): T;
	restoreCheckpoint(checkpoint: T): void;
}

/** EventQueue 检查点：当前队列事件 + 统计 */
export interface EventQueueCheckpoint {
	events: Array<{
		id: string;
		insertFrame: number;
		executeFrame: number;
		type: string;
		processed: boolean;
		targetMemberId: string;
		fsmEventType: string;
		payload?: unknown;
	}>;
	totalSize: number;
	stats: {
		currentSize: number;
		totalProcessed: number;
		totalInserted: number;
	};
}

/** StatContainer 检查点：修饰符层 + 值 + 脏位 */
export interface StatContainerCheckpoint {
	values: Float64Array;
	flags: Uint32Array;
	dirtyBitmap: Uint32Array;
	modifierArrays: Float64Array[];
	modifierSources: Array<{
		modifierType: number;
		entries: Array<{
			attrIndex: number;
			sources: Array<{ sourceId: string; value: number }>;
		}>;
	}>;
}

/** StatusInstanceStore 检查点 */
export interface StatusInstanceStoreCheckpoint {
	instances: Array<{
		id: string;
		type: string;
		sourceId?: string;
		sourceSkillId?: string;
		appliedAtFrame: number;
		resolvedDurationFrames?: number;
		expiresAtFrame?: number;
		stacks?: number;
		tags?: string[];
		meta?: Record<string, unknown>;
	}>;
}

/** Member FSM 检查点（XState persisted snapshot） */
export type MemberFSMCheckpoint = unknown;

/** BtManager 检查点 */
export interface BtManagerCheckpoint {
	hasActiveEffect: boolean;
	activeEffectBtId?: string;
	activeEffectContext?: Record<string, unknown>;
	parallelEntries: Array<{
		name: string;
		btId: string;
		context: Record<string, unknown>;
	}>;
}

/** PipelineManager 检查点：动态 patch 状态（compiledChains 可从定义重建） */
export interface PipelineManagerCheckpoint {
	/** pipelineName -> afterStageName -> 插入条目（plain data） */
	dynamicStages: Record<
		string,
		Record<
			string,
			Array<{
				stageName: string;
				params?: Record<string, unknown>;
				insertedSeq: number;
			}>
		>
	>;
	insertedSeq: number;
	hasMemberOverrides: boolean;
	hasSkillOverrides: boolean;
}

/** DamageAreaSystem 检查点 */
export interface DamageAreaSystemCheckpoint {
	nextAreaId: number;
	instances: Array<{
		areaId: string;
		requestPayload: unknown;
		lastHitFrameByTargetId: Array<[string, number]>;
	}>;
}

/** DomainEventBus 检查点 */
export interface DomainEventBusCheckpoint {
	currentFrame: number;
	currentFrameEvents: Array<[string, MemberDomainEvent]>;
}

/** ControllerEventProjector 检查点 */
export interface ControllerEventProjectorCheckpoint {
	currentFrameEvents: Array<unknown>;
}

/** 单个成员的完整检查点 */
export interface MemberCheckpoint {
	memberId: string;
	fsm: MemberFSMCheckpoint;
	statContainer: StatContainerCheckpoint;
	statusStore: StatusInstanceStoreCheckpoint;
	btManager: BtManagerCheckpoint;
	pipelineManager: PipelineManagerCheckpoint;
	position: { x: number; y: number; z: number };
}

/** World 检查点 */
export interface WorldCheckpoint {
	members: MemberCheckpoint[];
	damageAreaSystem: DamageAreaSystemCheckpoint;
}

/** 引擎完整检查点 */
export interface EngineCheckpoint {
	frameNumber: number;
	timestamp: number;
	eventQueue: EventQueueCheckpoint;
	world: WorldCheckpoint;
	domainEventBus: DomainEventBusCheckpoint;
	controllerEventProjector: ControllerEventProjectorCheckpoint;
}

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
