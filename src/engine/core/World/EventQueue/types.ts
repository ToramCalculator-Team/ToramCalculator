import type { EventObject } from "xstate";
import { z } from "zod/v4";

/** 队列事件类型枚举 */
export const QueueEventTypeEnum = z.enum(["member_fsm_event"]);
export type QueueEventType = z.output<typeof QueueEventTypeEnum>;

/**
 * 队列事件接口
 */
export interface QueueEvent {
	/** 事件ID */
	id: string;
	/** 入队模拟时间（毫秒） */
	insertedAtMs: number;
	/** 执行模拟时间（毫秒） */
	executeAtMs: number;
	/** 事件类型 */
	type: QueueEventType;
	/** 是否已处理 */
	processed: boolean;
	/** 目标成员ID */
	targetMemberId: string;
	/** 已由生产者构造完成的 FSM 事件 */
	fsmEvent: EventObject;
	/** 事件来源 */
	source: string;
}

/**
 * 事件队列配置接口
 */
export const EventQueueConfigSchema = z.object({
	maxQueueSize: z.number(),
	enablePerformanceMonitoring: z.boolean(),
});
export type EventQueueConfig = z.output<typeof EventQueueConfigSchema>;

/**
 * 队列统计信息接口
 */
export interface QueueStats {
	/** 当前队列大小 */
	currentSize: number;
	/** 总处理事件数 */
	totalProcessed: number;
	/** 总插入事件数 */
	totalInserted: number;
}

/**
 * 快照信息接口
 */
export interface QueueSnapshot {
	/** 当前模拟时间（毫秒） */
	currentTimeMs: number;
	/** 队列状态 */
	events: QueueEvent[];
	/** 统计信息 */
	stats: QueueStats;
}
