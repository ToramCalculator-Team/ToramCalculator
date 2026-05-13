/**
 * 模拟器线程通信协议定义。
 *
 * 第一性原则：
 * 1. 同一条跨线程语义只能有一个定义源
 * 2. transport envelope、控制命令、RPC 请求、push 事件分层表达
 * 3. pool / engine / worker 只消费协议，不再各自重复建模
 */

import { z } from "zod/v4";
import type { EngineControlMessage } from "../GameEngineSM";
import { IntentMessageSchema } from "../MessageRouter/MessageRouter";
import { EngineScenarioDataSchema } from "../types";

// ==================== Branch Task ====================

/**
 * 分支任务：一次完整的 [loadScenario → restore → patch → execute → collect] 原子操作。
 * 提交为单次 WorkerPool.executeTask，保证在同一 Worker 上执行完整流程。
 */
export const ActionSpecSchema = z.object({
	skillId: z.string(),
});

export type ActionSpec = z.output<typeof ActionSpecSchema>;

export const BranchPatchSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("member_skills"),
		memberId: z.string(),
		skillIds: z.array(z.string()),
	}),
	z.object({
		type: z.literal("member_equipment"),
		memberId: z.string(),
		equipmentId: z.string(),
	}),
	z.object({
		type: z.literal("member_config"),
		memberId: z.string(),
		patch: z.record(z.string(), z.unknown()),
	}),
	z.object({
		type: z.literal("action_sequence"),
		memberId: z.string(),
		sequence: z.array(ActionSpecSchema),
	}),
]);

export type BranchPatch = z.output<typeof BranchPatchSchema>;

export const OutputSelectorSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("preview_report") }),
	z.object({ type: z.literal("dps_impact") }),
	z.object({ type: z.literal("member_attrs"), memberId: z.string(), fields: z.array(z.string()) }),
]);

export type OutputSelector = z.output<typeof OutputSelectorSchema>;

export const BranchTaskSchema = z.object({
	// 设计说明：checkpoint 只表达已加载引擎的运行态；分支 Worker 需要 scenarioData 先重建对象图。
	scenarioData: EngineScenarioDataSchema,
	checkpoint: z.unknown(),
	exprDict: z.array(z.tuple([z.string(), z.string()])),
	patches: z.array(BranchPatchSchema),
	runtimeConfig: z.record(z.string(), z.unknown()).optional(),
	outputSelector: OutputSelectorSchema,
});

export type BranchTask = z.output<typeof BranchTaskSchema>;

export const BranchResultSchema = z.object({
	outputType: z.string(),
	memberId: z.string().optional(),
	damage: z.number().optional(),
	dpsDelta: z.number().optional(),
	dpsPercent: z.string().optional(),
	attrs: z.record(z.string(), z.unknown()).optional(),
	skillProbes: z.array(z.unknown()).optional(),
	error: z.string().optional(),
});

export type BranchResult = z.output<typeof BranchResultSchema>;

// ==================== Push / Stream ====================

/**
 * Worker 主动推送到主线程的顶层消息类型。
 * 所有 stream / push 消息都必须复用此枚举，禁止在调用侧重复手写联合类型。
 */
export const PushMessageType = [
	"engine_state_machine",
	"engine_telemetry",
	"render_cmd",
	"domain_event_batch",
	"system_event",
	"frame_snapshot",
	"debug_view_frame",
] as const;

export type PushMessageType = (typeof PushMessageType)[number];

/**
 * Worker 主动推送消息的严格 schema。
 * 这是业务层对 WorkerPool 通用 envelope 的细化。
 */
export const WorkerSystemMessageSchema = z.object({
	type: z.enum(PushMessageType),
	data: z.unknown(),
	belongToTaskId: z.string().optional(),
});

export type WorkerSystemMessage = z.output<typeof WorkerSystemMessageSchema>;

export const EngineTelemetrySchema = z.object({
	frameNumber: z.number(),
	runTime: z.number(),
	fps: z.number(),
	memberCount: z.number(),
});

export type EngineTelemetry = z.output<typeof EngineTelemetrySchema>;

export const ControllerDomainEventBatchSchema = z.object({
	type: z.literal("controller_domain_event_batch"),
	frameNumber: z.number(),
	events: z.array(z.any()),
});

export type ControllerDomainEventBatch = z.output<typeof ControllerDomainEventBatchSchema>;

// ==================== Engine RPC ====================

/**
 * 线程池任务优先级。
 * batchPool、单引擎专属 worker、worker 侧入口都必须共享这一组定义。
 */
export const SimulatorTaskPriority = ["high", "medium", "low"] as const;
export type SimulatorTaskPriority = (typeof SimulatorTaskPriority)[number];

/**
 * 主线程发送给 worker 的引擎 RPC 请求。
 *
 * 这里承载的是请求-响应型能力：
 * - 查询
 * - 写入配置
 * - 预览与检查点操作
 */
export const EngineRPCSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("get_members"),
	}),
	z.object({
		type: z.literal("get_member_skill_list"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("get_stats"),
	}),
	z.object({
		type: z.literal("get_snapshot"),
	}),
	z.object({
		type: z.literal("get_member_state"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("send_intent"),
		intent: IntentMessageSchema,
	}),
	z.object({
		type: z.literal("subscribe_debug_view"),
		controllerId: z.string(),
		memberId: z.string(),
		viewType: z.enum(["stat_container_export"]),
		hz: z.number().optional(),
		fields: z.array(z.string()).optional(),
	}),
	z.object({
		type: z.literal("unsubscribe_debug_view"),
		viewId: z.string(),
	}),
	z.object({
		type: z.literal("get_render_snapshot"),
		includeAreas: z.boolean().optional(),
	}),
	z.object({
		type: z.literal("load_scenario"),
		data: EngineScenarioDataSchema,
	}),
	z.object({
		type: z.literal("set_runtime_config"),
		config: z.unknown(),
	}),
	z.object({
		type: z.literal("patch_member"),
		memberId: z.string(),
		memberData: z.unknown(),
	}),
	z.object({
		type: z.literal("run_preview"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("get_computed_skills"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("capture_checkpoint"),
	}),
	z.object({
		type: z.literal("get_initialization_data"),
	}),
	z.object({
		type: z.literal("restore_checkpoint"),
		checkpoint: z.unknown(),
	}),
	z.object({
		type: z.literal("export_expr_dict"),
	}),
	z.object({
		type: z.literal("import_expr_dict"),
		entries: z.unknown(),
	}),
	z.object({
		type: z.literal("branch_task"),
		task: BranchTaskSchema,
	}),
]);

export type EngineRPC = z.output<typeof EngineRPCSchema>;

/**
 * WorkerPool 的任务路由类型映射。
 * 这是 transport 层对“控制命令”和“Engine RPC 请求”的唯一并行建模。
 */
export interface SimulatorTaskMap {
	engine_command: EngineControlMessage;
	engine_rpc: EngineRPC;
}

export type SimulatorTaskTypeMapKey = keyof SimulatorTaskMap;
export type SimulatorTaskTypeMapValue = SimulatorTaskMap[SimulatorTaskTypeMapKey];
