import type { EventObject } from "xstate";
import { z } from "zod/v4";
import { TerrainDefinitionSchema } from "~/lib/terrain";
import type { EventCatalog } from "./Event/EventCatalog";
import type { TagRegistry } from "./Event/TagRegistry";
import { EventQueueConfigSchema, type QueueSnapshot, type QueueStats } from "./EventQueue/types";
import { EngineScenarioSchema } from "./engineScenarioSchema";
import { FrameLoopConfigSchema, type FrameLoopSnapshot, type FrameLoopStats } from "./FrameLoop/types";
import type { JSProcessor } from "./JSProcessor/JSProcessor";
import type { MessageRouterStats } from "./MessageRouter/MessageRouter";
import type { PipelineCatalog } from "./Pipeline/PipelineCatalog";
import type { PipelineResolverService } from "./Pipeline/PipelineResolverService";
import type { MemberSnapshot } from "./World/Member/Member";
import type { ModifierSource } from "./World/Member/runtime/AttributeContainer/AttributeContainerTypes";

/**
 * 引擎基础设施 -- 长期驻留的编译缓存和管线定义。
 * 在 Worker 级别持有，跨 GameEngine reset/cleanup 存活。
 */
export interface EngineInfrastructure {
	jsProcessor: JSProcessor;
	pipelineCatalog: PipelineCatalog;
	pipelineResolverService: PipelineResolverService;
	/** 标签/事件位索引注册表；proc mask 与 damage tag 共用。 */
	tagRegistry: TagRegistry;
	/** 事件目录：订阅位索引 + payload schema。 */
	eventCatalog: EventCatalog;
}

// ==================== RuntimeConfig ====================

/** 帧驱动方式 */
export const DriveModeSchema = z.enum(["clocked", "unclocked"]);
export type DriveMode = z.output<typeof DriveModeSchema>;

/** 停止策略 */
export const StopPolicySchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("manual") }),
	z.object({ kind: z.literal("untilTimeMs"), targetTimeMs: z.number().nonnegative() }),
	z.object({ kind: z.literal("untilBattleEnd") }),
	z.object({ kind: z.literal("untilSequencesDone") }),
	z.object({ kind: z.literal("untilMemberActionEnds"), memberId: z.string() }),
	z.object({ kind: z.literal("untilMemberAiBehaviorEnds"), memberId: z.string() }),
]);
export type StopPolicy = z.output<typeof StopPolicySchema>;

/**
 * 引擎运行配置描述符。
 *
 * 本契约只描述引擎执行机制。实时投影频率和执行记录策略使用各自独立契约，
 * 不能通过业务用途模式改变运行语义。
 */
export const RuntimeConfigSchema = z.object({
	driveMode: DriveModeSchema,
	stopPolicy: StopPolicySchema,
	acceptExternalIntents: z.boolean(),
	logicHz: z.number().positive(),
	timeScale: z.number().positive(),
	maxCatchUpTicks: z.number().int().positive(),
});
export type RuntimeConfig = z.output<typeof RuntimeConfigSchema>;

/**
 * 单次逻辑 tick 的权威时间上下文。
 *
 * 设计说明：
 * - currentTimeMs 是规则系统读取的时间源。
 * - tickIndex 只用于排序、日志、回放定位和 checkpoint。
 * - deltaTimeMs 让 BT wait、区域轨迹和未来连续效果都能脱离 wall-clock。
 */
export interface SimulationTickContext {
	tickIndex: number;
	currentTimeMs: number;
	deltaTimeMs: number;
}

/**
 * 预设：实时模式（`driveMode: "clocked"`）。
 *
 * 模拟贴近真实时间的运行：由时钟循环按 `logicHz` 等驱动推进。
 *
 * 1. 时钟驱动、近似恒定节拍推进（受 `timeScale` / 跳帧上限等影响）。
 * 2. 当前实现下不因成员闲置而自动停帧；若后续增加「同步手动成员」类开关，行为以该字段为准。
 * 3. 实时 Session 显式附加 latest-state SAB，UI 与渲染器允许跳过中间提交。
 * 4. `acceptExternalIntents: true`，成员可接收外部意图（如 `MemberController`）。
 */
export function createRealtimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
	return {
		driveMode: "clocked",
		stopPolicy: { kind: "manual" },
		acceptExternalIntents: true,
		logicHz: 60,
		timeScale: 1,
		maxCatchUpTicks: 5,
		...overrides,
	};
}
// ==================== EngineScenarioData ====================

