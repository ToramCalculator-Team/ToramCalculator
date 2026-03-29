/**
 * 薄时钟驱动器。
 * 目标：
 * - 只负责 wall-clock 调度、固定步长换算、补帧裁剪
 * - 不再直接调用 GameEngine.stepFrame
 * - 不再承载快照发送、运行模式语义、业务终止规则
 */

import { createLogger } from "~/lib/Logger";
import type { FrameLoopConfig, FrameLoopSnapshot, FrameLoopState, FrameLoopStats, FrameLoopTick } from "./types";

const log = createLogger("FrameLoop");

export class FrameLoop {
	/** 底层时钟驱动的当前状态 */
	private state: FrameLoopState = "stopped";

	/** 时钟层配置 */
	private config: FrameLoopConfig;

	/** 当前挂起的计时器 ID（raf 或 timeout） */
	private frameTimer: number | null = null;

	/** 当前使用的底层时钟类型 */
	private clockKind: "raf" | "timeout" = "raf";

	/** 固定逻辑步长（毫秒） */
	private frameIntervalMs: number = 1000 / 60;

	/** 累积的 wall-clock 时间 */
	private frameAccumulator: number = 0;

	/** 因累积时间过大而被裁剪掉的补帧次数 */
	private frameSkipCount: number = 0;

	/** 本轮启动时间 */
	private startTime: number = 0;

	/** 上一次 tick 的时间戳 */
	private lastFrameTime: number = 0;

	/** 时间倍率，仅影响 realtime 驱动 */
	private timeScale: number = 1.0;

	/** 由 GameEngine 注入的 tick 回调 */
	private onTick: ((tick: FrameLoopTick) => void) | null = null;

	/** 时钟层可观测统计 */
	private performanceStats: FrameLoopStats = {
		averageFPS: 0,
		totalFrames: 0,
		totalRunTime: 0,
		clockKind: "raf",
		skippedFrames: 0,
		timeoutFrames: 0,
	};

	constructor(config: Partial<FrameLoopConfig> = {}) {
		this.config = {
			targetFPS: 60,
			enableFrameSkip: true,
			maxFrameSkip: 5,
			enablePerformanceMonitoring: true,
			timeScale: 1.0,
			maxEventsPerFrame: 100,
			...config,
		};

		this.timeScale = this.config.timeScale;
		this.frameIntervalMs = 1000 / this.config.targetFPS;
	}

	/**
	 * 启动底层时钟，并把每次 tick 的“推进建议”交给上层。
	 * 这里不关心引擎到底跑几帧，只负责告诉上层“现在该推进多少逻辑步长”。
	 */
	start(onTick: (tick: FrameLoopTick) => void): void {
		if (this.state === "running") {
			log.warn("⏱️ 帧驱动已在运行中");
			return;
		}

		const now = performance.now();

		this.onTick = onTick;
		this.state = "running";
		this.startTime = now;
		this.lastFrameTime = now;
		this.resolveClockKind();
		this.resetFrameLoopStats();

		log.info(`⏱️ 启动帧驱动 - 目标帧率: ${this.config.targetFPS} FPS, 时钟: ${this.clockKind}`);
		this.scheduleNextFrame();
	}

	/**
	 * 停止时钟驱动。
	 * 说明：
	 * - 这里只取消底层调度
	 * - 不再承担“停止引擎运行语义”的职责
	 */
	stop(): void {
		if (this.state === "stopped") {
			log.warn("⏱️ 帧驱动已停止");
			return;
		}

		this.state = "stopped";
		this.cancelScheduledFrame();
		this.updateFrameLoopStats();
		this.onTick = null;

		log.info(
			`⏱️ 停止帧驱动 - 推进建议数: ${this.performanceStats.totalFrames}, 运行时间: ${(performance.now() - this.startTime).toFixed(2)}ms`,
		);
	}

	/**
	 * 暂停底层时钟。
	 * 暂停后不会再产生新的 tick 建议，但不会清空上层注入的回调。
	 */
	pause(): void {
		if (this.state !== "running") {
			log.warn("⏱️ 帧驱动未在运行，无法暂停");
			return;
		}

		this.state = "paused";
		this.cancelScheduledFrame();

		log.info("⏸️ 帧驱动已暂停");
	}

	/**
	 * 恢复底层时钟。
	 * 恢复时会重置上一帧时间戳，避免把暂停期间的 wall-clock 时间一次性补回。
	 */
	resume(): void {
		if (this.state !== "paused") {
			log.warn("⏱️ 帧驱动未暂停，无法恢复");
			return;
		}

		if (!this.onTick) {
			log.warn("⏱️ 帧驱动缺少 onTick 回调，无法恢复");
			return;
		}

		this.state = "running";
		this.lastFrameTime = performance.now();

		log.info("▶️ 帧驱动已恢复");
		this.scheduleNextFrame();
	}

