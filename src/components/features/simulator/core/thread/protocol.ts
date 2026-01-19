/**
 * 通信协议定义（主线程 ↔ Worker）
 * 
 * 集中管理所有 Push/Stream 消息的顶层 type 和 schema
 * 确保 worker 和主线程使用相同的协议定义
 */

import { z } from "zod/v4";

/**
 * Push/Stream 消息的顶层类型
 * 
 * 规则：
 * - 每个顶层 type 必须语义单一（不允许在 payload 里二次分发）
 * - 所有 push 消息必须通过统一的 postSystemMessage 发送
 */
export const PushMessageType = [
	"engine_state_machine", // 引擎状态机镜像（executor → controller）
	"engine_telemetry", // 引擎轻量遥测（帧号/运行时间/FPS/成员数）
	"render_cmd", // 渲染指令
	"domain_event_batch", // 控制器领域事件批
	"system_event", // 系统事件（worker_ready/error/日志等杂项）
	"frame_snapshot", // 帧快照（默认关闭或降频）
	"debug_view_frame", // 调试视图数据帧（订阅制，井盖）
] as const;

export type PushMessageType = (typeof PushMessageType)[number];

/**
 * Worker 系统消息 Schema
 * 
 * 用于识别和路由 Push/Stream 消息
 */
export const WorkerSystemMessageSchema = z.object({
	type: z.enum(PushMessageType),
	data: z.any(),
	belongToTaskId: z.string().optional(),
});

export type WorkerSystemMessage = z.output<typeof WorkerSystemMessageSchema>;

/**
 * 引擎遥测（轻量运行指标）
 */
export const EngineTelemetrySchema = z.object({
	frameNumber: z.number(),
	runTime: z.number(),
	fps: z.number(),
	memberCount: z.number(),
});

export type EngineTelemetry = z.output<typeof EngineTelemetrySchema>;

/**
 * 控制器领域事件批 Schema
 * 
 * 从 system_event 中提升为顶层消息类型
 */
export const ControllerDomainEventBatchSchema = z.object({
	type: z.literal("controller_domain_event_batch"),
	frameNumber: z.number(),
	events: z.array(z.any()), // 具体事件类型由 ControllerDomainEventSchema 定义
});

export type ControllerDomainEventBatch = z.output<typeof ControllerDomainEventBatchSchema>;

