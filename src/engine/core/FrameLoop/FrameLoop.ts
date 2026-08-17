/**
 * Worker 独占的实时会话时钟。
 *
 * Real Time 只观测单调时间；Virtual Time 负责倍率与过载裁剪；Fixed Time 把
 * Virtual Time 离散为固定 Tick。底层 timer 只负责唤醒，不能成为模拟时间事实源。
 */

import { createLogger } from "~/lib/logger";
import type {
	FrameLoopClockSnapshot,
	FrameLoopConfig,
	FrameLoopSnapshot,
	FrameLoopState,
	FrameLoopStats,
	FrameLoopTick,
} from "./types";

const log = createLogger("FrameLoop");
const FIXED_TIME_EPSILON_FACTOR = 1e-9;

const monotonicEpochNow = (now: number): number => performance.timeOrigin + now;

export class FrameLoop {
	private state: FrameLoopState = "stopped";
	private config: FrameLoopConfig;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private fixedStepMs = 1000 / 60;
	private virtualAccumulatorMs = 0;
	private lastRealTimeMs = 0;
	private startTimeMs: number | null = null;
	private timeScale = 1;
	private clockRevision = 0;
	private onTick: ((tick: FrameLoopTick) => void) | null = null;
	private stats: FrameLoopStats = {
		averageTicksPerSecond: 0,
		totalTicks: 0,
		totalRunTime: 0,
		clockKind: "deadline",
		discardedVirtualTimeMs: 0,
		overstepMs: 0,
	};

	constructor(config: Partial<FrameLoopConfig> = {}) {
		this.config = {
			logicHz: 60,
			maxCatchUpTicks: 5,
			enablePerformanceMonitoring: true,
			timeScale: 1,
			maxEventsPerTick: 100,
			...config,
		};
		this.timeScale = this.config.timeScale;
		this.fixedStepMs = 1000 / this.config.logicHz;
	}

	/** 启动唯一 deadline 驱动；每次回调只产生固定步长推进建议。 */
	start(onTick: (tick: FrameLoopTick) => void): void {
		if (this.state === "running") {
			log.warn("逻辑时钟已在运行中");
			return;
		}
		const now = performance.now();
		this.onTick = onTick;
		this.state = "running";
		this.startTimeMs = now;
		this.lastRealTimeMs = now;
		this.virtualAccumulatorMs = 0;
		this.clockRevision += 1;
		this.resetStats();
		this.scheduleNextTurn();
	}

	/** 停止前结算当前可接受的 Virtual Time，避免生命周期命令边界丢失已到期 Tick。 */
	stop(): void {
		if (this.state === "stopped") return;
		if (this.state === "running") this.processRealTime(performance.now());
		this.state = "stopped";
		this.clockRevision += 1;
		this.cancelTimer();
		this.updateStats();
		this.onTick = null;
	}

	/** 暂停保留 Fixed Time 的 overstep，恢复后从同一逻辑相位继续。 */
	pause(): void {
		if (this.state !== "running") {
			log.warn("逻辑时钟未在运行，无法暂停");
			return;
		}
		this.processRealTime(performance.now());
		this.state = "paused";
		this.clockRevision += 1;
		this.cancelTimer();
	}

	resume(): void {
		if (this.state !== "paused" || !this.onTick) {
			log.warn("逻辑时钟未暂停，无法恢复");
			return;
		}
		this.state = "running";
		this.lastRealTimeMs = performance.now();
		this.clockRevision += 1;
		this.scheduleNextTurn();
	}

	/** 先按旧倍率结算到当前时刻，再建立新的 Virtual Time 倍率段。 */
	setTimeScale(scale: number): void {
		if (!Number.isFinite(scale) || scale <= 0) throw new Error("timeScale 必须是正有限数");
		if (this.state === "running") this.processRealTime(performance.now());
		this.timeScale = scale;
		this.config.timeScale = scale;
		this.lastRealTimeMs = performance.now();
		this.clockRevision += 1;
		if (this.state === "running") {
			this.cancelTimer();
			this.scheduleNextTurn();
		}
	}

	/** 逻辑频率只改变后续 Fixed Time 步长；运行时切换前先结算旧频率。 */
	setLogicHz(logicHz: number): void {
		if (!Number.isFinite(logicHz) || logicHz <= 0 || logicHz > 240) {
			throw new Error(`logicHz 必须位于 (0, 240]，收到 ${logicHz}`);
		}
		if (this.state === "running") this.processRealTime(performance.now());
		this.config.logicHz = logicHz;
		this.fixedStepMs = 1000 / logicHz;
		this.virtualAccumulatorMs = Math.min(this.virtualAccumulatorMs, this.fixedStepMs);
		this.lastRealTimeMs = performance.now();
		this.clockRevision += 1;
		if (this.state === "running") {
			this.cancelTimer();
			this.scheduleNextTurn();
		}
	}

