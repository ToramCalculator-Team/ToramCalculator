/**
 * 事件队列 - 跨模拟时间片调度和存储
 * 主要事件处理逻辑在状态机中，事件队列只负责按模拟时间对状态机发送消息
 */

import { createLogger } from "~/lib/Logger";
import type { Checkpointable, EventQueueCheckpoint } from "../types";
import type { EventQueueConfig, QueueEvent, QueueEventType, QueueSnapshot, QueueStats } from "./types";

const log = createLogger("EventQueue");

export class EventQueue implements Checkpointable<EventQueueCheckpoint> {
	/** 事件队列配置 */
	private config: EventQueueConfig;
	/** 当前模拟时间获取器 */
	private timeGetter: () => number;

	/**
	 * 按执行时间分桶存储事件：
	 * - 避免每 tick 对全量 events 做 filter（长时/快进模拟的结构性瓶颈）
	 * - bucket 内保持插入顺序
	 */
	private readonly buckets: Map<number, QueueEvent[]> = new Map();

	/** 事件索引（id -> event），用于 O(1) 查询/标记 */
	private readonly byId: Map<string, QueueEvent> = new Map();

	/** 当前事件总数（用于 size/限流） */
	private totalSize: number = 0;

	/** 队列统计信息 */
	private stats: QueueStats = {
		currentSize: 0,
		totalProcessed: 0,
		totalInserted: 0,
	};

	/** 快照历史 */
	private snapshots: QueueSnapshot[] = [];

	// ==================== 构造函数 ====================

	/**
	 * 构造函数
	 *
	 * @param config 队列配置
	 */
	constructor(config: Partial<EventQueueConfig> = {}, timeGetter: () => number) {
		this.config = {
			maxQueueSize: 1000,
			enablePerformanceMonitoring: true,
			...config,
		};
		this.timeGetter = timeGetter;
	}

	// ==================== 事件操作 ====================

	/**
	 * 插入事件到队列
	 *
	 * @param event 事件对象
	 * @returns 插入是否成功
	 */
	insert(event: QueueEvent): boolean {
		try {
			// 检查队列大小限制
			if (this.totalSize >= this.config.maxQueueSize) {
				log.warn("⚠️ 事件队列已满，丢弃事件:", event.id);
				return false;
			}

			// 去重：若已存在相同 id，先移除旧事件（保持幂等）
			if (this.byId.has(event.id)) {
				this.remove(event.id);
			}

			// 写入分桶
			const list = this.buckets.get(event.executeAtMs) ?? [];
			list.push(event);
			this.buckets.set(event.executeAtMs, list);
			this.byId.set(event.id, event);
			this.totalSize += 1;

			// 更新状态
			this.stats.currentSize = this.totalSize;
			this.stats.totalInserted++;

			// 高频路径：默认不输出日志（避免污染性能/控制台）
			return true;
		} catch (error) {
			log.error("❌ 插入事件失败:", error);
			return false;
		}
	}

	/**
	 * 批量插入事件
	 *
	 * @param events 事件数组
	 * @returns 成功插入的事件数量
	 */
	insertBatch(events: QueueEvent[]): number {
		let successCount = 0;

		for (const event of events) {
			if (this.insert(event)) {
				successCount++;
			}
		}

		return successCount;
	}

	/**
	 * 移除指定时间及更早时间中已经处理完成的事件。
	 *
	 * @param currentTimeMs 当前模拟时间（毫秒）
	 */
	removeProcessedDue(currentTimeMs: number): void {
		for (const time of [...this.buckets.keys()].sort((a, b) => a - b)) {
			if (time > currentTimeMs) break;
			const list = this.buckets.get(time);
			if (!list) continue;
			const remaining = list.filter((event) => !event.processed);
			const removedCount = list.length - remaining.length;
			for (const e of list) {
				if (e.processed) {
					this.byId.delete(e.id);
				}
			}
			if (remaining.length === 0) {
				this.buckets.delete(time);
			} else {
				this.buckets.set(time, remaining);
			}
			if (removedCount > 0) {
				this.totalSize = Math.max(0, this.totalSize - removedCount);
			}
		}
		this.stats.currentSize = this.totalSize;
	}