export const EngineScenarioDataSchema = z.object({
	scenario: EngineScenarioSchema,
	terrain: TerrainDefinitionSchema,
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
	/** 当前逻辑 tick 序号 */
	tickIndex: number;
	/** 当前模拟时间（毫秒） */
	currentTimeMs: number;
	/** 运行时间（毫秒） */
	runTime: number;
	/** 成员 */
	members: MemberSnapshot[];
	/** 事件队列统计 */
	eventQueueStats: QueueStats;
	/** 帧循环统计 */
	frameLoopStats: FrameLoopStats;
	/** 消息路由统计 */
	messageRouterStats: MessageRouterStats;
}

/**
 * 单 tick 执行结果
 * FrameLoop 在每次调用 engine.stepTick 后，使用该结果更新统计与快照
 */
export interface TickStepResult {
	/** 本次执行处理的 tick 序号 */
	tickIndex: number;
	/** 本次执行处理的模拟时间（毫秒） */
	currentTimeMs: number;
	/** 本 tick 逻辑执行耗时（毫秒） */
	duration: number;
	/** 本 tick 处理的事件数量 */
	eventsProcessed: number;
	/** 本 tick 更新的成员数量 */
	membersUpdated: number;
	/** 是否仍有当前时间片待处理事件 */
	hasPendingEvents: boolean;
	/** 当前仍挂起的 tick 内任务数量（pendingTickTasksCount） */
	pendingTickTasks: number;
}

/** Member FSM 对技能输入的稳定拒绝原因；预览、运行记录和 UI 只消费该事实，不重复推导条件。 */
export const SkillRejectionReasonSchema = z.enum([
	"skill_not_found",
	"variant_not_found",
	"no_active_behavior",
	"cooldown_active",
	"cost_resolution_failed",
	"insufficient_hp",
	"insufficient_mp",
	"member_busy",
]);
export type SkillRejectionReason = z.output<typeof SkillRejectionReasonSchema>;

/** Member FSM 对目标切换输入的稳定拒绝原因。 */
export const TargetSelectionRejectionReasonSchema = z.enum(["target_not_found", "target_unchanged"]);
export type TargetSelectionRejectionReason = z.output<typeof TargetSelectionRejectionReasonSchema>;

/**
 * 帧快照接口 - 包含引擎和所有成员的完整状态
 */
export interface GameEngineSnapshot {
	tickIndex: number;
	currentTimeMs: number;
	timestamp: number;
	engine: {
		tickIndex: number;
		currentTimeMs: number;
		runTime: number;
		frameLoop: FrameLoopSnapshot;
		eventQueue: QueueSnapshot;
		memberCount: number;
	};
	members: MemberSnapshot[];
}

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
		sourceMemberId: z.string(),
		sourceSkillId: z.string().nullable(),
		damage: z.number(),
		hp: z.number().nullable(),
	}),
	z.object({
		type: z.literal("status_entered"),
		memberId: z.string(),
		statusType: z.string(),
		sourceId: z.string().optional(),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("status_exited"),
		memberId: z.string(),
		statusType: z.string(),
		reason: z.enum(["expired", "removed"]),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("skill_cast_accepted"),
		memberId: z.string(),
		skillId: z.string(),
		targetId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("skill_input_rejected"),
		memberId: z.string(),
		skillId: z.string(),
		inputId: z.string().optional(),
		reason: SkillRejectionReasonSchema,
	}),
	z.object({
		type: z.literal("target_selection_accepted"),
		memberId: z.string(),
		targetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("target_selection_rejected"),
		memberId: z.string(),
		requestedTargetId: z.string(),
		inputId: z.string(),
		reason: TargetSelectionRejectionReasonSchema,
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
		type: z.literal("skill_cast_denied"),
		memberId: z.string(),
		skillId: z.string(),
		reason: SkillRejectionReasonSchema,
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
		type: z.literal("status_entered"),
		controllerId: z.string(),
		memberId: z.string(),
		statusType: z.string(),
		sourceId: z.string().optional(),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("status_exited"),
		controllerId: z.string(),
		memberId: z.string(),
		statusType: z.string(),
		reason: z.enum(["expired", "removed"]),
		timeMs: z.number(),
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
		type: z.literal("skill_cast_accepted"),
		controllerId: z.string(),
		memberId: z.string(),
		skillId: z.string(),
		targetId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("skill_input_rejected"),
		controllerId: z.string(),
		memberId: z.string(),
		skillId: z.string(),
		inputId: z.string().optional(),
		reason: SkillRejectionReasonSchema,
	}),
	z.object({
		type: z.literal("target_selection_accepted"),
		controllerId: z.string(),
		memberId: z.string(),
		targetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("target_selection_rejected"),
		controllerId: z.string(),
		memberId: z.string(),
		requestedTargetId: z.string(),
		inputId: z.string(),
		reason: TargetSelectionRejectionReasonSchema,
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
		tickIndex: z.number(),
		currentTimeMs: z.number(),
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
		insertedAtMs: number;
		executeAtMs: number;
		type: string;
		processed: boolean;
		targetMemberId: string;
		fsmEvent: EventObject;
	}>;
	totalSize: number;
	stats: {
		currentSize: number;
		totalProcessed: number;
		totalInserted: number;
	};
}

