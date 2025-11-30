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
 * - 低耦合：通过接口与EventQueue和memberManager交互
 */

import type GameEngine from "./GameEngine";
import type { FrameStepResult } from "./GameEngine";
// ============================== 类型定义 ==============================

/**
 * 帧循环状态枚举
 */
export type FrameLoopState =
  | "stopped" // 已停止
  | "running" // 运行中
  | "paused"; // 已暂停

/**
 * 帧循环配置接口
 */
export interface FrameLoopConfig {
  /** 目标帧率（FPS） */
  targetFPS: number;
  /** 是否启用帧跳跃 */
  enableFrameSkip: boolean;
  /** 最大帧跳跃数 */
  maxFrameSkip: number;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean;
  /** 时间倍率（用于变速播放） */
  timeScale: number;
  /** 最大事件处理数（每帧） */
  maxEventsPerFrame: number;
  /** 帧循环模式 */
  mode?: "realtime" | "fastForward";
}

type FrameLoopMode = "realtime" | "fastForward";

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
  /** 事件处理统计 */
  eventStats: {
    totalEventsProcessed: number;
    averageEventsPerFrame: number;
    maxEventsPerFrame: number;
  };
  /** 调度时钟类型（可观测） */
  clockKind?: "raf" | "timeout";
  /** 配置帧预算（毫秒） */
  frameBudgetMs?: number;
  /** 累积跳帧次数（由于帧堆积被压缩） */
  skippedFrames?: number;
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

  /** 游戏引擎引用 */
  private engine: GameEngine;

  /** 帧循环定时器ID（rAF 或 setTimeout） */
  private frameTimer: number | null = null;

  /** 当前使用的调度时钟类型 */
  private clockKind: "raf" | "timeout" = "raf";

  /** 帧计数器 */
  private frameNumber: number = 0;

  /** 开始时间戳 */
  private startTime: number = 0;

  /** 上一帧时间戳 */
  private lastFrameTime: number = 0;

  /** 时间倍率（用于变速播放） */
  private timeScale: number = 1.0;

  private mode: FrameLoopMode = "realtime";

  private frameIntervalMs: number;
  private frameAccumulator = 0;
  private frameSkipCount = 0;

  /** 性能统计 */
  private performanceStats: PerformanceStats = {
    averageFPS: 0,
    averageFrameTime: 0,
    totalFrames: 0,
    totalRunTime: 0,
    fpsHistory: [],
    frameTimeHistory: [],
    eventStats: {
      totalEventsProcessed: 0,
      averageEventsPerFrame: 0,
      maxEventsPerFrame: 0,
    },
    frameBudgetMs: undefined,
    skippedFrames: 0,
  };

  /** 帧信息历史 */
  private frameHistory: FrameInfo[] = [];

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param engine 游戏引擎实例
   * @param config 帧循环配置
   */
  constructor(engine: GameEngine, config: Partial<FrameLoopConfig> = {}) {
    this.engine = engine;

    // 设置默认配置
    this.config = {
      targetFPS: 60,
      enableFrameSkip: true,
      maxFrameSkip: 5,
      enablePerformanceMonitoring: true,
      timeScale: 1.0,
      maxEventsPerFrame: 100,
      mode: "realtime",
      ...config,
    };

    this.timeScale = this.config.timeScale;
    this.mode = this.config.mode ?? "realtime";
    this.frameIntervalMs = 1000 / this.config.targetFPS;

    // 根据目标帧率计算帧间隔
    this.performanceStats.frameBudgetMs = this.frameIntervalMs;

    // console.log("FrameLoop: 初始化完成", this.config, config);
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

    // 重置性能统计
    this.resetPerformanceStats();

    // 选择调度时钟：Worker 中可能没有 rAF
    const hasRAF =
      typeof globalThis.requestAnimationFrame === "function" && typeof globalThis.cancelAnimationFrame === "function";
    this.clockKind = hasRAF ? "raf" : "timeout";
    this.performanceStats.clockKind = this.clockKind;

    console.log(`⏱️ 启动帧循环 - 目标帧率: ${this.config.targetFPS} FPS, 时钟: ${this.clockKind}`);
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
      if (this.clockKind === "raf" && typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(this.frameTimer);
      } else {
        clearTimeout(this.frameTimer as unknown as number);
      }
      this.frameTimer = null;
    }

    // 更新性能统计
    this.updatePerformanceStats();

    console.log(
      `⏹️ 停止帧循环 - 总帧数: ${this.frameNumber}, 运行时间: ${(performance.now() - this.startTime).toFixed(2)}ms`,
    );
  }

  /**
   * 暂停帧循环
   */
  pause(): void {
    if (this.state !== "running") {
      console.warn("⚠️ 帧循环未运行，无法暂停");
      return;
    }

    this.state = "paused";

    if (this.frameTimer !== null) {
      if (this.clockKind === "raf" && typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(this.frameTimer);
      } else {
        clearTimeout(this.frameTimer as unknown as number);
      }
      this.frameTimer = null;
    }

    console.log("⏸️ 帧循环已暂停");
  }

  /**
   * 恢复帧循环
   */
  resume(): void {
    if (this.state !== "paused") {
      console.warn("⚠️ 帧循环未暂停，无法恢复");
      return;
    }

    this.state = "running";
    this.lastFrameTime = performance.now();

    console.log("▶️ 帧循环已恢复");
    this.scheduleNextFrame();
  }

  /**
   * 单步执行
   */
  step(): void {
    if (this.state === "running") {
      console.warn("⚠️ 帧循环正在运行，无法单步执行");
      return;
    }

    const startFrame = this.engine.getCurrentFrame();
    const targetFrame = startFrame + 1;
    let iterations = 0;
    let result: FrameStepResult | null = null;

    while (this.engine.getCurrentFrame() < targetFrame) {
      result = this.engine.stepFrame({ maxEvents: this.config.maxEventsPerFrame });
      iterations++;
      if (!result.hasPendingEvents && result.pendingFrameTasks === 0) {
        break;
      }
      if (iterations > 1000) {
        console.warn("⚠️ 单步执行在同一帧内迭代次数过多，可能存在事件循环");
        break;
      }
    }

    if (!result) {
      console.warn("⚠️ 单步执行未产生结果");
      return;
    }

    this.frameNumber = result.frameNumber;
    this.recordFrameInfo(0, result.duration, result.eventsProcessed, result.membersUpdated);
    this.emitFrameSnapshot();
    console.log(`👆 单步执行完成 - 帧号: ${this.frameNumber}, 迭代次数: ${iterations}`);
  }

  /**
   * 设置时间倍率（变速播放）
   *
   * @param scale 时间倍率（1.0=正常，2.0=2倍速，0.5=半速）
   */
  setTimeScale(scale: number): void {
    if (scale < 0) {
      console.warn("⚠️ 时间倍率不能为负数");
      return;
    }

    this.timeScale = scale;
    this.config.timeScale = scale;

    if (scale === 0) {
      this.pause();
    } else if (this.state === "paused" && scale > 0) {
      this.resume();
    }

    console.log(`⏱️ 设置时间倍率: ${scale}x`);
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
    this.frameIntervalMs = 1000 / fps;
    console.log(`⏱️ 目标帧率已更新: ${fps} FPS`);
  }

  setMode(mode: FrameLoopMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.config.mode = mode;
    if (this.state === "running") {
      if (this.frameTimer !== null) {
        if (this.clockKind === "raf" && typeof globalThis.cancelAnimationFrame === "function") {
          globalThis.cancelAnimationFrame(this.frameTimer);
        } else if (this.clockKind === "timeout") {
          clearTimeout(this.frameTimer as unknown as number);
        }
        this.frameTimer = null;
      }
      this.scheduleNextFrame();
    }
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
    return this.engine.getCurrentFrame();
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
   * @returns 帧信息历史
   */
  getFrameHistory(): FrameInfo[] {
    return [...this.frameHistory];
  }

  /**
   * 检查是否正在运行
   *
   * @returns 是否正在运行
   */
  isRunning(): boolean {
    return this.state === "running";
  }

  /**
   * 检查是否已暂停
   *
   * @returns 是否已暂停
   */
  isPaused(): boolean {
    return this.state === "paused";
  }

  // ==================== 私有方法 ====================

  /**
   * 调度下一帧
   */
  private scheduleNextFrame(): void {
    if (this.state !== "running") {
      return;
    }
    if (this.mode === "fastForward") {
      Promise.resolve().then(() => {
        if (this.state === "running") {
          this.processFrameLoop(performance.now());
        }
      });
      return;
    }
    if (this.clockKind === "raf" && typeof globalThis.requestAnimationFrame === "function") {
      this.frameTimer = globalThis.requestAnimationFrame((timestamp: number) => {
        this.processFrameLoop(timestamp);
      });
    } else {
      const delay = 1000 / this.config.targetFPS;
      this.frameTimer = setTimeout(() => {
        const now = performance.now();
        this.processFrameLoop(now);
      }, delay) as unknown as number;
    }
  }

  /**
   * 主帧循环
   *
   * @param timestamp 当前时间戳
   */
  private processFrameLoop(timestamp: number): void {
    if (this.state !== "running") {
      return;
    }

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    let effectiveDelta = deltaTime * this.timeScale;
    if (this.mode === "fastForward") {
      effectiveDelta = this.frameIntervalMs;
    }

    this.frameAccumulator += effectiveDelta;

    if (this.config.enableFrameSkip) {
      const maxAccum = this.frameIntervalMs * Math.max(1, this.config.maxFrameSkip);
      if (this.frameAccumulator > maxAccum) {
        this.frameAccumulator = this.frameIntervalMs;
        this.frameSkipCount++;
        this.performanceStats.skippedFrames = (this.performanceStats.skippedFrames || 0) + 1;
      }
    }

    let framesExecuted = 0;

    while (this.frameAccumulator >= this.frameIntervalMs) {
      const stepResult = this.engine.stepFrame({ maxEvents: this.config.maxEventsPerFrame });
      framesExecuted++;
      this.frameNumber = stepResult.frameNumber;
      this.recordFrameInfo(
        this.frameIntervalMs,
        stepResult.duration,
        stepResult.eventsProcessed,
        stepResult.membersUpdated,
      );
      this.emitFrameSnapshot();
      this.frameAccumulator -= this.frameIntervalMs;

      if (this.mode === "fastForward" && !stepResult.hasPendingEvents && stepResult.pendingFrameTasks === 0) {
        break;
      }
    }

    // 调度下一帧
    this.scheduleNextFrame();
  }


  /**
   * 记录帧信息
   *
   * @param deltaTime 帧间隔时间
   * @param processingTime 处理时间
   * @param eventsProcessed 处理的事件数量
   * @param membersUpdated 更新的成员数量
   */
  private recordFrameInfo(
    deltaTime: number,
    processingTime: number,
    eventsProcessed: number,
    membersUpdated: number,
  ): void {
    const frameInfo: FrameInfo = {
      frameNumber: this.frameNumber,
      timestamp: performance.now(),
      deltaTime,
      processingTime,
      eventsProcessed,
      membersUpdated,
    };

    this.frameHistory.push(frameInfo);

    // 限制历史记录数量
    if (this.frameHistory.length > 1000) {
      this.frameHistory = this.frameHistory.slice(-500);
    }

    // 更新性能统计
    if (this.config.enablePerformanceMonitoring) {
      this.updatePerformanceStats(frameInfo);
    }
  }

  private emitFrameSnapshot(): void {
    try {
      const snapshot = this.engine.createFrameSnapshot();
      this.engine.sendFrameSnapshot(snapshot);
    } catch (error) {
      console.error("❌ 帧快照创建失败:", error);
    }
  }

  /**
   * 更新性能统计
   *
   * @param frameInfo 帧信息
   */
  private updatePerformanceStats(frameInfo?: FrameInfo): void {
    if (!this.config.enablePerformanceMonitoring) {
      return;
    }

    const currentTime = performance.now();
    const totalRunTime = currentTime - this.startTime;

    // 更新基本统计
    this.performanceStats.totalFrames = this.frameNumber;
    this.performanceStats.totalRunTime = totalRunTime;
    this.performanceStats.averageFPS = this.frameNumber / (totalRunTime / 1000);

    if (frameInfo) {
      // 更新帧时间历史
      this.performanceStats.frameTimeHistory.push(frameInfo.processingTime);
      if (this.performanceStats.frameTimeHistory.length > 100) {
        this.performanceStats.frameTimeHistory = this.performanceStats.frameTimeHistory.slice(-100);
      }

      // 更新帧率历史
      const fps = 1000 / frameInfo.deltaTime;
      this.performanceStats.fpsHistory.push(fps);
      if (this.performanceStats.fpsHistory.length > 100) {
        this.performanceStats.fpsHistory = this.performanceStats.fpsHistory.slice(-100);
      }

      // 计算平均帧处理时间
      const avgFrameTime =
        this.performanceStats.frameTimeHistory.reduce((sum, time) => sum + time, 0) /
        this.performanceStats.frameTimeHistory.length;
      this.performanceStats.averageFrameTime = avgFrameTime;

      // 更新事件统计
      this.performanceStats.eventStats.totalEventsProcessed += frameInfo.eventsProcessed;
      this.performanceStats.eventStats.averageEventsPerFrame =
        this.performanceStats.eventStats.totalEventsProcessed / this.frameNumber;
      this.performanceStats.eventStats.maxEventsPerFrame = Math.max(
        this.performanceStats.eventStats.maxEventsPerFrame,
        frameInfo.eventsProcessed,
      );
    }
  }

  /**
   * 重置性能统计
   */
  private resetPerformanceStats(): void {
    this.performanceStats = {
      averageFPS: 0,
      averageFrameTime: 0,
      totalFrames: 0,
      totalRunTime: 0,
      fpsHistory: [],
      frameTimeHistory: [],
      eventStats: {
        totalEventsProcessed: 0,
        averageEventsPerFrame: 0,
        maxEventsPerFrame: 0,
      },
    };
    this.frameHistory = [];
  }
}

// ============================== 导出 ==============================

export default FrameLoop;