	/**
	 * 移除指定事件
	 *
	 * @param eventId 事件ID
	 * @returns 移除是否成功
	 */
	remove(eventId: string): boolean {
		const event = this.byId.get(eventId);
		if (!event) {
			return false;
		}

		const timeMs = event.executeAtMs;
		const list = this.buckets.get(timeMs);
		if (list) {
			const idx = list.findIndex((e) => e.id === eventId);
			if (idx !== -1) {
				list.splice(idx, 1);
				if (list.length === 0) {
					this.buckets.delete(timeMs);
				} else {
					this.buckets.set(timeMs, list);
				}
			}
		}

		this.byId.delete(eventId);
		if (this.totalSize > 0) this.totalSize -= 1;

		this.stats.currentSize = this.totalSize;

		return true;
	}

	/**
	 * 标记事件为已处理
	 *
	 * @param eventId 事件ID
	 */
	markAsProcessed(eventId: string): void {
		const event = this.get(eventId);
		if (event) {
			if (!event.processed) {
				event.processed = true;
				this.stats.totalProcessed++;
			}
		}
	}

	/**
	 * 清空队列
	 */
	clear(): void {
		this.buckets.clear();
		this.byId.clear();
		this.totalSize = 0;
		this.stats.currentSize = 0;
		log.info("🧹 清空事件队列");
	}

	// ==================== 事件查询 ====================

	/**
	 * 获取指定事件
	 *
	 * @param eventId 事件ID
	 * @returns 事件对象，如果不存在则返回null
	 */
	get(eventId: string): QueueEvent | null {
		return this.byId.get(eventId) ?? null;
	}

	/**
	 * 获取当前时间及更早时间需要执行的所有事件。
	 *
	 * @param currentTimeMs 当前模拟时间（毫秒）
	 * @returns 需要执行的事件数组
	 */
	getDue(currentTimeMs: number): QueueEvent[] {
		const due: QueueEvent[] = [];
		for (const time of [...this.buckets.keys()].sort((a, b) => a - b)) {
			if (time > currentTimeMs) break;
			const list = this.buckets.get(time);
			if (list) {
				due.push(...list);
			}
		}
		return due;
	}

	// ==================== 队列状态 ====================

	/**
	 * 获取队列大小
	 *
	 * @returns 当前队列大小
	 */
	size(): number {
		return this.totalSize;
	}

	/**
	 * 检查队列是否为空
	 *
	 * @returns 是否为空
	 */
	isEmpty(): boolean {
		return this.totalSize === 0;
	}

	/**
	 * 获取队列统计信息
	 *
	 * @returns 统计信息
	 */
	getStats(): QueueStats {
		return structuredClone(this.stats);
	}

	/**
	 * 获取队列快照
	 *
	 * @returns 队列快照
	 */
	getSnapshot(): QueueSnapshot {
		return structuredClone(this.snapshots[this.snapshots.length - 1]);
	}

	/**
	 * 获取队列中最早的事件执行时间
	 *
	 * @returns 最早执行时间，如果队列为空则返回Infinity
	 */
	getEarliestTimeMs(): number {
		if (this.totalSize === 0) {
			return Infinity;
		}
		let min = Infinity;
		for (const time of this.buckets.keys()) {
			if (time < min) min = time;
		}
		return min;
	}

	/**
	 * 获取队列中最晚的事件执行时间
	 *
	 * @returns 最晚执行时间，如果队列为空则返回-Infinity
	 */
	getLatestTimeMs(): number {
		if (this.totalSize === 0) {
			return -Infinity;
		}
		let max = -Infinity;
		for (const time of this.buckets.keys()) {
			if (time > max) max = time;
		}
		return max;
	}

	// ==================== 快照管理 ====================

