/**
 * 事件队列 - 跨帧事件调度和存储
 * 主要事件处理逻辑在状态机中，事件队列只负责跨帧对状态机发送消息
 */

import GameEngine from "../GameEngine";
import { EventQueueConfig, QueueEvent, QueueSnapshot, QueueStats } from "./types";

export class EventQueue {
  /** 引擎引用 */
  private engine: GameEngine;

  /** 事件队列配置 */
  private config: EventQueueConfig;

  /**
   * 按执行帧分桶存储事件：
   * - 避免每帧对全量 events 做 filter（长时/快进模拟的结构性瓶颈）
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
  constructor(engine: GameEngine, config: Partial<EventQueueConfig> = {}) {
    this.engine = engine;
    this.config = {
      maxQueueSize: 1000,
      enablePerformanceMonitoring: true,
      ...config,
    };
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
        console.warn("⚠️ 事件队列已满，丢弃事件:", event.id);
        return false;
      }

      // 去重：若已存在相同 id，先移除旧事件（保持幂等）
      if (this.byId.has(event.id)) {
        this.remove(event.id);
      }

      // 写入分桶
      const list = this.buckets.get(event.executeFrame) ?? [];
      list.push(event);
      this.buckets.set(event.executeFrame, list);
      this.byId.set(event.id, event);
      this.totalSize += 1;

      // 更新状态
      this.stats.currentSize = this.totalSize;
      this.stats.totalInserted++;

      // 高频路径：默认不输出日志（避免污染性能/控制台）
      return true;
    } catch (error) {
      console.error("❌ 插入事件失败:", error);
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

    const frame = event.executeFrame;
    const list = this.buckets.get(frame);
    if (list) {
      const idx = list.findIndex((e) => e.id === eventId);
      if (idx !== -1) {
        list.splice(idx, 1);
        if (list.length === 0) {
          this.buckets.delete(frame);
        } else {
          this.buckets.set(frame, list);
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
    console.log("🧹 清空事件队列");
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
   * 获取指定帧的所有事件
   *
   * @param frameNumber 指定帧号
   * @returns 需要执行的事件数组
   */
  getByFrame(frameNumber: number): QueueEvent[] {
    return this.buckets.get(frameNumber) ?? [];
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
   * 获取队列中最早的事件帧号
   *
   * @returns 最早帧号，如果队列为空则返回Infinity
   */
  getEarliestFrame(): number {
    if (this.totalSize === 0) {
      return Infinity;
    }
    let min = Infinity;
    for (const f of this.buckets.keys()) {
      if (f < min) min = f;
    }
    return min;
  }

  /**
   * 获取队列中最晚的事件帧号
   *
   * @returns 最晚帧号，如果队列为空则返回-Infinity
   */
  getLatestFrame(): number {
    if (this.totalSize === 0) {
      return -Infinity;
    }
    let max = -Infinity;
    for (const f of this.buckets.keys()) {
      if (f > max) max = f;
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
        // 与旧实现保持一致：快照按 executeFrame 升序
        all.sort((a, b) => a.executeFrame - b.executeFrame);
        return all;
      })(),
      currentFrame: this.engine.getCurrentFrame(),
      stats: { ...this.stats },
    };

    this.snapshots.push(snapshot);
  }

  /**
   * 恢复到指定快照
   *
   * @param frameNumber 目标帧号
   * @returns 恢复是否成功
   */
  restoreSnapshot(frameNumber: number): boolean {
    const snapshot = this.snapshots.find((s) => s.currentFrame === frameNumber);
    if (!snapshot) {
      console.warn("⚠️ 目标帧的事件队列快照不存在:", frameNumber);
      return false;
    }

    try {
      // 重建分桶与索引
      this.buckets.clear();
      this.byId.clear();
      this.totalSize = 0;
      for (const e of snapshot.events) {
        const copied = { ...e };
        const list = this.buckets.get(copied.executeFrame) ?? [];
        list.push(copied);
        this.buckets.set(copied.executeFrame, list);
        this.byId.set(copied.id, copied);
        this.totalSize += 1;
      }
      this.stats = { ...snapshot.stats };

      console.log(`🔄 恢复到指定帧快照: ${frameNumber} - 事件数: ${this.totalSize}`);
      return true;
    } catch (error) {
      console.error("❌ 恢复快照失败:", error);
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

  // 无私有排序插入：按帧分桶后不再需要
}

// ============================== 导出 ==============================

export default EventQueue;
