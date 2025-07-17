/**
 * 时间推进器 - 推进帧循环和事件调度
 * 
 * 核心职责（根据架构文档）：
 * 1. 推进帧（如每 16ms）
 * 2. 调度事件执行、状态推进等
 * 3. 可按需加速或暂停
 * 
 * 设计理念：
 * - 时间驱动：以固定帧率推进游戏时间
 * - 事件调度：每帧处理事件队列中的事件
 * - 状态推进：调用成员更新和状态机推进
 * - 可控制：支持暂停、加速、减速等控制
 */

import { MemberRegistry } from "./MemberRegistry";
import { Member } from "./Member";
import type { MemberEvent } from "./Member";

// ============================== 类型定义 ==============================

/**
 * 帧循环状态枚举
 */
export type FrameLoopState = 
  | "stopped"    // 已停止
  | "running"    // 运行中
  | "paused";    // 已暂停

/**
 * 帧循环配置接口
 */
export interface FrameLoopConfig {
  /** 目标帧率（FPS） */
  targetFPS: number;
  /** 帧间隔（毫秒） */
  frameInterval: number;
  /** 是否启用帧跳跃 */
  enableFrameSkip: boolean;
  /** 最大帧跳跃数 */
  maxFrameSkip: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
}

/**
 * 帧信息接口
 */
export interface FrameInfo {
  /** 帧号 */
  frameNumber: number;
  /** 当前时间戳 */
  timestamp: number;
  /** 帧间隔（实际） */
  deltaTime: number;
  /** 帧处理时间 */
  processingTime: number;
  /** 事件处理数量 */
  eventsProcessed: number;
  /** 成员更新数量 */
  membersUpdated: number;
}

/**
 * 性能统计接口
 */
export interface PerformanceStats {
  /** 平均帧率 */
  averageFPS: number;
  /** 平均帧处理时间 */
  averageFrameTime: number;
  /** 总帧数 */
  totalFrames: number;
  /** 总运行时间 */
  totalRunTime: number;
  /** 帧率历史（最近100帧） */
  fpsHistory: number[];
  /** 帧时间历史（最近100帧） */
  frameTimeHistory: number[];
}

// ============================== 帧循环类 ==============================

/**
 * 帧循环类
 * 负责推进游戏时间和调度事件
 */
export class FrameLoop {
  // ==================== 私有属性 ====================

  /** 帧循环状态 */
  private state: FrameLoopState = "stopped";

  /** 帧循环配置 */
  private config: FrameLoopConfig;

  /** 成员注册表引用 */
  private memberRegistry: MemberRegistry;

  /** 事件队列引用 */
  private eventQueue: MemberEvent[] = [];

  /** 帧循环定时器ID */
  private frameTimer: number | null = null;

  /** 帧计数器 */
  private frameNumber: number = 0;

  /** 开始时间戳 */
  private startTime: number = 0;

  /** 上一帧时间戳 */
  private lastFrameTime: number = 0;

  /** 帧率控制相关 */
  private frameAccumulator: number = 0;
  private frameSkipCount: number = 0;

  /** 性能统计 */
  private performanceStats: PerformanceStats = {
    averageFPS: 0,
    averageFrameTime: 0,
    totalFrames: 0,
    totalRunTime: 0,
    fpsHistory: [],
    frameTimeHistory: []
  };

  /** 帧信息历史 */
  private frameHistory: FrameInfo[] = [];

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param memberRegistry 成员注册表
   * @param eventQueue 事件队列引用
   * @param config 帧循环配置
   */
  constructor(
    memberRegistry: MemberRegistry, 
    eventQueue: MemberEvent[] = [],
    config: Partial<FrameLoopConfig> = {}
  ) {
    this.memberRegistry = memberRegistry;
    this.eventQueue = eventQueue;
    
    // 设置默认配置
    this.config = {
      targetFPS: 60,
      frameInterval: 1000 / 60, // 16.67ms
      enableFrameSkip: true,
      maxFrameSkip: 5,
      enablePerformanceMonitoring: true,
      ...config
    };

    // 根据目标帧率计算帧间隔
    this.config.frameInterval = 1000 / this.config.targetFPS;
  }

