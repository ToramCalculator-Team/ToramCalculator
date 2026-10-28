import type { Checkpointable } from "../Checkpoint";
import type { QueueCheckpoint } from "../FsmMessageQueue/types";
import type { BusEvent } from "./types";

export class EventBus implements Checkpointable<QueueCheckpoint> {
	// 引擎内订阅表
	private readonly inEngine: InEngineSubscription[];

	// 对外订阅前缀列表（由外部消费端在场景装配时注册，运行中只读）
	private readonly outboundPrefixes: string[];

	// 本 Tick 对外事实缓冲，Tick 末 drain 后清空
	private outboundBuffer: BusEvent[];

	constructor(outboundPrefixes: string[]) {}

	/**
	 * 引擎内订阅：在指定作用域内订阅 topic 前缀
	 * @param scope  作用域，通常为 member:<id>
	 * @param sourceId  passive / buff / registlet id，按来源批量清理时使用
	 * @param topicPrefix  topic 前缀，前缀匹配
	 * @param handler  同步回调
	 */
	subscribeInEngine(scope: string, sourceId: string, topicPrefix: string, handler: (event: BusEvent) => void): void;

	/**
	 * 发布事实
	 * 1. 同步派发给 scope 与 topicPrefix 均匹配的引擎内订阅者
	 * 2. 若 topic 命中任意对外前缀，追加到 outboundBuffer
	 * @param scope  事实所属作用域
	 * @param topic  完整树路径，如 "受击流程.命中判定:succeeded"
	 * @param payload  发布时刻的不可变值拷贝
	 * @param timeMs  派发模拟时间（毫秒）
	 */
	publish(scope: string, topic: string, payload: unknown, timeMs: number): void {}

	/**
	 * Tick 末取走本 Tick 的对外事实批，同时清空缓冲
	 * 无对外订阅或本 Tick 无命中时返回空数组
	 */
	drainOutbound(): readonly BusEvent[] {
		return [];
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): EventBusCheckpoint {
		return {};
	}

	restoreCheckpoint(checkpoint: EventBusCheckpoint): void {}
}
