/**
 * 模拟器线程通信协议定义。
 *
 * 请求、成功响应和运行时解析器必须在本文件成对出现。常驻引擎与池化任务共享协议，
 * 但各自管理 Worker 生命周期（ADR 0040）。
 */

import { z } from "zod/v4";
import { EngineMemberSchema } from "../engineScenarioSchema";
import {
	type EngineExecutionError,
	EngineExecutionErrorSchema,
	type EngineLifecycleCommand,
	type EngineLifecycleResult,
	EngineLifecycleResultSchema,
	FastForwardOptionsSchema,
	type FastForwardResult,
	FastForwardResultSchema,
	isMatchingLifecycleResult,
} from "../GameEngineSM";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import { EngineRunOutputSchema, ExecutionRecordingPolicySchema } from "../runOutput";
import { SimulationTaskResultSchema, SimulationTaskSchema } from "../simulationTask";
import { RuntimeConfigSchema } from "../types";
import { MemberSnapshotSchema } from "../World/Member/Member";
import { RenderSnapshotSchema } from "./RendererProtocol";

// ==================== Push / Stream ====================

export const PushMessageType = [
	"engine_lifecycle_snapshot",
	"engine_telemetry",
	"render_cmd",
	"domain_event_batch",
	"system_event",
	"frame_snapshot",
	"debug_view_frame",
] as const;
export type PushMessageType = (typeof PushMessageType)[number];

export const WorkerSystemMessageSchema = z.object({
	type: z.enum(PushMessageType),
	data: z.unknown(),
	belongToTaskId: z.string().optional(),
});
export type WorkerSystemMessage = z.output<typeof WorkerSystemMessageSchema>;

export const EngineTelemetrySchema = z.object({
	tickIndex: z.number(),
	currentTimeMs: z.number(),
	runTime: z.number(),
	ticksPerSecond: z.number(),
	memberCount: z.number(),
});
export type EngineTelemetry = z.output<typeof EngineTelemetrySchema>;

export const ControllerDomainEventBatchSchema = z.object({
	type: z.literal("controller_domain_event_batch"),
	tickIndex: z.number(),
	events: z.array(z.unknown()),
});
export type ControllerDomainEventBatch = z.output<typeof ControllerDomainEventBatchSchema>;

// ==================== Engine RPC ====================

export class EngineTransportError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message, { cause });
		this.name = "EngineTransportError";
	}
}

export class EngineProtocolError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message, { cause });
		this.name = "EngineProtocolError";
	}
}

export { EngineExecutionErrorSchema, FastForwardOptionsSchema, FastForwardResultSchema };
export type { EngineExecutionError, FastForwardResult };

/** 命令式便利 API 把合法 Engine 失败转成异常时使用，不与 transport/protocol 故障混淆。 */
export class EngineExecutionFailure extends Error {
	readonly executionError: EngineExecutionError;

	constructor(error: EngineExecutionError) {
		super(error.message);
		this.name = "EngineExecutionFailure";
		this.executionError = error;
	}
}

export const EngineTaskPriority = ["high", "medium", "low"] as const;
export type EngineTaskPriority = (typeof EngineTaskPriority)[number];

export const MemberSkillSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	level: z.number().int().nonnegative(),
});
export type MemberSkillSummary = z.output<typeof MemberSkillSummarySchema>;

const IntentWireBaseShape = {
	id: z.string().min(1),
	controllerId: z.string().min(1),
	timestamp: z.number(),
};

/** send_intent 的唯一 wire codec；FSM、Controller 和 MessageRouter 只消费 TypeScript 事件类型。 */
const IntentMessageWireSchema = z.discriminatedUnion("type", [
	z.object({
		...IntentWireBaseShape,
		type: z.literal("复活"),
		data: z.object({}).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("移动"),
		data: z.object({ position: z.object({ x: z.number(), y: z.number() }).strict() }).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("停止移动"),
		data: z.object({}).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("使用技能"),
		data: z.object({ skillId: z.string().min(1) }).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("使用格挡"),
		data: z.object({}).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("结束格挡"),
		data: z.object({}).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("使用闪躲"),
		data: z.object({}).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("切换目标"),
		data: z.object({ targetId: z.string().min(1) }).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("绑定控制对象"),
		data: z.object({ memberId: z.string().min(1) }).strict(),
	}),
	z.object({
		...IntentWireBaseShape,
		type: z.literal("解绑控制对象"),
		data: z.object({}).strict(),
	}),
]) satisfies z.ZodType<IntentMessage>;

