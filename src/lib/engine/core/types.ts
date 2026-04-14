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

// ==================== RuntimeConfig ====================

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

/**
 * 输出策略（设计意图；部分分支仍在 GameEngine 中逐步接入）。
 *
 * - `streamRealtime`：面向实时 UI 的持续输出语义。
 * - `collectFrameSnapshots`：面向批量/回放类输出的收集语义。
 * - `returnPreviewReport`：面向机体/技能预览的一次性报告语义。
 */
export type OutputPolicy =
	| "streamRealtime"
	| "collectFrameSnapshots"
	| "returnPreviewReport";

/** 探针策略 */
export type ProbePolicy =
	| "disabled"
	| "rollbackAfterSkillProbe";

/**
 * 引擎运行配置描述符。
 *
 * 常用预设：
 * - {@link createRealtimeConfig} — 时钟驱动、可接外部意图、实时快照流语义
 * - {@link createFastForwardConfig} — 非时钟快进、不接外部意图、适合全 AI 推演
 * - {@link createPreviewConfig} — 预览语义、探针回滚、产出预览报告
 *
 * 说明：`outputPolicy` 与部分字段的精细分支仍在引擎内对齐中；高频 `frame_snapshot`
 * 由 GameEngine 内快照观察器节流推送至主线程（非严格「每逻辑帧」），供 UI / 多控制器视图使用。
 */
export interface RuntimeConfig {
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

/**
 * 预设：实时模式（`driveMode: "clocked"`）。
 *
 * 模拟贴近真实时间的运行：由帧循环按 `targetFPS` 等驱动推进。
 *
 * 1. 时钟驱动、近似恒定节拍推进（受 `timeScale` / 跳帧上限等影响）。
 * 2. 当前实现下不因成员闲置而自动停帧；若后续增加「同步手动成员」类开关，行为以该字段为准。
 * 3. 按引擎内快照策略向主线程推送 `frame_snapshot`（节流），供 UI 与绑定成员视图，并非严格每逻辑帧、也不专指某一控制器类。
 * 4. `acceptExternalIntents: true`，成员可接收外部意图（如 `MemberController`）。
 */
export function createRealtimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
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

/**
 * 预设：快速流程模式（`driveMode: "unclocked"`）。
 *
 * 不等待墙钟：在单帧工作完成后尽快进入下一帧（分片推进以防长时间独占线程）。
 *
 * **使用预期**：场景内成员宜均由 AI 行为树驱动；若存在长期无 BT、无外部意图的成员，可能出现持续闲置（引擎不据此自动暂停，除非另行实现）。
 *
 * 1. 快进式推进（`unclocked`）。
 * 2. 当前实现下不因成员闲置而自动停帧。
 * 3. `outputPolicy: "collectFrameSnapshots"` 表示设计上的批量快照语义；具体收集与下发仍以 GameEngine 实现为准。主线程侧仍可能按快照观察器节流收到 `frame_snapshot`。
 * 4. `acceptExternalIntents: false`，不接受外部操控意图。
 */

export function createFastForwardConfig(
	stopPolicy: StopPolicy = { kind: "untilBattleEnd" },
	overrides?: Partial<RuntimeConfig>,
): RuntimeConfig {
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

/**
 * 预设：预览模式（`executionSemantics: "previewSafe"`）。
 *
 * 用于机体/装备变更后的属性与技能效果预览：在 `previewSafe` 下 Buff 等走简化语义，伤害类可出可读结果；配合 `probePolicy: "rollbackAfterSkillProbe"` 做探针后回滚。
 *
 * 1. 非时钟驱动（`unclocked`），按 `stopPolicy: untilSequencesDone` 等在短流程内跑完。
 * 2. 预览流程通常不强调「战斗闲置」语义；停步由停止策略与序列结束条件决定。
 * 3. **主输出**为预览报告（`outputPolicy: "returnPreviewReport"` / `PreviewReport` 路径），而非实时操控流；需要时仍可有节流的 `frame_snapshot` 供 UI，但不应理解为「每帧喂给控制器」。
 * 4. `acceptExternalIntents: false`，不接受外部操控意图。
 */

export function createPreviewConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
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
