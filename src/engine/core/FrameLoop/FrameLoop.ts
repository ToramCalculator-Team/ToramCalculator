export class FrameLoop {
	private state: "stopped" | "running" | "paused" = "stopped";
	private timer: ReturnType<typeof setTimeout> | null = null;
	private readonly fixedStepMs: number;
	private nextDeadlineMs: number | null = null;
	private onTick: (() => void) | null = null;

	constructor(logicHz: number) {
		if (!Number.isFinite(logicHz) || logicHz <= 0) {
			throw new Error("logicHz 必须是正数");
		}
		this.fixedStepMs = 1000 / logicHz;
	}

	// 启动循环
	start(onTick: () => void): void {
		if (this.state !== "stopped") {
			throw new Error("FrameLoop 已经在运行中");
		}
		this.state = "running";
		this.loop();
	}

	// 暂停循环
	pause(): void {
		if (this.state !== "running") {
			throw new Error("FrameLoop 未在运行中");
		}
		this.state = "paused";
	}

	// 恢复循环
	resume(): void {
		if (this.state !== "paused") {
			throw new Error("FrameLoop 未在暂停中");
		}
		this.state = "running";
		this.loop();
	}

	// 终止循环
	stop(): void {
		if (this.state === "stopped") {
			throw new Error("FrameLoop 已经停止");
		}
		this.state = "stopped";
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	private loop(): void {
		if (this.state !== "running") return;

		const now = performance.now();

		// 1. 调用外部传入的逻辑
		this.onTick?.();

		// 2. 计算漂移误差（实际时间 - 预期时间）
		const drift = performance.now() - expectedTime;

		// 如果误差过大（例如 Worker 被浏览器挂起后恢复），进行重置，防止追赶循环导致卡死
		if (drift > TIMESTEP * 10) {
			expectedTime = now + TIMESTEP;
			setTimeout(tick, TIMESTEP);
			return;
		}

		// 3. 计算下一次循环的预期时间
		expectedTime += TIMESTEP;

		// 4. 动态调整下一次的延迟时间，扣除当前的误差
		const nextDelay = Math.max(0, TIMESTEP - drift);

		setTimeout(tick, nextDelay);
	}
}