export const EngineRPCSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("get_members") }),
	z.object({ type: z.literal("get_member_skill_list"), memberId: z.string() }),
	z.object({ type: z.literal("send_intent"), intent: IntentMessageWireSchema }),
	z.object({
		type: z.literal("subscribe_debug_view"),
		controllerId: z.string(),
		memberId: z.string(),
		viewType: z.enum(["stat_container_export"]),
		hz: z.number().positive().optional(),
		fields: z.array(z.string()).optional(),
	}),
	z.object({ type: z.literal("unsubscribe_debug_view"), viewId: z.string() }),
	z.object({ type: z.literal("get_render_snapshot"), includeAreas: z.boolean().optional() }),
	z.object({ type: z.literal("set_runtime_config"), config: RuntimeConfigSchema }),
	z.object({ type: z.literal("patch_member"), memberId: z.string(), memberData: EngineMemberSchema }),
	z.object({ type: z.literal("execute_simulation_task"), task: SimulationTaskSchema }),
	z.object({
		type: z.literal("start_run_output"),
		runId: z.string(),
		recordingPolicy: ExecutionRecordingPolicySchema,
	}),
	z.object({ type: z.literal("finish_run_output"), runId: z.string() }),
	z.object({ type: z.literal("cancel_run_output"), runId: z.string() }),
	z.object({ type: z.literal("acknowledge_run_output"), runId: z.string() }),
	z.object({ type: z.literal("set_realtime_snapshot_hz"), snapshotHz: z.number().nonnegative() }),
]);
export type EngineRPC = z.output<typeof EngineRPCSchema>;
export type EngineRPCType = EngineRPC["type"];
export type EngineRPCRequest<TType extends EngineRPCType> = Extract<EngineRPC, { type: TType }>;

/** 成功响应 Schema 的唯一索引；`satisfies` 保证每个请求类型都有且只有一份响应契约。 */
export const EngineRPCDataSchemaByType = {
	get_members: z.array(MemberSnapshotSchema),
	get_member_skill_list: z.array(MemberSkillSummarySchema),
	send_intent: z.undefined(),
	subscribe_debug_view: z.object({ viewId: z.string() }),
	unsubscribe_debug_view: z.undefined(),
	get_render_snapshot: RenderSnapshotSchema,
	set_runtime_config: z.undefined(),
	patch_member: z.undefined(),
	execute_simulation_task: SimulationTaskResultSchema,
	start_run_output: z.undefined(),
	finish_run_output: EngineRunOutputSchema,
	cancel_run_output: z.undefined(),
	acknowledge_run_output: z.undefined(),
	set_realtime_snapshot_hz: z.undefined(),
} as const satisfies Record<EngineRPCType, z.ZodType>;

export type EngineRPCData<TType extends EngineRPCType> = z.output<(typeof EngineRPCDataSchemaByType)[TType]>;
export type EngineRPCResult<TType extends EngineRPCType> =
	| { success: true; data: EngineRPCData<TType> }
	| { success: false; error: EngineExecutionError };

export const EngineRPCWireResultSchema = z.discriminatedUnion("success", [
	z.object({ success: z.literal(true), data: z.unknown() }),
	z.object({ success: z.literal(false), error: EngineExecutionErrorSchema }),
]);
export type EngineRPCWireResult = z.output<typeof EngineRPCWireResultSchema>;

/** 在主线程跨线程边界恢复请求与响应的静态关联，并执行对应的运行时校验。 */
export function parseEngineRPCResult<TType extends EngineRPCType>(type: TType, value: unknown): EngineRPCResult<TType> {
	const wireResult = EngineRPCWireResultSchema.safeParse(value);
	if (!wireResult.success) {
		throw new EngineProtocolError(`Invalid Engine RPC result envelope for ${type}`, wireResult.error);
	}
	if (!wireResult.data.success) return wireResult.data;
	const parsedData = EngineRPCDataSchemaByType[type].safeParse(wireResult.data.data);
	if (!parsedData.success) {
		throw new EngineProtocolError(`Invalid Engine RPC success payload for ${type}`, parsedData.error);
	}
	// 动态索引会丢失 type 与 Schema 输出的关联；关联由上方完整映射和本次 parse 共同保证。
	return { success: true, data: parsedData.data } as EngineRPCResult<TType>;
}

