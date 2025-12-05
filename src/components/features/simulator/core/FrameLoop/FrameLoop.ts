/**
 * 帧推进器 - 推进帧循环和事件调度
 *
 */

import type GameEngine from "../GameEngine";
import type { FrameStepResult } from "../types";
import { FrameLoopConfig, FrameLoopMode, FrameLoopState, FrameLoopStats, FrameLoopSnapshot } from "./types";

/**
 * 帧循环类
 * 负责推进游戏时间和调度事件
 */
export class FrameLoop {

  /** 游戏引擎引用 */
  private engine: GameEngine;

  /** 帧循环状态 */
  private state: FrameLoopState = "stopped";

  /** 帧循环配置 */
  private config: FrameLoopConfig;

  /** 帧循环定时器ID（rAF 或 setTimeout） */
  private frameTimer: number | null = null;

  /** 当前使用的调度时钟类型 */
  private clockKind: "raf" | "timeout" = "raf";

  /** 已执行的逻辑帧数（用于统计），逻辑帧号以 GameEngine 为准 */
  private frameNumber: number = 0;

  /** 固定逻辑帧间隔（毫秒），由 targetFPS 推导 */
  private frameIntervalMs: number = 1000 / 60;

  /** 时间累积器（毫秒） */
  private frameAccumulator: number = 0;

  /** 累计跳帧次数（基于累积器上限） */
  private frameSkipCount: number = 0;

  /** 开始时间戳 */
  private startTime: number = 0;

  /** 上一帧结束时的时间戳 */
  private lastFrameTime: number = 0;

  /** 时间倍率（用于变速播放） */
  private timeScale: number = 1.0;

  /** 帧循环模式 */
  private mode: FrameLoopMode = "realtime";

  /** 性能统计 */
  private performanceStats: FrameLoopStats = {
    averageFPS: 0,
    totalFrames: 0,
    totalRunTime: 0,
    clockKind: "raf",
    skippedFrames: 0,
    timeoutFrames: 0,
  };


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

    // 根据目标帧率计算逻辑帧间隔
    this.frameIntervalMs = 1000 / this.config.targetFPS;
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

    const now = performance.now();

    this.state = "running";
    this.startTime = now;
    this.lastFrameTime = now;

    // 重置性能统计
    this.resetFrameLoopStats();

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
        clearTimeout(this.frameTimer);
      }
      this.frameTimer = null;
    }

    // 更新性能统计
    this.updateFrameLoopStats();

    console.log(`⏹️ 停止帧循环 - 总帧数: ${this.frameNumber}, 运行时间: ${(performance.now() - this.startTime).toFixed(2)}ms`);
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
        clearTimeout(this.frameTimer);
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

    // 单步模式：忽略时间累积，直接执行一帧逻辑
    const stepResult: FrameStepResult = this.engine.stepFrame({
      maxEvents: this.config.maxEventsPerFrame,
    });

    // 同步统计用的帧计数
    this.frameNumber = stepResult.frameNumber;

    // 记录本次逻辑帧的信息（deltaTime 使用标准帧间隔）
    this.recordFrameInfo(
      this.frameIntervalMs,
      stepResult.duration,
      stepResult.eventsProcessed,
      stepResult.membersUpdated,
    );
    this.emitFrameSnapshot();
    console.log(`👆 单步执行完成 - 帧号: ${stepResult.frameNumber}`);
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
    if (fps <= 0 || fps > 60) {
      console.warn("⚠️ 无效的帧率设置:", fps);
      return;
    }

    this.config.targetFPS = fps;
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
   * 获取帧循环快照
   *
   * @returns 帧循环快照
   */
  getSnapshot(): FrameLoopSnapshot {
    return {
      currentFrame: this.engine.getCurrentFrame(),
      fps: this.performanceStats.averageFPS,
    };
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
  getFrameLoopStats(): FrameLoopStats {
    return { ...this.performanceStats };
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
    // 当前实现仅用于更新性能统计，必要时可在此扩展帧历史记录
    if (this.config.enablePerformanceMonitoring) {
      this.updateFrameLoopStats();
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
  private updateFrameLoopStats(): void {
    if (!this.config.enablePerformanceMonitoring) {
      return;
    }

    const currentTime = performance.now();
    const totalRunTime = currentTime - this.startTime;

    // 更新基本统计
    this.performanceStats.totalFrames = this.frameNumber;
    this.performanceStats.totalRunTime = totalRunTime;
    const seconds = totalRunTime / 1000;
    this.performanceStats.averageFPS = seconds > 0 ? this.frameNumber / seconds : 0;
  }

  /**
   * 重置性能统计
   */
  private resetFrameLoopStats(): void {
    this.performanceStats = {
      averageFPS: 0,
      totalFrames: 0,
      totalRunTime: 0,
      clockKind: this.clockKind,
      skippedFrames: 0,
      timeoutFrames: 0,
    };
    this.frameAccumulator = 0;
    this.frameSkipCount = 0;
  }
}

// ============================== 导出 ==============================

export default FrameLoop;