	/**
	 * 创建快照
	 */
	createSnapshot(): void {
		const snapshot: QueueSnapshot = {
			events: (() => {
				const all: QueueEvent[] = [];
				for (const [, list] of this.buckets) {
					for (const e of list) {
						all.push({ ...e });
					}
				}
				// 快照按 executeAtMs 升序，便于重放时维持确定性。
				all.sort((a, b) => a.executeAtMs - b.executeAtMs);
				return all;
			})(),
			currentTimeMs: this.timeGetter(),
			stats: { ...this.stats },
		};

		this.snapshots.push(snapshot);
	}

	/**
	 * 恢复到指定快照
	 *
	 * @param currentTimeMs 目标模拟时间
	 * @returns 恢复是否成功
	 */
	restoreSnapshot(currentTimeMs: number): boolean {
		const snapshot = this.snapshots.find((s) => s.currentTimeMs === currentTimeMs);
		if (!snapshot) {
			log.warn("⚠️ 目标时间的事件队列快照不存在:", currentTimeMs);
			return false;
		}

		try {
			// 重建分桶与索引
			this.buckets.clear();
			this.byId.clear();
			this.totalSize = 0;
			for (const e of snapshot.events) {
				const copied = { ...e };
				const list = this.buckets.get(copied.executeAtMs) ?? [];
				list.push(copied);
				this.buckets.set(copied.executeAtMs, list);
				this.byId.set(copied.id, copied);
				this.totalSize += 1;
			}
			this.stats = { ...snapshot.stats };

			log.info(`🔄 恢复到指定时间快照: ${currentTimeMs}ms - 事件数: ${this.totalSize}`);
			return true;
		} catch (error) {
			log.error("❌ 恢复快照失败:", error);
			return false;
		}
	}

	/**
	 * 获取快照列表
	 *
	 * @returns 快照数组
	 */
	getSnapshots(): QueueSnapshot[] {
		return structuredClone(this.snapshots);
	}

	// ==================== 引擎回滚检查点（与 snapshots 独立，可 postMessage） ====================

	captureCheckpoint(): EventQueueCheckpoint {
		const events: EventQueueCheckpoint["events"] = [];
		const times = [...this.buckets.keys()].sort((a, b) => a - b);
		for (const timeMs of times) {
			const list = this.buckets.get(timeMs);
			if (!list) continue;
			for (const e of list) {
				const row: EventQueueCheckpoint["events"][number] = {
					id: e.id,
					insertedAtMs: e.insertedAtMs,
					executeAtMs: e.executeAtMs,
					type: e.type,
					processed: e.processed,
					targetMemberId: e.targetMemberId,
					fsmEventType: e.fsmEventType,
				};
				if (e.payload !== undefined) {
					row.payload = structuredClone(e.payload);
				}
				events.push(row);
			}
		}
		return {
			events,
			totalSize: this.totalSize,
			stats: {
				currentSize: this.stats.currentSize,
				totalProcessed: this.stats.totalProcessed,
				totalInserted: this.stats.totalInserted,
			},
		};
	}

	restoreCheckpoint(checkpoint: EventQueueCheckpoint): void {
		this.buckets.clear();
		this.byId.clear();
		for (const row of checkpoint.events) {
			const e: QueueEvent = {
				id: row.id,
				insertedAtMs: row.insertedAtMs,
				executeAtMs: row.executeAtMs,
				type: row.type as QueueEventType,
				processed: row.processed,
				targetMemberId: row.targetMemberId,
				fsmEventType: row.fsmEventType,
				source: "未知来源",
			};
			if (row.payload !== undefined) {
				e.payload = structuredClone(row.payload);
			}
			const list = this.buckets.get(e.executeAtMs) ?? [];
			list.push(e);
			this.buckets.set(e.executeAtMs, list);
			this.byId.set(e.id, e);
		}
		this.totalSize = checkpoint.totalSize;
		this.stats = {
			currentSize: checkpoint.stats.currentSize,
			totalProcessed: checkpoint.stats.totalProcessed,
			totalInserted: checkpoint.stats.totalInserted,
		};
	}

	// 无私有排序插入：按时间分桶后不再需要
}