	setMaxCatchUpTicks(maxCatchUpTicks: number): void {
		if (!Number.isInteger(maxCatchUpTicks) || maxCatchUpTicks < 1) {
			throw new Error(`maxCatchUpTicks 必须是正整数，收到 ${maxCatchUpTicks}`);
		}
		this.config.maxCatchUpTicks = maxCatchUpTicks;
	}

	getState(): FrameLoopState {
		return this.state;
	}

	getSnapshot(): FrameLoopSnapshot {
		return {
			tickIndex: this.stats.totalTicks,
			ticksPerSecond: this.stats.averageTicksPerSecond,
		};
	}

	getFrameLoopStats(): FrameLoopStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * 把已完成逻辑时间与当前 overstep 组合成渲染可读取的共享时间轴映射。
	 * sampledAtEpochMs 使用跨 Window / Worker 可比较的 timeOrigin 坐标。
	 */
	getClockSnapshot(completedLogicalTimeMs: number): FrameLoopClockSnapshot {
		const now = performance.now();
		const pendingVirtualTimeMs =
			this.state === "running" ? this.acceptedVirtualDelta(Math.max(0, now - this.lastRealTimeMs)) : 0;
		return {
			state: this.state,
			revision: this.clockRevision,
			sampledAtEpochMs: monotonicEpochNow(now),
			timelineTimeMs: completedLogicalTimeMs + this.virtualAccumulatorMs + pendingVirtualTimeMs,
			timeScale: this.timeScale,
			fixedStepMs: this.fixedStepMs,
		};
	}

	isRunning(): boolean {
		return this.state === "running";
	}

	isPaused(): boolean {
		return this.state === "paused";
	}

	private cancelTimer(): void {
		if (this.timer === null) return;
		clearTimeout(this.timer);
		this.timer = null;
	}

	/** timer 只安排下一次检查；实际推进量始终由 Real -> Virtual -> Fixed 换算决定。 */
	private scheduleNextTurn(): void {
		if (this.state !== "running" || this.timer !== null) return;
		const pendingRealTimeMs = Math.max(0, performance.now() - this.lastRealTimeMs);
		const pendingVirtualTimeMs = this.acceptedVirtualDelta(pendingRealTimeMs);
		const remainingVirtualMs = Math.max(0, this.fixedStepMs - this.virtualAccumulatorMs - pendingVirtualTimeMs);
		const delayMs = remainingVirtualMs / this.timeScale;
		this.timer = setTimeout(() => {
			this.timer = null;
			this.processRealTime(performance.now());
			this.scheduleNextTurn();
		}, delayMs);
	}

	private acceptedVirtualDelta(realDeltaMs: number): number {
		const virtualDeltaMs = realDeltaMs * this.timeScale;
		return Math.min(virtualDeltaMs, this.fixedStepMs * this.config.maxCatchUpTicks);
	}

	/** 把一次不均匀的 Worker 唤醒换算为零个或多个均匀 Fixed Tick。 */
	private processRealTime(now: number): void {
		if (this.state !== "running" || !this.onTick) return;
		const realDeltaMs = Math.max(0, now - this.lastRealTimeMs);
		this.lastRealTimeMs = now;
		const virtualDeltaMs = realDeltaMs * this.timeScale;
		const acceptedVirtualTimeMs = this.acceptedVirtualDelta(realDeltaMs);
		this.stats.discardedVirtualTimeMs += virtualDeltaMs - acceptedVirtualTimeMs;
		this.virtualAccumulatorMs += acceptedVirtualTimeMs;

		const dueTicks = Math.min(
			Math.floor((this.virtualAccumulatorMs + this.fixedStepMs * FIXED_TIME_EPSILON_FACTOR) / this.fixedStepMs),
			this.config.maxCatchUpTicks,
		);
		if (dueTicks > 0) {
			this.virtualAccumulatorMs = Math.max(0, this.virtualAccumulatorMs - dueTicks * this.fixedStepMs);
			this.stats.totalTicks += dueTicks;
			this.onTick({
				sampledAtEpochMs: monotonicEpochNow(now),
				fixedStepMs: this.fixedStepMs,
				dueTicks,
				clockKind: "deadline",
				discardedVirtualTimeMs: this.stats.discardedVirtualTimeMs,
			});
		}
		this.stats.overstepMs = this.virtualAccumulatorMs;
		this.updateStats();
	}

	private updateStats(): void {
		if (!this.config.enablePerformanceMonitoring || this.startTimeMs === null) return;
		const totalRunTime = Math.max(0, performance.now() - this.startTimeMs);
		this.stats.totalRunTime = totalRunTime;
		this.stats.overstepMs = this.virtualAccumulatorMs;
		const seconds = totalRunTime / 1000;
		this.stats.averageTicksPerSecond = seconds > 0 ? this.stats.totalTicks / seconds : 0;
	}

	private resetStats(): void {
		this.stats = {
			averageTicksPerSecond: 0,
			totalTicks: 0,
			totalRunTime: 0,
			clockKind: "deadline",
			discardedVirtualTimeMs: 0,
			overstepMs: 0,
		};
	}
}
