import { describe, expect, it } from "vitest";
import { App, Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { TimeValue } from "~/lib/Reactor/core/time";

/**
 * 验证 Reactor 运行时可在本项目工具链内运行，并确认后续设计依赖的两条事实：
 * 1. 周期推进由 Timer 表达；积分器取 tag 的时间差作为段长度，位移与 period 无关。
 * 2. 逻辑时间在 fast 模式下不与物理时间挂钩，测试结果与机器速度无关。
 */

const SPEED_PER_SEC = 10;

class Mover extends Reactor {
	readonly tick: Timer;

	position = 0;

	/** 上一段的起点，积分器的段起点状态。 */
	lastTimeMs = 0;

	constructor(container: Reactor, periodMs: number) {
		super(container);
		this.tick = new Timer(this, TimeValue.zero(), TimeValue.msecs(periodMs));
	}
}

/** 以给定 period 驱动匀速直线运动，返回经过 durationMs 后的位移。 */
function runMover(periodMs: number, durationMs: number): Promise<number> {
	return new Promise((resolve, reject) => {
		const endMs = durationMs;

		class TestApp extends App {
			readonly mover: Mover;

			constructor() {
				super(
					TimeValue.secs(10),
					false,
					true,
					() => resolve(this.mover.position),
					() => reject(new Error("App 执行失败")),
				);
				this.mover = new Mover(this, periodMs);
				const app = this;
				this.addReaction([this.mover.tick], [this.mover.tick], function (this) {
					const nowMs = this.util.getElapsedLogicalTime().toMilliseconds();
					app.mover.position += (SPEED_PER_SEC * (nowMs - app.mover.lastTimeMs)) / 1000;
					app.mover.lastTimeMs = nowMs;
					if (nowMs >= endMs) {
						this.util.requestStop();
					}
				});
			}
		}
		const app = new TestApp();
		app._start();
	});
}

describe("Reactor 运行时基线", () => {
	it("定时器驱动的 reaction 可运行", async () => {
		const displacement = await runMover(10, 1000);
		expect(displacement).toBeGreaterThan(0);
	});

	it("积分结果与周期无关", async () => {
		const at100Hz = await runMover(10, 1000);
		const at50Hz = await runMover(20, 1000);
		expect(at100Hz).toBeCloseTo(10, 6);
		expect(at50Hz).toBeCloseTo(10, 6);
	});
});