  // ==================== 公共接口 ====================

  /**
   * 启动帧循环
   */
  start(): void {
    if (this.state === "running") {
      console.warn("⚠️ 帧循环已在运行中");
      return;
    }

    this.state = "running";
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameNumber = 0;
    this.frameAccumulator = 0;
    this.frameSkipCount = 0;

    console.log(`⏱️ 启动帧循环 - 目标帧率: ${this.config.targetFPS} FPS`);
    this.scheduleNextFrame();
  }

  /**
   * 停止帧循环
   */
  stop(): void {
    if (this.state === "stopped") {
      console.warn("⚠️ 帧循环已停止");
      return;
    }

    this.state = "stopped";
    
    if (this.frameTimer !== null) {
      cancelAnimationFrame(this.frameTimer);
      this.frameTimer = null;
    }

    // 更新性能统计
    this.updatePerformanceStats();

    console.log("⏱️ 帧循环已停止");
  }

  /**
   * 暂停帧循环
   */
  pause(): void {
    if (this.state === "paused") {
      console.warn("⚠️ 帧循环已暂停");
      return;
    }

    this.state = "paused";
    
    if (this.frameTimer !== null) {
      cancelAnimationFrame(this.frameTimer);
      this.frameTimer = null;
    }

    console.log("⏱️ 帧循环已暂停");
  }

  /**
   * 恢复帧循环
   */
  resume(): void {
    if (this.state === "running") {
      console.warn("⚠️ 帧循环已在运行中");
      return;
    }

    if (this.state === "stopped") {
      this.start();
      return;
    }

    this.state = "running";
    this.lastFrameTime = performance.now();
    
    console.log("⏱️ 帧循环已恢复");
    this.scheduleNextFrame();
  }

  /**
   * 单步执行一帧
   * 用于调试或手动控制
   */
  step(): void {
    if (this.state === "running") {
      console.warn("⚠️ 帧循环正在运行，无法单步执行");
      return;
    }

    this.processFrame();
  }

  /**
   * 设置目标帧率
   * 
   * @param fps 目标帧率
   */
  setTargetFPS(fps: number): void {
    if (fps <= 0 || fps > 1000) {
      console.warn("⚠️ 无效的帧率设置:", fps);
      return;
    }

    this.config.targetFPS = fps;
    this.config.frameInterval = 1000 / fps;
    console.log(`⏱️ 目标帧率已更新: ${fps} FPS`);
  }

  /**
   * 获取当前状态
   * 
   * @returns 当前帧循环状态
   */
  getState(): FrameLoopState {
    return this.state;
  }

