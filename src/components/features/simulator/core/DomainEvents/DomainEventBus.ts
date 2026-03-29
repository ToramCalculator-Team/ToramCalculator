/**
 * 域事件总线
 * 
 * 职责：
 * - 收集来自权威源头的 MemberDomainEvent
 * - 按帧合并同类事件（同 member 同类事件只保留最后一次）
 * - 提供事件订阅接口给投影器
 */

import { createLogger } from "~/lib/Logger";
import type { Checkpointable, DomainEventBusCheckpoint, MemberDomainEvent } from "../types";

const log = createLogger("EventBus");

type EventListener = (event: MemberDomainEvent) => void;

export class DomainEventBus implements Checkpointable<DomainEventBusCheckpoint> {
	private listeners: Set<EventListener> = new Set();
	
	/** 当前帧的事件缓存（用于合并） */
	private currentFrameEvents: Map<string, MemberDomainEvent> = new Map();
	
	/** 当前帧号 */
	private currentFrame: number = 0;

	/**
	 * 订阅事件
	 */
	subscribe(listener: EventListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * 发出域事件
	 * @param event 域事件
	 */
	emit(event: MemberDomainEvent): void {
		// 生成事件唯一键（用于同帧合并）
		const key = this.getEventKey(event);
		
		// 同帧同类事件合并（只保留最后一次）
		this.currentFrameEvents.set(key, event);
	}

	/**
	 * 刷新帧（将缓存的事件分发给订阅者，然后清空缓存）
	 * @param frameNumber 当前帧号
	 */
	flush(frameNumber: number): void {
		if (frameNumber !== this.currentFrame) {
			this.currentFrame = frameNumber;
			
			// 分发所有缓存的事件
			for (const event of this.currentFrameEvents.values()) {
				for (const listener of this.listeners) {
					try {
						listener(event);
					} catch (error) {
						log.error("DomainEventBus: 事件监听器执行失败:", error);
					}
				}
			}
			
			// 清空缓存
			this.currentFrameEvents.clear();
		}
	}

	/**
	 * 生成事件唯一键（用于同帧合并）
	 * 格式：`{type}_{memberId}_{skillId?}`
	 */
	private getEventKey(event: MemberDomainEvent): string {
		if (event.type === "cast_progress" || event.type === "skill_availability_changed") {
			return `${event.type}_${event.memberId}_${event.skillId}`;
		}
		return `${event.type}_${event.memberId}`;
	}

	captureCheckpoint(): DomainEventBusCheckpoint {
		return {
			currentFrame: this.currentFrame,
			currentFrameEvents: Array.from(this.currentFrameEvents.entries()).map(
				([key, event]) => [key, structuredClone(event)] as [string, MemberDomainEvent],
			),
		};
	}

	restoreCheckpoint(checkpoint: DomainEventBusCheckpoint): void {
		this.currentFrame = checkpoint.currentFrame;
		this.currentFrameEvents.clear();
		for (const [key, event] of checkpoint.currentFrameEvents) {
			this.currentFrameEvents.set(key, structuredClone(event));
		}
	}

	/**
	 * 清空所有缓存和订阅
	 */
	clear(): void {
		this.currentFrameEvents.clear();
		this.listeners.clear();
	}
}

