import type { Checkpointable } from "../Checkpoint";
import type { BusEvent, EventBusCheckpoint, InEngineSubscription } from "./types";

export class EventBus implements Checkpointable<EventBusCheckpoint> {
	private subscriptions: InEngineSubscription[] = [];
	private readonly outboundPrefixes: readonly string[];
	private outboundBuffer: BusEvent[] = [];

	constructor(outboundPrefixes: string[]) {
		this.outboundPrefixes = outboundPrefixes;
	}

	/**
	 * 引擎内订阅，topicPrefix 前缀匹配。
	 * 成员身份由 payload 携带，handler 自行过滤。
	 */
	subscribeInEngine(sourceId: string, topicPrefix: string, handler: (event: BusEvent) => void): void {
		this.subscriptions.push({ sourceId, topicPrefix, handler });
	}

	/** 按来源批量取消引擎内订阅（passive / buff 卸载时）。 */
	unsubscribeBySource(sourceId: string): void {
		this.subscriptions = this.subscriptions.filter((s) => s.sourceId !== sourceId);
	}

	/**
	 * 发布事实。
	 * 1. 同步派发给 topicPrefix 匹配的引擎内订阅者。
	 * 2. 若 topic 命中任意对外前缀，追加到 outboundBuffer。
	 */
	publish(topic: string, payload: unknown, timeMs: number): void {
		const event: BusEvent = { topic, payload, timeMs };

		for (const sub of this.subscriptions) {
			if (topic.startsWith(sub.topicPrefix)) {
				sub.handler(event);
			}
		}

		for (const prefix of this.outboundPrefixes) {
			if (topic.startsWith(prefix)) {
				this.outboundBuffer.push(event);
				break;
			}
		}
	}

	/** Tick 末取走对外事实批并清空缓冲。无命中时返回空数组。 */
	drainOutbound(): readonly BusEvent[] {
		const batch = this.outboundBuffer;
		this.outboundBuffer = [];
		return batch;
	}

	captureCheckpoint(): EventBusCheckpoint {
		return {
			subscriptions: this.subscriptions.map(({ sourceId, topicPrefix }) => ({
				sourceId,
				topicPrefix,
			})),
		};
	}

	restoreCheckpoint(_checkpoint: EventBusCheckpoint): void {
		// handler 不可序列化，订阅表由 passive / skill 安装逻辑在 restore 后重放。
		this.subscriptions = [];
		this.outboundBuffer = [];
	}
}
