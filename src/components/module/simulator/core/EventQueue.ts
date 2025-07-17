/**
 * 事件队列 - 管理时间片段事件
 * 
 * 核心职责（根据架构文档）：
 * 1. 包含将要执行的时间片段（如技能、Buff结算、状态迁移等）
 * 2. 每帧处理当前队列中的事件
 * 3. 支持插入、优先级排序、快照记录等
 * 
 * 设计理念：
 * - 时间驱动：按时间戳排序和执行事件
 * - 优先级支持：支持事件优先级排序
 * - 快照记录：支持事件历史记录和回滚
 * - 高效操作：使用堆结构优化优先级队列
 */

import type { MemberEvent } from "./Member";

// ============================== 类型定义 ==============================

/**
 * 事件优先级枚举
 */
export type EventPriority = 
  | "critical"   // 关键事件（如死亡、技能打断）
  | "high"       // 高优先级（如技能效果、伤害）
  | "normal"     // 普通优先级（如移动、状态更新）
  | "low";       // 低优先级（如动画、音效）

/**
 * 队列事件接口
 * 扩展MemberEvent，添加优先级和队列管理信息
 */
export interface QueueEvent extends MemberEvent {
  /** 事件优先级 */
  priority: EventPriority;
  /** 队列插入时间 */
  queueTime: number;
  /** 是否已处理 */
  processed: boolean;
  /** 处理时间戳 */
  processedTime?: number;
}

/**
 * 事件队列配置接口
 */
export interface EventQueueConfig {
  /** 最大队列大小 */
  maxQueueSize: number;
  /** 是否启用优先级排序 */
  enablePrioritySort: boolean;
  /** 是否启用快照记录 */
  enableSnapshot: boolean;
  /** 快照保留数量 */
  snapshotRetention: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
}

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
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 队列溢出次数 */
  overflowCount: number;
  /** 最后处理时间戳 */
  lastProcessedTime: number;
}

/**
 * 快照信息接口
 */
export interface QueueSnapshot {
  /** 快照ID */
  id: string;
  /** 快照时间戳 */
  timestamp: number;
  /** 队列状态 */
  events: QueueEvent[];
  /** 统计信息 */
  stats: QueueStats;
}

// ============================== 事件队列类 ==============================

/**
 * 事件队列类
 * 管理时间片段事件的执行
 */
export class EventQueue {
  // ==================== 私有属性 ====================

  /** 事件队列配置 */
  private config: EventQueueConfig;

  /** 主事件队列（按时间戳排序） */
  private events: QueueEvent[] = [];

  /** 优先级队列（按优先级和时间戳排序） */
  private priorityQueue: QueueEvent[] = [];

  /** 队列统计信息 */
  private stats: QueueStats = {
    currentSize: 0,
    totalProcessed: 0,
    totalInserted: 0,
    averageProcessingTime: 0,
    overflowCount: 0,
    lastProcessedTime: 0
  };

  /** 快照历史 */
  private snapshots: QueueSnapshot[] = [];

  /** 性能监控数据 */
  private performanceData = {
    processingTimes: [] as number[],
    lastSnapshotTime: 0
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param config 队列配置
   */
  constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = {
      maxQueueSize: 10000,
      enablePrioritySort: true,
      enableSnapshot: true,
      snapshotRetention: 100,
      enablePerformanceMonitoring: true,
      ...config
    };
  }

  // ==================== 公共接口 ====================

