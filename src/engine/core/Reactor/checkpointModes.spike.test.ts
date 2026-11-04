import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App, type AppCheckpoint, Timer } from "~/lib/Reactor/core/reactor";
import { resetClock, setClock, TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证检查点与模式切换的三条性质：
 * 1. 单步之后的实例可以切回时钟推进，唤醒不再被抑制。
 * 2. 队列排空时不排 snooze，队列不因单步而多出未来事件。
 * 3. 执行超时时，恢复后同一结束时刻只有一个 shutdown 事件。
 */

const PERIOD_MS = 10;

class TimedApp extends App {
	readonly tick: Timer;

	constructor(timeoutMs: number | undefined = undefined, periodMs = PERIOD_MS) {
		super(timeoutMs === undefined ? undefined : TimeValue.msecs(timeoutMs), true, true);
		this.tick = new Timer(this, TimeValue.msecs(periodMs), TimeValue.msecs(periodMs));
		this.addReaction([this.tick], [this.tick], () => undefined);
	}

	begin(): void {
		this._start();
		this._pauseScheduling();
	}

	step(): number {
		return this._stepToNextTag().time.toMilliseconds();
	}

	peekNext(): number | undefined {
		return this._peekNextTag()?.time.toMilliseconds();
	}

	capture(): AppCheckpoint {
		return this._captureCheckpoint();
	}

	resume(cp: AppCheckpoint): void {
		this._restoreCheckpoint(cp);
	}

	/** 切回时钟推进，用于观察唤醒是否恢复。 */
	resumeScheduling(): void {
		this._resumeScheduling();
	}

	isSuspended(): boolean {
		return this._sleepSuspended;
	}

	pendingTriggerNames(): string[] {
		return this._captureCheckpoint().pendingEvents.map((event) => event.triggerName);
	}
}

describe("检查点与模式切换", () => {
	beforeEach(() => {
		setClock({ now: () => TimeValue.zero() });
	});

	afterEach(() => {
		resetClock();
	});

	it("单步后可以切回时钟推进", () => {
		const app = new TimedApp();
		app.begin();
		app.step();
		expect(app.isSuspended()).toBe(true);

		app.resumeScheduling();
		expect(app.isSuspended()).toBe(false);
	});

	it("队列排空时不排 snooze", () => {
		// 一次性定时器：单步一次后队列真的空了，才会走到 keepAlive 分支。
		const app = new TimedApp(undefined, 0);
		app.begin();
		app.step();

		// keepAlive 为真，但单步模式下 `_next()` 不得自排唤醒。
		// 若排了 snooze，队首会是 advanceMessageInterval 之后的事件，不再为 null。
		expect(app.peekNext()).toBeUndefined();
	});

	it("恢复后同一结束时刻只有一个 shutdown 事件", () => {
		const first = new TimedApp(100);
		first.begin();
		first.step();
		first.step();
		const checkpoint = first.capture();

		const resumed = new TimedApp(100);
		resumed.resume(checkpoint);

		const shutdowns = resumed.pendingTriggerNames().filter((name) => name.endsWith("shutdown"));
		expect(shutdowns).toHaveLength(1);
	});
});
