import { describe, expect, it } from "vitest";
import { Action } from "~/lib/Reactor/core/action";
import { InPort, OutPort } from "~/lib/Reactor/core/port";
import { App, Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { Origin, TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证周期采集器与离散事件的关系：状态量在事件点发生分支切换后，
 * 采集序列的正确性只取决于"事件之后是否还有一次采样"；采集间隔内的线性插值
 * 必须以最近事件为窗口边界，否则跨事件插值会产生错误读数。
 *
 * 场景：位置在 t=250ms 从 10/s 切到 5/s。真值折线在 250ms 处斜率突变，
 * 该点由一次离散动作触发。成员与采集器是两个 reactor，经端口连接。
 */

const SLOW_START_MS = 250;
const FAST_SPEED = 10;
const SLOW_SPEED = 5;

/** 真值：分段线性，断点在 SLOW_START_MS。 */
function truePositionAt(tMs: number): number {
	if (tMs <= SLOW_START_MS) return (FAST_SPEED * tMs) / 1000;
	return (FAST_SPEED * SLOW_START_MS) / 1000 + (SLOW_SPEED * (tMs - SLOW_START_MS)) / 1000;
}

interface Sample {
	tMs: number;
	position: number;
}

class Mover extends Reactor {
	readonly tick: Timer;

	/** 阶段切换动作，在 SLOW_START_MS 所在 tag 触发一次。 */
	readonly switchPhase: Action<null>;

	readonly position = new OutPort<number>(this);

	/** 事件发生时刻，供测试断言。 */
	switchTagMs = Number.NaN;

	private current = 0;

	private lastTimeMs = 0;

	private slowPhase = false;

	constructor(container: Reactor, periodMs: number) {
		super(container);
		this.tick = new Timer(this, TimeValue.msecs(periodMs), TimeValue.msecs(periodMs));
		this.switchPhase = new Action<null>(this, Origin.logical);

		const mover = this;

		this.addReaction([this.switchPhase], [this.switchPhase], function () {
			mover.slowPhase = true;
			mover.switchTagMs = this.util.getElapsedLogicalTime().toMilliseconds();
		});

		this.addReaction(
			[this.tick],
			[this.tick, this.writable(this.position), this.schedulable(this.switchPhase)],
			function (this, _tick, position, switchPhase) {
				const nowMs = this.util.getElapsedLogicalTime().toMilliseconds();
				if (!mover.slowPhase && nowMs >= SLOW_START_MS) {
					switchPhase.schedule(0, null);
				}
				const speed = mover.slowPhase ? SLOW_SPEED : FAST_SPEED;
				mover.current += (speed * (nowMs - mover.lastTimeMs)) / 1000;
				mover.lastTimeMs = nowMs;
				position.set(mover.current);
			},
		);
	}
}

class Collector extends Reactor {
	readonly source = new InPort<number>(this);

	readonly sample: Timer;

	readonly samples: Sample[] = [];

	constructor(container: Reactor, periodMs: number) {
		super(container);
		this.sample = new Timer(this, TimeValue.msecs(periodMs), TimeValue.msecs(periodMs));
		const collector = this;
		this.addReaction([this.sample], [this.sample, this.source], function (this, _sample, source) {
			const value = source.get();
			if (value !== undefined) {
				collector.samples.push({ tMs: this.util.getElapsedLogicalTime().toMilliseconds(), position: value });
			}
		});
	}
}

interface RunResult {
	samples: Sample[];
	switchTagMs: number;
}

function runScenario(options: { simPeriodMs: number; samplePeriodMs: number; durationMs: number }): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const { simPeriodMs, samplePeriodMs, durationMs } = options;

		class TestApp extends App {
			readonly mover: Mover;

			readonly collector: Collector;

			constructor() {
				super(
					TimeValue.secs(10),
					false,
					true,
					() => resolve({ samples: this.collector.samples, switchTagMs: this.mover.switchTagMs }),
					() => reject(new Error("App 执行失败")),
				);
				this.mover = new Mover(this, simPeriodMs);
				this.collector = new Collector(this, samplePeriodMs);
				this._connect(this.mover.position, this.collector.source);

				// 采集器的停止由独立 Timer 决定，与采集本身分开。
				const app = this;
				const stopTimer = new Timer(this, TimeValue.msecs(durationMs), TimeValue.msecs(durationMs));
				this.addReaction([stopTimer], [stopTimer], function (this) {
					void app;
					this.util.requestStop();
				});
			}
		}
		const app = new TestApp();
		app._start();
	});
}