	/**
	 * 设置时间倍率。
	 * 这里只影响 realtime 时钟换算，不决定引擎模式。
	 */
	setTimeScale(scale: number): void {
		if (scale < 0) {
			log.warn("⏱️ 时间倍率不能为负数");
			return;
		}

		this.timeScale = scale;
		this.config.timeScale = scale;

		if (scale === 0) {
			this.pause();
		} else if (this.state === "paused" && scale > 0) {
			this.resume();
		}

		log.info(`⏱️ 设置时间倍率: ${scale}x`);
	}

	/**
	 * 更新目标 FPS，并同步固定步长。
	 * 这次重构顺手修正了“只改配置不改 frameIntervalMs”的脱节问题。
	 */
	setTargetFPS(fps: number): void {
		if (fps <= 0 || fps > 60) {
			log.warn("⏱️ 无效的帧率设置:", fps);
			return;
		}

		this.config.targetFPS = fps;
		this.frameIntervalMs = 1000 / fps;

		// 运行中切换 FPS 时，重新排一次时钟，避免旧 delay 继续生效。
		if (this.state === "running") {
			this.cancelScheduledFrame();
			this.lastFrameTime = performance.now();
			this.scheduleNextFrame();
		}

		log.info(`⏱️ 目标帧率已更新: ${fps} FPS`);
	}

	getState(): FrameLoopState {
		return this.state;
	}

	/**
	 * 兼容保留的快照接口。
	 * 它描述的是“驱动层观测值”，不是引擎语义快照。
	 */
	getSnapshot(): FrameLoopSnapshot {
		return {
			currentFrame: this.performanceStats.totalFrames,
			fps: this.performanceStats.averageFPS,
		};
	}

	getFrameLoopStats(): FrameLoopStats {
		return { ...this.performanceStats };
	}

	isRunning(): boolean {
		return this.state === "running";
	}

	isPaused(): boolean {
		return this.state === "paused";
	}

	private resolveClockKind(): void {
		const hasRAF =
			typeof globalThis.requestAnimationFrame === "function" && typeof globalThis.cancelAnimationFrame === "function";

		this.clockKind = hasRAF ? "raf" : "timeout";
		this.performanceStats.clockKind = this.clockKind;
	}

	private cancelScheduledFrame(): void {
		if (this.frameTimer === null) {
			return;
		}

		if (this.clockKind === "raf" && typeof globalThis.cancelAnimationFrame === "function") {
			globalThis.cancelAnimationFrame(this.frameTimer);
		} else {
			clearTimeout(this.frameTimer);
		}

		this.frameTimer = null;
	}

	private scheduleNextFrame(): void {
		if (this.state !== "running") {
			return;
		}

		if (this.clockKind === "raf" && typeof globalThis.requestAnimationFrame === "function") {
			this.frameTimer = globalThis.requestAnimationFrame((timestamp: number) => {
				this.processFrameLoop(timestamp);
			});
			return;
		}

		this.frameTimer = setTimeout(() => {
			this.processFrameLoop(performance.now());
		}, this.frameIntervalMs) as unknown as number;
	}

	/**
	 * 把真实时间换算成固定步长建议，并交给 GameEngine 自己决定怎么跑。
	 */
	private processFrameLoop(timestamp: number): void {
		if (this.state !== "running" || !this.onTick) {
			return;
		}

		const deltaTime = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;

		this.frameAccumulator += deltaTime * this.timeScale;

		if (this.config.enableFrameSkip) {
			const maxAccumulatedTime = this.frameIntervalMs * Math.max(1, this.config.maxFrameSkip);
			if (this.frameAccumulator > maxAccumulatedTime) {
				this.frameAccumulator = this.frameIntervalMs;
				this.frameSkipCount += 1;
			}
		}

		const dueSteps = Math.floor(this.frameAccumulator / this.frameIntervalMs);
		if (dueSteps > 0) {
			this.frameAccumulator -= dueSteps * this.frameIntervalMs;
			this.performanceStats.totalFrames += dueSteps;
			if (this.clockKind === "timeout") {
				this.performanceStats.timeoutFrames += dueSteps;
			}
		}

		this.updateFrameLoopStats();

		if (dueSteps > 0) {
			this.onTick({
				timestamp,
				deltaTime,
				frameIntervalMs: this.frameIntervalMs,
				dueSteps,
				clockKind: this.clockKind,
				skippedFrames: this.frameSkipCount,
			});
		}

		this.scheduleNextFrame();
	}

	private updateFrameLoopStats(): void {
		if (!this.config.enablePerformanceMonitoring) {
			return;
		}

		const totalRunTime = performance.now() - this.startTime;
		this.performanceStats.totalRunTime = totalRunTime;
		this.performanceStats.clockKind = this.clockKind;
		this.performanceStats.skippedFrames = this.frameSkipCount;

		const seconds = totalRunTime / 1000;
		this.performanceStats.averageFPS = seconds > 0 ? this.performanceStats.totalFrames / seconds : 0;
	}

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