export function engineRPCSuccess<TType extends EngineRPCType>(
	_type: TType,
	data: EngineRPCData<TType>,
): EngineRPCWireResult {
	return { success: true, data };
}

export function engineRPCFailure(error: unknown, code = "engine_execution_failed"): EngineRPCWireResult {
	return { success: false, error: toEngineExecutionError(error, code) };
}

export function toEngineExecutionError(error: unknown, code = "engine_execution_failed"): EngineExecutionError {
	const structured = EngineExecutionErrorSchema.safeParse(error);
	if (structured.success) return structured.data;
	return {
		code,
		message: error instanceof Error ? error.message : String(error),
	};
}

/** 生命周期 task 的响应必须同时匹配命令类型和 correlationId。 */
export function parseEngineLifecycleResult(command: EngineLifecycleCommand, value: unknown): EngineLifecycleResult {
	const parsed = EngineLifecycleResultSchema.safeParse(value);
	if (!parsed.success) {
		throw new EngineProtocolError(`Invalid lifecycle result for ${command.type}`, parsed.error);
	}
	if (!isMatchingLifecycleResult(command, parsed.data)) {
		throw new EngineProtocolError(
			`Lifecycle result does not match ${command.type}:${command.correlationId}`,
			parsed.data,
		);
	}
	return parsed.data;
}

export function engineLifecycleSuccess(
	command: EngineLifecycleCommand,
	data?: FastForwardResult,
): EngineLifecycleResult {
	const base = { sourceSide: "executor" as const, correlationId: command.correlationId, success: true as const };
	switch (command.type) {
		case "CMD_INIT":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_INIT" });
		case "CMD_START":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_START" });
		case "CMD_PAUSE":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_PAUSE" });
		case "CMD_RESUME":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_RESUME" });
		case "CMD_STOP":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_STOP" });
		case "CMD_RESET":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_RESET" });
		case "CMD_STEP":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_STEP" });
		case "CMD_UNLOAD":
			return EngineLifecycleResultSchema.parse({ ...base, type: "RESULT_UNLOAD" });
		case "CMD_FAST_FORWARD":
			return EngineLifecycleResultSchema.parse({
				...base,
				type: "RESULT_FAST_FORWARD",
				data: FastForwardResultSchema.parse(data),
			});
	}
}

export function engineLifecycleFailure(
	command: EngineLifecycleCommand,
	error: unknown,
	code = "engine_lifecycle_failed",
): EngineLifecycleResult {
	const resultType = {
		CMD_INIT: "RESULT_INIT",
		CMD_START: "RESULT_START",
		CMD_PAUSE: "RESULT_PAUSE",
		CMD_RESUME: "RESULT_RESUME",
		CMD_STOP: "RESULT_STOP",
		CMD_RESET: "RESULT_RESET",
		CMD_STEP: "RESULT_STEP",
		CMD_UNLOAD: "RESULT_UNLOAD",
		CMD_FAST_FORWARD: "RESULT_FAST_FORWARD",
	}[command.type];
	return EngineLifecycleResultSchema.parse({
		type: resultType,
		sourceSide: "executor",
		correlationId: command.correlationId,
		success: false,
		error: toEngineExecutionError(error, code),
	});
}

// ==================== Worker Task Routing ====================

export interface EngineWorkerTaskMap {
	engine_lifecycle: EngineLifecycleCommand;
	engine_rpc: EngineRPC;
}

export type EngineWorkerTaskTypeMapKey = keyof EngineWorkerTaskMap;
export type EngineWorkerTaskTypeMapValue = EngineWorkerTaskMap[EngineWorkerTaskTypeMapKey];
export type EngineWorkerTaskResult = EngineLifecycleResult | EngineRPCWireResult;