  /**
   * 获取当前帧号
   * 
   * @returns 当前帧号
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  /**
   * 获取性能统计
   * 
   * @returns 性能统计信息
   */
  getPerformanceStats(): PerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * 获取帧历史
   * 
   * @param count 获取帧数
   * @returns 帧信息数组
   */
  getFrameHistory(count: number = 100): FrameInfo[] {
    return this.frameHistory.slice(-count);
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats(): void {
    this.performanceStats = {
      averageFPS: 0,
      averageFrameTime: 0,
      totalFrames: 0,
      totalRunTime: 0,
      fpsHistory: [],
      frameTimeHistory: []
    };
    this.frameHistory = [];
  }

  /**
   * 更新事件队列引用
   * 
   * @param eventQueue 新的事件队列
   */
  updateEventQueue(eventQueue: MemberEvent[]): void {
    this.eventQueue = eventQueue;
  }

  // ==================== 私有方法 ====================

  /**
   * 调度下一帧
   */
  private scheduleNextFrame(): void {
    if (this.state !== "running") {
      return;
    }

    this.frameTimer = requestAnimationFrame((timestamp) => {
      this.processFrame(timestamp);
    });
  }

  /**
   * 处理单帧
   * 
   * @param timestamp 当前时间戳
   */
  private processFrame(timestamp: number = performance.now()): void {
    const frameStartTime = performance.now();
    
    // 计算帧间隔
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // 帧率控制
    if (this.config.enableFrameSkip && deltaTime > this.config.frameInterval * 2) {
      // 帧跳跃处理
      const skipFrames = Math.min(
        Math.floor(deltaTime / this.config.frameInterval) - 1,
        this.config.maxFrameSkip
      );
      
      if (skipFrames > 0) {
        this.frameSkipCount += skipFrames;
        console.warn(`⚠️ 跳过了 ${skipFrames} 帧`);
      }
    }

    // 更新帧计数器
    this.frameNumber++;

    // 处理事件队列
    const eventsProcessed = this.processEvents();

    // 更新所有成员
    const membersUpdated = this.updateMembers(timestamp);

    // 记录帧信息
    const frameInfo: FrameInfo = {
      frameNumber: this.frameNumber,
      timestamp,
      deltaTime,
      processingTime: performance.now() - frameStartTime,
      eventsProcessed,
      membersUpdated
    };

    this.frameHistory.push(frameInfo);

    // 限制历史记录大小
    if (this.frameHistory.length > 1000) {
      this.frameHistory = this.frameHistory.slice(-500);
    }

    // 更新性能统计
    if (this.config.enablePerformanceMonitoring) {
      this.updatePerformanceStats();
    }

    // 调度下一帧
    if (this.state === "running") {
      this.scheduleNextFrame();
    }
  }

  /**
   * 处理事件队列
   * 
   * @returns 处理的事件数量
   */
  private processEvents(): number {
    if (this.eventQueue.length === 0) {
      return 0;
    }

    let processedCount = 0;
    const currentTime = performance.now();

    // 处理当前帧需要执行的事件
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue[0];
      
      // 检查事件是否到了执行时间
      if (event.timestamp > currentTime) {
        break;
      }

      // 移除事件
      this.eventQueue.shift();

      // 执行事件
      try {
        this.executeEvent(event);
        processedCount++;
      } catch (error) {
        console.error("❌ 执行事件失败:", error, event);
      }
    }

    if (processedCount > 0) {
      console.log(`📋 处理了 ${processedCount} 个事件`);
    }

    return processedCount;
  }

  /**
   * 执行单个事件
   * 
   * @param event 事件对象
   */
  private executeEvent(event: MemberEvent): void {
    // 根据事件类型执行相应的逻辑
    switch (event.type) {
      case "skill_start":
        this.handleSkillStartEvent(event);
        break;
      case "skill_cast":
        this.handleSkillCastEvent(event);
        break;
      case "skill_effect":
        this.handleSkillEffectEvent(event);
        break;
      case "skill_end":
        this.handleSkillEndEvent(event);
        break;
      case "move":
        this.handleMoveEvent(event);
        break;
      case "damage":
        this.handleDamageEvent(event);
        break;
      case "heal":
        this.handleHealEvent(event);
        break;
      case "buff_add":
        this.handleBuffAddEvent(event);
        break;
      case "buff_remove":
        this.handleBuffRemoveEvent(event);
        break;
      case "death":
        this.handleDeathEvent(event);
        break;
      case "custom":
        this.handleCustomEvent(event);
        break;
      default:
        console.warn(`⚠️ 未知事件类型: ${event.type}`);
    }
  }