  /**
   * 插入事件到队列
   * 
   * @param event 事件对象
   * @param priority 事件优先级
   * @returns 插入是否成功
   */
  insert(event: MemberEvent, priority: EventPriority = "normal"): boolean {
    try {
      // 检查队列大小限制
      if (this.events.length >= this.config.maxQueueSize) {
        this.stats.overflowCount++;
        console.warn("⚠️ 事件队列已满，丢弃事件:", event.id);
        return false;
      }

      const queueEvent: QueueEvent = {
        ...event,
        priority,
        queueTime: performance.now(),
        processed: false
      };

      // 插入到主队列（按时间戳排序）
      this.insertSorted(this.events, queueEvent, (a, b) => a.timestamp - b.timestamp);

      // 如果启用优先级排序，也插入到优先级队列
      if (this.config.enablePrioritySort) {
        this.insertSorted(this.priorityQueue, queueEvent, (a, b) => {
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
        });
      }

      this.stats.currentSize = this.events.length;
      this.stats.totalInserted++;

      console.log(`📋 插入事件: ${event.type} (${priority}) - 队列大小: ${this.events.length}`);
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
   * @param priority 事件优先级
   * @returns 成功插入的事件数量
   */
  insertBatch(events: MemberEvent[], priority: EventPriority = "normal"): number {
    let successCount = 0;

    for (const event of events) {
      if (this.insert(event, priority)) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 获取当前时间需要执行的事件
   * 
   * @param currentTime 当前时间戳
   * @param maxEvents 最大获取事件数
   * @returns 需要执行的事件数组
   */
  getEventsToProcess(currentTime: number, maxEvents: number = 100): QueueEvent[] {
    const eventsToProcess: QueueEvent[] = [];
    const queue = this.config.enablePrioritySort ? this.priorityQueue : this.events;

    // 获取所有时间已到且未处理的事件
    for (let i = 0; i < queue.length && eventsToProcess.length < maxEvents; i++) {
      const event = queue[i];
      
      if (!event.processed && event.timestamp <= currentTime) {
        eventsToProcess.push(event);
      }
    }

    return eventsToProcess;
  }

  /**
   * 标记事件为已处理
   * 
   * @param eventId 事件ID
   * @param processingTime 处理时间
   */
  markAsProcessed(eventId: string, processingTime: number = 0): void {
    const event = this.findEvent(eventId);
    if (event) {
      event.processed = true;
      event.processedTime = performance.now();
      
      // 更新性能统计
      if (this.config.enablePerformanceMonitoring && processingTime > 0) {
        this.performanceData.processingTimes.push(processingTime);
        if (this.performanceData.processingTimes.length > 100) {
          this.performanceData.processingTimes = this.performanceData.processingTimes.slice(-100);
        }
      }

      this.stats.totalProcessed++;
      this.stats.lastProcessedTime = performance.now();
    }
  }

  /**
   * 清理已处理的事件
   * 
   * @returns 清理的事件数量
   */
  cleanup(): number {
    const originalSize = this.events.length;
    
    // 清理主队列
    this.events = this.events.filter(event => !event.processed);
    
    // 清理优先级队列
    if (this.config.enablePrioritySort) {
      this.priorityQueue = this.priorityQueue.filter(event => !event.processed);
    }

    const cleanedCount = originalSize - this.events.length;
    this.stats.currentSize = this.events.length;

    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个已处理事件`);
    }

    return cleanedCount;
  }

  /**
   * 创建快照
   * 
   * @returns 快照ID
   */
  createSnapshot(): string {
    if (!this.config.enableSnapshot) {
      return "";
    }

    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const snapshot: QueueSnapshot = {
      id: snapshotId,
      timestamp: performance.now(),
      events: this.events.map(event => ({ ...event })),
      stats: { ...this.stats }
    };

    this.snapshots.push(snapshot);

    // 限制快照数量
    if (this.snapshots.length > this.config.snapshotRetention) {
      this.snapshots = this.snapshots.slice(-this.config.snapshotRetention);
    }

    this.performanceData.lastSnapshotTime = performance.now();
    console.log(`📸 创建快照: ${snapshotId} - 事件数: ${this.events.length}`);

    return snapshotId;
  }

  /**
   * 恢复到指定快照
   * 
   * @param snapshotId 快照ID
   * @returns 恢复是否成功
   */
  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      console.warn("⚠️ 快照不存在:", snapshotId);
      return false;
    }

    try {
      this.events = snapshot.events.map(event => ({ ...event }));
      this.priorityQueue = this.config.enablePrioritySort 
        ? this.events.map(event => ({ ...event }))
        : [];
      this.stats = { ...snapshot.stats };

      console.log(`🔄 恢复到快照: ${snapshotId} - 事件数: ${this.events.length}`);
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
    return this.snapshots.map(snapshot => ({
      ...snapshot,
      events: snapshot.events.map(event => ({ ...event }))
    }));
  }

  /**
   * 清空队列
   */
  clear(): void {
    const originalSize = this.events.length;
    
    this.events = [];
    this.priorityQueue = [];
    this.stats.currentSize = 0;

    console.log(`🗑️ 清空事件队列 - 清理了 ${originalSize} 个事件`);
  }

  /**
   * 获取队列统计信息
   * 
   * @returns 统计信息
   */
  getStats(): QueueStats {
    // 计算平均处理时间
    if (this.config.enablePerformanceMonitoring && this.performanceData.processingTimes.length > 0) {
      const totalTime = this.performanceData.processingTimes.reduce((sum, time) => sum + time, 0);
      this.stats.averageProcessingTime = totalTime / this.performanceData.processingTimes.length;
    }

    return { ...this.stats };
  }

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
   * 获取队列中最早的事件时间戳
   * 
   * @returns 最早时间戳，如果队列为空则返回Infinity
   */
  getEarliestEventTime(): number {
    if (this.events.length === 0) {
      return Infinity;
    }
    return this.events[0].timestamp;
  }

  /**
   * 获取队列中最晚的事件时间戳
   * 
   * @returns 最晚时间戳，如果队列为空则返回-Infinity
   */
  getLatestEventTime(): number {
    if (this.events.length === 0) {
      return -Infinity;
    }
    return this.events[this.events.length - 1].timestamp;
  }

  /**
   * 查找指定事件
   * 
   * @param eventId 事件ID
   * @returns 事件对象，如果不存在则返回null
   */
  findEvent(eventId: string): QueueEvent | null {
    return this.events.find(event => event.id === eventId) || null;
  }

  /**
   * 移除指定事件
   * 
   * @param eventId 事件ID
   * @returns 移除是否成功
   */
  removeEvent(eventId: string): boolean {
    const eventIndex = this.events.findIndex(event => event.id === eventId);
    if (eventIndex === -1) {
      return false;
    }

    // 从主队列移除
    this.events.splice(eventIndex, 1);

    // 从优先级队列移除
    if (this.config.enablePrioritySort) {
      const priorityIndex = this.priorityQueue.findIndex(event => event.id === eventId);
      if (priorityIndex !== -1) {
        this.priorityQueue.splice(priorityIndex, 1);
      }
    }

    this.stats.currentSize = this.events.length;
    console.log(`🗑️ 移除事件: ${eventId}`);

    return true;
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