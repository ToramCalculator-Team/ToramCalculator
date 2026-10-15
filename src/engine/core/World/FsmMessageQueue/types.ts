import type { EventObject } from "xstate";

/**
 * 队列消息接口
 */
export interface QueueMessage {
	/** 消息ID */
	id: string;
	/** 入队模拟时间（毫秒） */
	insertedAtMs: number;
	/** 执行模拟时间（毫秒） */
	executeAtMs: number;
	/** 是否已处理 */
	processed: boolean;
	/** 目标成员ID */
	targetMemberId: string;
	/** 消息来源 */
	sourceMemberId: string;
	/** 消息内容 */
	fsmEvent: EventObject;
}

/**
 * 快照信息接口
 */
export interface QueueSnapshot {
	/** 当前模拟时间（毫秒） */
	currentTimeMs: number;
	/** 队列状态 */
	events: QueueMessage[];
}

/** FsmMessageQueue 检查点：当前队列消息 */
export interface QueueCheckpoint {
	events: Array<QueueMessage>;
}