  /**
   * 更新所有成员
   * 
   * @param timestamp 当前时间戳
   * @returns 更新的成员数量
   */
  private updateMembers(timestamp: number): number {
    const members = this.memberRegistry.getAllMembers();
    let updatedCount = 0;

    for (const member of members) {
      try {
        // 更新成员状态（包括状态机更新）
        member.update(timestamp);
        
        updatedCount++;
      } catch (error) {
        console.error(`❌ 更新成员失败: ${member.getName()}`, error);
      }
    }

    return updatedCount;
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(): void {
    const currentTime = performance.now();
    const runTime = currentTime - this.startTime;

    // 计算平均帧率
    if (runTime > 0) {
      this.performanceStats.averageFPS = (this.frameNumber / runTime) * 1000;
    }

    // 计算平均帧处理时间
    if (this.frameHistory.length > 0) {
      const recentFrames = this.frameHistory.slice(-60); // 最近60帧
      const totalProcessingTime = recentFrames.reduce((sum, frame) => sum + frame.processingTime, 0);
      this.performanceStats.averageFrameTime = totalProcessingTime / recentFrames.length;
    }

    // 更新统计数据
    this.performanceStats.totalFrames = this.frameNumber;
    this.performanceStats.totalRunTime = runTime;

    // 更新历史数据
    if (this.frameHistory.length > 0) {
      const lastFrame = this.frameHistory[this.frameHistory.length - 1];
      const fps = 1000 / lastFrame.deltaTime;
      
      this.performanceStats.fpsHistory.push(fps);
      this.performanceStats.frameTimeHistory.push(lastFrame.processingTime);

      // 限制历史记录大小
      if (this.performanceStats.fpsHistory.length > 100) {
        this.performanceStats.fpsHistory = this.performanceStats.fpsHistory.slice(-100);
        this.performanceStats.frameTimeHistory = this.performanceStats.frameTimeHistory.slice(-100);
      }
    }
  }

  // ==================== 事件处理器 ====================

  /**
   * 处理技能开始事件
   */
  private handleSkillStartEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const member = this.memberRegistry.getMember(sourceId);
    
    if (member) {
      member.onSkillStart(event.data);
    }
  }

  /**
   * 处理技能释放事件
   */
  private handleSkillCastEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const member = this.memberRegistry.getMember(sourceId);
    
    if (member) {
      member.onSkillCast(event.data);
    }
  }

  /**
   * 处理技能效果事件
   */
  private handleSkillEffectEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const targetId = event.data.targetId;
    
    const sourceMember = this.memberRegistry.getMember(sourceId);
    const targetMember = this.memberRegistry.getMember(targetId);
    
    if (sourceMember) {
      sourceMember.onSkillEffect(event.data);
    }
    
    if (targetMember) {
      targetMember.onSkillEffect(event.data);
    }
  }

  /**
   * 处理技能结束事件
   */
  private handleSkillEndEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const member = this.memberRegistry.getMember(sourceId);
    
    if (member) {
      member.onSkillEnd(event.data);
    }
  }

  /**
   * 处理移动事件
   */
  private handleMoveEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const member = this.memberRegistry.getMember(sourceId);
    
    if (member) {
      member.onMove(event.data);
    }
  }

  /**
   * 处理伤害事件
   */
  private handleDamageEvent(event: MemberEvent): void {
    const targetId = event.data.targetId;
    const member = this.memberRegistry.getMember(targetId);
    
    if (member) {
      member.onDamage(event.data);
    }
  }

  /**
   * 处理治疗事件
   */
  private handleHealEvent(event: MemberEvent): void {
    const targetId = event.data.targetId;
    const member = this.memberRegistry.getMember(targetId);
    
    if (member) {
      member.onHeal(event.data);
    }
  }

  /**
   * 处理Buff添加事件
   */
  private handleBuffAddEvent(event: MemberEvent): void {
    const targetId = event.data.targetId;
    const member = this.memberRegistry.getMember(targetId);
    
    if (member) {
      member.onBuffAdd(event.data);
    }
  }

  /**
   * 处理Buff移除事件
   */
  private handleBuffRemoveEvent(event: MemberEvent): void {
    const targetId = event.data.targetId;
    const member = this.memberRegistry.getMember(targetId);
    
    if (member) {
      member.onBuffRemove(event.data);
    }
  }

  /**
   * 处理死亡事件
   */
  private handleDeathEvent(event: MemberEvent): void {
    const targetId = event.data.targetId;
    const member = this.memberRegistry.getMember(targetId);
    
    if (member) {
      member.onDeath(event.data);
    }
  }

  /**
   * 处理自定义事件
   */
  private handleCustomEvent(event: MemberEvent): void {
    const sourceId = event.data.sourceId;
    const member = this.memberRegistry.getMember(sourceId);
    
    if (member) {
      member.onCustomEvent(event.data);
    }
  }
}

// ============================== 导出 ==============================

export default FrameLoop; 