/** 相邻采样之间线性插值，窗口不裁剪。 */
function interpolateRaw(samples: Sample[], tMs: number): number | null {
	for (let i = 1; i < samples.length; i += 1) {
		const left = samples[i - 1];
		const right = samples[i];
		if (left === undefined || right === undefined) continue;
		if (tMs >= left.tMs && tMs <= right.tMs) {
			const span = right.tMs - left.tMs;
			if (span === 0) return right.position;
			return left.position + ((right.position - left.position) * (tMs - left.tMs)) / span;
		}
	}
	return null;
}

/** 相邻采样之间插值，跨事件点的窗口拒绝插值。 */
function interpolateWithEventBoundary(samples: Sample[], tMs: number, eventTimes: number[]): number | null {
	const boundary = eventTimes.filter((t) => t <= tMs).reduce((max, t) => Math.max(max, t), Number.NEGATIVE_INFINITY);
	for (let i = 1; i < samples.length; i += 1) {
		const left = samples[i - 1];
		const right = samples[i];
		if (left === undefined || right === undefined) continue;
		if (tMs >= left.tMs && tMs <= right.tMs) {
			if (left.tMs < boundary && right.tMs > boundary) return null;
			const span = right.tMs - left.tMs;
			if (span === 0) return right.position;
			return left.position + ((right.position - left.position) * (tMs - left.tMs)) / span;
		}
	}
	return null;
}

describe("周期采集器与离散事件", () => {
	it("事件之后的第一次采样反映切换结果", async () => {
		const { samples, switchTagMs } = await runScenario({ simPeriodMs: 10, samplePeriodMs: 100, durationMs: 500 });
		expect(switchTagMs).toBeCloseTo(SLOW_START_MS, 6);

		const afterSwitch = samples.filter((s) => s.tMs >= switchTagMs);
		expect(afterSwitch.length).toBeGreaterThan(0);
		for (const sample of afterSwitch) {
			expect(sample.position).toBeCloseTo(truePositionAt(sample.tMs), 6);
		}
	});

	it("未裁剪的插值在跨事件区间上偏离真值", async () => {
		const { samples, switchTagMs } = await runScenario({ simPeriodMs: 10, samplePeriodMs: 100, durationMs: 500 });
		// 事件时刻落在 200ms 与 300ms 两次采样之间，该区间内真值已换斜率。
		const raw = interpolateRaw(samples, switchTagMs);
		expect(raw).not.toBeNull();
		expect(Math.abs((raw as number) - truePositionAt(switchTagMs))).toBeGreaterThan(0.1);
	});

	it("以事件为窗口边界时插值不再产生错误读数", async () => {
		const { samples, switchTagMs } = await runScenario({ simPeriodMs: 10, samplePeriodMs: 100, durationMs: 500 });
		expect(interpolateWithEventBoundary(samples, switchTagMs, [switchTagMs])).toBeNull();
	});

	it("采集周期与模拟周期不整除时读到阶梯值，误差上限为一个模拟步长", async () => {
		const SIM_STEP_MS = 7;
		const MAX_SPEED = Math.max(FAST_SPEED, SLOW_SPEED);
		const { samples, switchTagMs } = await runScenario({ simPeriodMs: SIM_STEP_MS, samplePeriodMs: 5, durationMs: 500 });
		expect(samples.length).toBeGreaterThan(0);

		const afterSwitch = samples.filter((s) => s.tMs >= switchTagMs);
		expect(afterSwitch.length).toBeGreaterThan(0);
		for (const sample of afterSwitch) {
			expect(Math.abs(sample.position - truePositionAt(sample.tMs))).toBeLessThanOrEqual(
				(MAX_SPEED * SIM_STEP_MS) / 1000,
			);
		}

		// 采样快于模拟时读到的是上一个网格点的值，因此出现相邻相等值。
		const flatPairs = samples.filter((s, i) => i > 0 && s.position === samples[i - 1]?.position).length;
		expect(flatPairs).toBeGreaterThan(0);
	});
});