/** AttributeContainer 检查点：修饰符层 + 值 + 脏位 */
export interface AttributeContainerCheckpoint {
	values: Float64Array;
	flags: Uint32Array;
	dirtyBitmap: Uint32Array;
	modifierArrays: Float64Array[];
	modifierSources: Array<{
		modifierType: number;
		entries: Array<{
			attrIndex: number;
			sources: Array<{ source: ModifierSource; value: number }>;
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
		appliedAtMs: number;
		resolvedDurationMs?: number;
		expiresAtMs?: number;
		tags?: string[];
	}>;
}

/** Member FSM 检查点（XState persisted snapshot） */
export type MemberFSMCheckpoint = unknown;

/**
 * BtManager 检查点。
 *
 * 设计说明：BT agent 普通字段不承载可 checkpoint 状态；跨帧数值状态通过行为树
 * `attributeSlots` 进入成员 AttributeContainer，并随 `MemberCheckpoint.attributeContainer` 保存。
 */
export interface BtManagerCheckpoint {
	hasActiveEffect: boolean;
	activeEffectBtId?: string;
	parallelEntries: Array<{
		name: string;
		btId: string;
	}>;
}

/** DamageAreaSystem 检查点 */
export interface DamageAreaSystemCheckpoint {
	nextAreaId: number;
	instances: Array<{
		areaId: string;
		requestPayload: unknown;
		resolvedRange: unknown;
		durationMs: number;
		lastHitTimeMsByTargetId: Array<[string, number]>;
		damageCountByTargetId: Array<[string, number]>;
	}>;
}

/** DomainEventBus 检查点 */
export interface DomainEventBusCheckpoint {
	tickIndex: number;
	currentTickEvents: Array<[string, MemberDomainEvent]>;
}

/** ControllerEventProjector 检查点 */
export interface ControllerEventProjectorCheckpoint {
	currentTickEvents: Array<unknown>;
}

/** 单个成员的完整检查点 */
export interface MemberCheckpoint {
	memberId: string;
	fsm: MemberFSMCheckpoint;
	attributeContainer: AttributeContainerCheckpoint;
	statusStore: StatusInstanceStoreCheckpoint;
	btManager: BtManagerCheckpoint;
	pipelineOverlays: unknown;
	position: { x: number; y: number; z: number };
	/** 共享 runtime（plain data，可 postMessage） */
	runtime: unknown;
}

/** World 检查点 */
export interface WorldCheckpoint {
	members: MemberCheckpoint[];
	damageAreaSystem: DamageAreaSystemCheckpoint;
}

/** 引擎完整检查点 */
export interface EngineCheckpoint {
	tickIndex: number;
	currentTimeMs: number;
	timestamp: number;
	eventQueue: EventQueueCheckpoint;
	world: WorldCheckpoint;
	domainEventBus: DomainEventBusCheckpoint;
	controllerEventProjector: ControllerEventProjectorCheckpoint;
	/** 确定性 PRNG 状态（xorshift128 四元组） */
	randomState: { x: number; y: number; z: number; w: number };
}

/**
 * 战斗快照接口
 */
export interface BattleSnapshot {
	/** 快照时间戳 */
	timestamp: number;
	/** 逻辑 tick 序号 */
	tickIndex: number;
	/** 当前模拟时间（毫秒） */
	currentTimeMs: number;
	/** 所有成员状态 */
	members: Array<MemberSnapshot>;
	/** 战斗状态 */
	battleStatus: {
		isEnded: boolean;
		winner?: string;
		reason?: string;
	};
}
