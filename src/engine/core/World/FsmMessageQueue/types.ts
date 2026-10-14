import type { EventObject } from "xstate";
import { z } from "zod/v4";

/** 队列事件类型枚举 */
export const QueueMessageTypeEnum = z.enum(["member_fsm_event"]);
export type QueueMessageType = z.output<typeof QueueMessageTypeEnum>;

/**
 * 队列事件接口
 */
export interface QueueMessage {
	/** 事件ID */
	id: string;
	/** 入队模拟时间（毫秒） */
	insertedAtMs: number;
	/** 执行模拟时间（毫秒） */
	executeAtMs: number;
	/** 事件类型 */
	type: QueueMessageType;
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
export const FsmMessageQueueConfigSchema = z.object({
	maxQueueSize: z.number(),
	enablePerformanceMonitoring: z.boolean(),
});
export type FsmMessageQueueConfig = z.output<typeof FsmMessageQueueConfigSchema>;

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
	events: QueueMessage[];
	/** 统计信息 */
	stats: QueueStats;
}

/** FsmMessageQueue 检查点：当前队列事件 + 统计 */
export interface FsmMessageQueueCheckpoint {
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
