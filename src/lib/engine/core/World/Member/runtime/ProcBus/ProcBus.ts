/**
 * Proc Mask 事件总线。
 *
 * 每成员持有一份独立 ProcBus。订阅者注册时声明感兴趣的事件 mask（通过 `EventCatalog.getMask`
 * 得到的 bigint）；派发时先做 `event.mask & subscriber.mask` 位与过滤，再调 predicate
 * / handler。位与过滤 O(1)，可显著降低大量 passive 场景下的无关判定开销。
 *
 * 设计要点：
 * - **精确触发**：Proc bus 不做"每帧全量广播"；调用 `emit` 派发单个事件时，只唤醒 mask 匹配
 *   且 predicate 返回 true 的订阅者。
 * - **本成员内**：跨成员事件（如队伍成员阵亡）需要通过外部机制（MemberManager / 其他 Bus）
 *   路由到各 member ProcBus。第一版不处理跨成员。
 * - **checkpoint**：订阅表以 subscriberId（passive/skill/buff id + 序号）作为稳定键；handler
 *   本身不可序列化，restore 时由 passive / skill 的安装逻辑重新订阅。
 */

import type { EventCatalog } from "~/lib/engine/core/Event/EventCatalog";
import { createLogger } from "~/lib/Logger";

const log = createLogger("ProcBus");

export interface ProcEvent<TPayload = unknown> {
	/** 事件名（EventCatalog 中注册的 key）。 */
	name: string;
	/** 单事件 mask = 1 << bit。派发时由 ProcBus 内部计算，订阅时的 mask 可多位合并。 */
	mask: bigint;
	/** payload；形状由 EventCatalog 中对应的 zod schema 约束（本版不强制校验）。 */
	payload: TPayload;
	/** 派发帧号。 */
	frame: number;
}

export type ProcPredicate<TPayload = unknown> = (event: ProcEvent<TPayload>) => boolean;
export type ProcHandler<TPayload = unknown> = (event: ProcEvent<TPayload>) => void;

export type ProcSubscriptionId = number;

interface ProcSubscription {
	id: ProcSubscriptionId;
	sourceId: string;
	mask: bigint;
	predicate: ProcPredicate | null;
	handler: ProcHandler;
}

export interface ProcBusCheckpoint {
	subscriptions: Array<{
		id: ProcSubscriptionId;
		sourceId: string;
		mask: string; // bigint 序列化为 10 进制字符串（结构化克隆跨 worker 不支持 bigint 透传）
	}>;
	nextId: ProcSubscriptionId;
}

export class ProcBus {
	private readonly subscriptions = new Map<ProcSubscriptionId, ProcSubscription>();
	private nextId: ProcSubscriptionId = 1;

	constructor(private readonly catalog: EventCatalog) {}

	/**
	 * 订阅事件。
	 *
	 * @param sourceId passive/skill/buff 的 id；同 sourceId 可注册多条，`unsubscribeBySource` 会一并清理。
	 * @param mask 感兴趣的事件 mask（通常由 `catalog.getMask([...eventNames])` 得到）。
	 * @param predicate 精细过滤（如按 status type 过滤）；传 `null` 表示接受全部匹配 mask 的事件。
	 * @param handler 触发回调。
	 */
	subscribe(
		sourceId: string,
		mask: bigint,
		predicate: ProcPredicate | null,
		handler: ProcHandler,
	): ProcSubscriptionId {
		const id = this.nextId++;
		this.subscriptions.set(id, { id, sourceId, mask, predicate, handler });
		return id;
	}

	/**
	 * 便捷订阅：给出事件名列表，由 ProcBus 内部通过 catalog 合成 mask。
	 *
	 * 适合 BT / passive 以"事件名"为入口的订阅写法；比自己算 mask 更易读。
	 */
	subscribeByName(
		sourceId: string,
		eventNames: readonly string[],
		predicate: ProcPredicate | null,
		handler: ProcHandler,
	): ProcSubscriptionId {
		const mask = this.catalog.getMask(eventNames);
		return this.subscribe(sourceId, mask, predicate, handler);
	}

	/** 取消单条订阅。 */
	unsubscribe(id: ProcSubscriptionId): void {
		this.subscriptions.delete(id);
	}

	/** 按 sourceId 取消所有订阅（passive / buff 卸载时用）。 */
	unsubscribeBySource(sourceId: string): void {
		for (const [id, sub] of this.subscriptions) {
			if (sub.sourceId === sourceId) this.subscriptions.delete(id);
		}
	}

	/** 清空所有订阅（成员销毁用）。 */
	clear(): void {
		this.subscriptions.clear();
	}

	/** 当前订阅数量（调试用）。 */
	get size(): number {
		return this.subscriptions.size;
	}

	/**
	 * 派发事件。未知事件名会抛错以提示注册遗漏。
	 *
	 * @param name 事件名（EventCatalog 中已注册）。
	 * @param payload 事件 payload。
	 * @param frame 派发帧号。
	 */
	emit(name: string, payload: unknown, frame: number): void {
		const bit = this.catalog.getBit(name);
		const mask = 1n << BigInt(bit);
		const event: ProcEvent = { name, mask, payload, frame };

		for (const sub of this.subscriptions.values()) {
			if ((sub.mask & mask) === 0n) continue;
			if (sub.predicate) {
				let matches = false;
				try {
					matches = sub.predicate(event);
				} catch (error) {
					log.error(`ProcBus predicate 抛错 (source=${sub.sourceId}, event=${name})`, error);
					continue;
				}
				if (!matches) continue;
			}
			try {
				sub.handler(event);
			} catch (error) {
				log.error(`ProcBus handler 抛错 (source=${sub.sourceId}, event=${name})`, error);
			}
		}
	}

	/**
	 * 导出 checkpoint。只保留 sourceId / mask 等元数据；handler / predicate 不可序列化，
	 * restore 时由 passive / skill 的安装逻辑重新订阅。
	 */
	captureCheckpoint(): ProcBusCheckpoint {
		return {
			nextId: this.nextId,
			subscriptions: Array.from(this.subscriptions.values()).map((sub) => ({
				id: sub.id,
				sourceId: sub.sourceId,
				mask: sub.mask.toString(10),
			})),
		};
	}

	/**
	 * 从 checkpoint 恢复：仅恢复 `nextId`，订阅本身交给 passive 安装逻辑重放。
	 *
	 * 这样设计的原因：handler 不可序列化，强行记录 id → sourceId 映射也无从重建回调。
	 * 第一版约定：checkpoint 只保证 id 不复用（继续从 nextId 往上分配），其余 passive 重放
	 * 时会生成新 id；checkpoint 里导出的 id 列表只作调试用途。
	 */
	restoreCheckpoint(checkpoint: ProcBusCheckpoint): void {
		this.subscriptions.clear();
		this.nextId = checkpoint.nextId;
	}
}
