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

  /** 主事件队列（按入队帧号排序） */
  private events: QueueEvent[] = [];

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
      if (this.events.length >= this.config.maxQueueSize) {
        console.warn("⚠️ 事件队列已满，丢弃事件:", event.id);
        return false;
      }

      // 插入到主队列（按执行帧号排序）
      this.insertSorted(this.events, event, (a, b) => a.executeFrame - b.executeFrame);

      // 更新状态
      this.stats.currentSize = this.events.length;
      this.stats.totalInserted++;

      console.log(`📋 插入事件: ${event.type} - 队列大小: ${this.events.length}`, event);
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
    const eventIndex = this.events.findIndex((event) => event.id === eventId);
    if (eventIndex === -1) {
      return false;
    }

    // 从主队列移除
    this.events.splice(eventIndex, 1);

    this.stats.currentSize = this.events.length;
    console.log(`🗑️ 移除事件: ${eventId}`, this.events);

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
      event.processed = true;
      this.stats.totalProcessed++;
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.events = [];
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
    return this.events.find((event) => event.id === eventId) || null;
  }

  /**
   * 获取指定帧的所有事件
   *
   * @param frameNumber 指定帧号
   * @returns 需要执行的事件数组
   */
  getByFrame(frameNumber: number): QueueEvent[] {
    return this.events.filter((event) => event.executeFrame === frameNumber);
  }

  // ==================== 队列状态 ====================

  /**
   * 获取队列大小
   *
   * @returns 当前队列大小
   */
  size(): number {
    return this.events.length;
  }

  /**
   * 检查队列是否为空
   *
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.events.length === 0;
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
    if (this.events.length === 0) {
      return Infinity;
    }
    return this.events[0].executeFrame;
  }

  /**
   * 获取队列中最晚的事件帧号
   *
   * @returns 最晚帧号，如果队列为空则返回-Infinity
   */
  getLatestFrame(): number {
    if (this.events.length === 0) {
      return -Infinity;
    }
    return this.events[this.events.length - 1].executeFrame;
  }

  // ==================== 快照管理 ====================

  /**
   * 创建快照
   */
  createSnapshot(): void {
    const snapshot: QueueSnapshot = {
      events: this.events.map((event) => ({ ...event })),
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
      this.events = snapshot.events.map((event) => ({ ...event }));
      this.stats = { ...snapshot.stats };

      console.log(`🔄 恢复到指定帧快照: ${frameNumber} - 事件数: ${this.events.length}`);
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

  // ==================== 私有方法 ====================

  /**
   * 插入排序（保持数组有序）
   *
   * @param array 目标数组
   * @param item 要插入的项目
   * @param compare 比较函数
   */
  private insertSorted<T>(array: T[], item: T, compare: (a: T, b: T) => number): void {
    let insertIndex = 0;

    // 找到插入位置
    for (let i = 0; i < array.length; i++) {
      if (compare(array[i], item) > 0) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    // 插入项目
    array.splice(insertIndex, 0, item);
  }
}

// ============================== 导出 ==============================

export default EventQueue;
