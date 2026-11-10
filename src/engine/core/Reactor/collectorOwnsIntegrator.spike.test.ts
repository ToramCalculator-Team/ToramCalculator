import { describe, expect, it } from "vitest";
import { Action } from "~/lib/Reactor/core/action";
import { InPort, OutPort } from "~/lib/Reactor/core/port";
import { App, Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { Origin, TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证采集器持有积分器与状态方程的结构：
 *
 *   模拟网络（周期 SIM_MS）──写──→ OutPort ──级联──→ 参数存储（纯 worker 内存）
 *                                                        ↓ 读取
 *                        采集器（自己的频率，任意）──求值──→ 输出缓冲
 *
 * 采集器不进入 Reactor 网络、不产生事件、不推进模拟。它读参数、按自己的频率求值、
 * 写输出缓冲。因此输出频率可以高于模拟频率，且状态方程只有一份实现。
 *
 * 阶段切换（分支）是离散事件：参数在事件所在 tag 被重新发布，采集器读到新参数后
 * 立即用新方程求值，不需要额外通知。
 */

const SIM_MS = 100;
const COLLECT_MS = 25;
const DURATION_MS = 500;

const FAST_SPEED = 10;
const SLOW_SPEED = 5;
const SWITCH_MS = 250;

/** 参数存储：模拟网络写，采集器读。纯 worker 内存，不进 SAB。 */
interface MotionParams {
	/** 当前分段的零点时刻（逻辑时间 ms）。 */
	segmentStartMs: number;
	/** 当前分段起点位置。 */
	segmentStartPosition: number;
	/** 当前分段速度。 */
	speedPerSec: number;
	/** 参数发布时刻，用于诊断。 */
	publishedAtMs: number;
}

/** 真值，用于断言。 */
function truePositionAt(tMs: number): number {
	if (tMs <= SWITCH_MS) return (FAST_SPEED * tMs) / 1000;
	return (FAST_SPEED * SWITCH_MS) / 1000 + (SLOW_SPEED * (tMs - SWITCH_MS)) / 1000;
}

/** 源反应器：只发布参数，不发布求值后的位置。 */
class ParamSource extends Reactor {
	readonly tick: Timer;

	/** 分段切换动作，在断点 tag 上精确触发，不等下一个网格点。 */
	readonly switchPhase: Action<null>;

	readonly params = new OutPort<MotionParams>(this);

	private current = 0;

	private lastTimeMs = 0;

	private slowPhase = false;

	constructor(
		container: Reactor,
		readonly store: MotionParams,
	) {
		super(container);
		this.tick = new Timer(this, TimeValue.msecs(SIM_MS), TimeValue.msecs(SIM_MS));
		this.switchPhase = new Action<null>(this, Origin.logical);
		const source = this;

		this.addReaction([this.startup], [this.schedulable(this.switchPhase)], function (this, switchPhase) {
			// 断点本身是一个被调度的事件 tag，不等网格点。
			switchPhase.schedule(TimeValue.msecs(SWITCH_MS), null);
		});

		this.addReaction([this.switchPhase], [this.switchPhase, this.writable(this.params)], function (this, _switch, params) {
			const nowMs = this.util.getElapsedLogicalTime().toMilliseconds();
			source.slowPhase = true;
			source.current = (FAST_SPEED * SWITCH_MS) / 1000;
			source.lastTimeMs = nowMs;

			// 断点当下发布新分段的全部参数，采集器立即改用新方程。
			params.set({
				segmentStartMs: SWITCH_MS,
				segmentStartPosition: source.current,
				speedPerSec: SLOW_SPEED,
				publishedAtMs: nowMs,
			});
		});

		this.addReaction(
			[this.tick],
			[this.tick, this.writable(this.params)],
			function (this, _tick, params) {
				const nowMs = this.util.getElapsedLogicalTime().toMilliseconds();
				const speed = source.slowPhase ? SLOW_SPEED : FAST_SPEED;
				source.current += (speed * (nowMs - source.lastTimeMs)) / 1000;
				source.lastTimeMs = nowMs;

				params.set({
					segmentStartMs: source.slowPhase ? SWITCH_MS : 0,
					segmentStartPosition: source.slowPhase ? (FAST_SPEED * SWITCH_MS) / 1000 : 0,
					speedPerSec: speed,
					publishedAtMs: nowMs,
				});
			},
		);
	}
}

/** 级联级：与端口同 tag 触发，把参数落到纯 worker 内存。 */
class ParamLatch extends Reactor {
	readonly source = new InPort<MotionParams>(this);

	constructor(
		container: Reactor,
		private readonly store: MotionParams,
	) {
		super(container);
		const latch = this;
		this.addReaction([this.source], [this.source], function (this, source) {
			const value = source.get();
			if (value === undefined) return;
			latch.store.segmentStartMs = value.segmentStartMs;
			latch.store.segmentStartPosition = value.segmentStartPosition;
			latch.store.speedPerSec = value.speedPerSec;
			latch.store.publishedAtMs = value.publishedAtMs;
		});
	}
}

interface Frame {
	logicalTimeMs: number;
	position: number;
}

/**
 * 采集器：不是 Reactor。由 worker 的实时时钟驱动，读参数、求值、写输出缓冲。
 * 这里用同步函数模拟一次采集，真实实现由 worker 的定时器或帧循环调用。
 */
function collectFrame(store: MotionParams, logicalTimeMs: number, out: Frame[]): void {
	const dt = (logicalTimeMs - store.segmentStartMs) / 1000;
	out.push({ logicalTimeMs, position: store.segmentStartPosition + store.speedPerSec * dt });
}

function run(): Promise<{ frames: Frame[]; simTags: number[] }> {
	return new Promise((resolve) => {
		const store: MotionParams = {
			segmentStartMs: 0,
			segmentStartPosition: 0,
			speedPerSec: FAST_SPEED,
			publishedAtMs: 0,
		};
		const frames: Frame[] = [];
		const simTags: number[] = [];

		class TestApp extends App {
			readonly source: ParamSource;

			constructor() {
				super(TimeValue.secs(5), false, true, () => resolve({ frames, simTags }));
				this.source = new ParamSource(this, store);
				const latch = new ParamLatch(this, store);
				this._connect(this.source.params, latch.source);
				const app = this;

				// 采集器按自己的频率采样，与模拟周期无关。
				const collectTimer = new Timer(
					this,
					TimeValue.msecs(COLLECT_MS),
					TimeValue.msecs(COLLECT_MS),
				);
				this.addReaction([collectTimer], [collectTimer], function (this) {
					const nowMs = this.util.getElapsedLogicalTime().toMilliseconds();
					collectFrame(store, nowMs, frames);
				});

				// 模拟网格标签，用于对照输出密度。
				this.addReaction([this.source.tick], [this.source.tick], function (this) {
					simTags.push(this.util.getElapsedLogicalTime().toMilliseconds());
				});

				const stop = new Timer(this, TimeValue.msecs(DURATION_MS), TimeValue.msecs(DURATION_MS));
				this.addReaction([stop], [stop], function () {
					void app;
					this.util.requestStop();
				});
			}
		}
		new TestApp()._start();
	});
}

describe("采集器持有积分器", () => {
	it("输出密度高于模拟密度", async () => {
		const { frames, simTags } = await run();
		expect(frames.length).toBeGreaterThan(simTags.length);
		expect(frames.length).toBeCloseTo(DURATION_MS / COLLECT_MS, 0);
	});

	it("每一个输出帧都等于真值，包括模拟没有推进的时刻", async () => {
		const { frames } = await run();
		const probes = frames.filter((f) => f.logicalTimeMs > 0);
		expect(probes.length).toBeGreaterThan(10);
		for (const frame of probes) {
			expect(frame.position).toBeCloseTo(truePositionAt(frame.logicalTimeMs), 9);
		}
	});

	it("分支切换后立即用新方程求值", async () => {
		const { frames } = await run();
		const atSwitch = frames.filter((f) => f.logicalTimeMs > SWITCH_MS && f.logicalTimeMs < SWITCH_MS + SIM_MS);
		expect(atSwitch.length).toBeGreaterThan(0);
		for (const frame of atSwitch) {
			expect(frame.position).toBeCloseTo(truePositionAt(frame.logicalTimeMs), 9);
		}
	});

	it("状态方程只有一份：采集器与真值函数一致到浮点精度", async () => {
		const { frames } = await run();
		const mid = frames.find((f) => f.logicalTimeMs === SWITCH_MS + COLLECT_MS);
		expect(mid).toBeDefined();
		if (mid === undefined) return;
		expect(mid.position).toBeCloseTo(truePositionAt(mid.logicalTimeMs), 12);
	});
});
