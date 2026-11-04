import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App, type AppCheckpoint, Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { resetClock, setClock, TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证 App 的运行控制：手动推进、捕获检查点、从检查点恢复。
 *
 * 调用方只接触两个检查点接口与一个推进接口，名字索引、事件重建、起始时间都在
 * App 内部完成。
 *
 * 基准是完整 tag 序列：启动本身会处理第一个逻辑时间，因此比对时要把启动算进去。
 */

const PERIOD_MS = 10;

class Recorder extends Reactor {
	readonly tick: Timer;

	readonly log: string[] = [];

	constructor(container: Reactor) {
		super(container);
		this.tick = new Timer(this, TimeValue.msecs(PERIOD_MS), TimeValue.msecs(PERIOD_MS));
		const recorder = this;

		this.addReaction([this.tick], [this.tick], function (this) {
			recorder.log.push(`t${this.util.getElapsedLogicalTime().toMilliseconds()}`);
		});
	}
}

class TestApp extends App {
	readonly recorder: Recorder;

	constructor() {
		super(undefined, false, true);
		this.recorder = new Recorder(this);
	}

	begin(): number {
		this._start();
		this._pauseScheduling();
		return this.currentMs();
	}

	currentMs(): number {
		return this.util.getCurrentTag().time.toMilliseconds();
	}

	stepOnce(): number {
		return this._stepToNextTag().time.toMilliseconds();
	}

	peekNext(): number | undefined {
		return this._peekNextTag()?.time.toMilliseconds();
	}

	capture(): AppCheckpoint {
		return this._captureCheckpoint();
	}

	resume(checkpoint: AppCheckpoint): number {
		this._restoreCheckpoint(checkpoint);
		return this.currentMs();
	}
}

function stepTimes(app: TestApp, count: number): number[] {
	const times: number[] = [];
	for (let i = 0; i < count; i += 1) {
		times.push(app.stepOnce());
	}
	return times;
}

describe("运行控制", () => {
	beforeEach(() => {
		setClock({ now: () => TimeValue.zero() });
	});

	afterEach(() => {
		resetClock();
	});

	it("手动推进按周期产生 tag", () => {
		const app = new TestApp();
		expect(app.begin()).toBe(PERIOD_MS);
		expect(stepTimes(app, 3)).toEqual([20, 30, 40]);
		expect(app.recorder.log).toEqual(["t10", "t20", "t30", "t40"]);
	});

	it("队首标签在推进后前移", () => {
		const app = new TestApp();
		app.begin();
		expect(app.peekNext()).toBe(20);
		app.stepOnce();
		expect(app.peekNext()).toBe(30);
	});

	it("捕获检查点不改变推进结果", () => {
		const plain = new TestApp();
		plain.begin();
		const plainTimes = stepTimes(plain, 4);

		const capturing = new TestApp();
		capturing.begin();
		const capturingTimes: number[] = [];
		for (let i = 0; i < 4; i += 1) {
			capturing.capture();
			capturingTimes.push(capturing.stepOnce());
		}

		expect(capturingTimes).toEqual(plainTimes);
		expect(capturing.recorder.log).toEqual(plain.recorder.log);
	});

	it("从检查点恢复后，tag 序列与不中断运行一致", () => {
		const straight = new TestApp();
		const full = [straight.begin(), ...stepTimes(straight, 7)];

		const first = new TestApp();
		const early = [first.begin(), ...stepTimes(first, 3)];
		const checkpoint = first.capture();

		const resumed = new TestApp();
		const rest = [resumed.resume(checkpoint), ...stepTimes(resumed, 3)];

		expect([...early, ...rest]).toEqual(full);
	});

	it("从检查点恢复后，反应产出的记录与不中断运行一致", () => {
		const straight = new TestApp();
		straight.begin();
		stepTimes(straight, 7);

		const first = new TestApp();
		first.begin();
		stepTimes(first, 3);
		const checkpoint = first.capture();

		const resumed = new TestApp();
		resumed.resume(checkpoint);
		stepTimes(resumed, 3);

		expect([...first.recorder.log, ...resumed.recorder.log]).toEqual(straight.recorder.log);
	});

	it("已启动的实例拒绝从检查点恢复", () => {
		const first = new TestApp();
		first.begin();
		first.stepOnce();
		const checkpoint = first.capture();

		const started = new TestApp();
		started.begin();

		expect(() => {
			started.resume(checkpoint);
		}).toThrow();
	});
});
