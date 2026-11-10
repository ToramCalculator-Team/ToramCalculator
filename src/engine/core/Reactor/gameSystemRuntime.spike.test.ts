import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Reactor, Timer } from "~/lib/Reactor/core/reactor";
import { resetClock, setClock, TimeValue } from "~/lib/Reactor/core/time";
import type { SimulationTime } from "../GameSystem";
import { ReactorGameSystem } from "./ReactorGameSystem";

/**
 * 验证 P2 的四条性质：
 * 1. 单步推进一个逻辑时间并排空全部微步。
 * 2. 暂停后逻辑时间不前进、物理时间不前进，恢复后继续。
 * 3. 暂停不丢弃待处理事件。
 * 4. tag 完成只在一个逻辑时间没有后续微步时通知。
 */

const PERIOD_MS = 10;

/** 手动控制的物理时钟。 */
class ManualClock {
	nowMs = 0;

	now(): TimeValue {
		return TimeValue.msecs(this.nowMs);
	}
}

class Counter extends Timer {
	constructor(container: Reactor) {
		super(container, TimeValue.msecs(PERIOD_MS), TimeValue.msecs(PERIOD_MS));
	}
}

class TestGameSystem extends ReactorGameSystem {
	readonly tick: Counter;

	ticks = 0;

	constructor() {
		super(undefined, false, false);
		this.tick = new Counter(this);
		this.addReaction([this.tick], [this.tick], () => {
			this.ticks += 1;
		});
	}

	public initialize(): void {
		// 本用例只有一个周期节点，网络根即自身。
	}

	/** 推进模式：true 表示调度器不自行安排唤醒。 */
	isSchedulingSuspended(): boolean {
		return this._sleepSuspended;
	}
}

describe("GameSystem 运行控制", () => {
	let clock: ManualClock;

	beforeEach(() => {
		clock = new ManualClock();
		setClock({ now: () => clock.now() });
	});

	afterEach(() => {
		resetClock();
	});

	it("单步推进一个逻辑时间并排空微步", () => {
		const system = new TestGameSystem();
		system.start();
		const first = system.getTime();
		const second = system.stepToNext();

		expect(second).not.toBeNull();
		expect(second?.timeMs).toBeGreaterThan(first.timeMs);
		expect(system.ticks).toBeGreaterThan(0);
	});

	it("暂停后逻辑时间不前进，恢复后继续推进", () => {
		const system = new TestGameSystem();
		system.start();
		system.stepToNext();
		const logicalBefore = system.getTime();

		system.pause();
		clock.nowMs += 500;

		expect(system.getTime().timeMs).toBe(logicalBefore.timeMs);

		// 恢复后从暂停时的逻辑时刻继续，不补算暂停期间的物理时间。
		system.resume();
		system.stepToNext();
		expect(system.getTime().timeMs).toBe(logicalBefore.timeMs + PERIOD_MS);
	});

	it("暂停不丢弃待处理事件", () => {
		const system = new TestGameSystem();
		system.start();
		system.stepToNext();
		const ticksBefore = system.ticks;

		system.pause();
		clock.nowMs += 100;
		system.resume();
		system.stepToNext();

		expect(system.ticks).toBeGreaterThan(ticksBefore);
	});

	it("tag 完成只在一个逻辑时间没有后续微步时通知", () => {
		const system = new TestGameSystem();
		const seen: SimulationTime[] = [];
		system.onAdvance((time) => seen.push(time));
		system.start();
		system.stepToNext();
		system.stepToNext();

		const times = seen.map((time) => time.timeMs);
		expect(times.length).toBeGreaterThan(0);
		// 每次通知对应一个不同的逻辑时间。
		expect(new Set(times).size).toBe(times.length);
	});
});

describe("单步不改变推进模式", () => {
	beforeEach(() => {
		setClock({ now: () => TimeValue.zero() });
	});

	afterEach(() => {
		resetClock();
	});

	it("单步后仍处于时钟推进模式", () => {
		const system = new TestGameSystem();
		system.start();
		system.stepToNext();

		// 单步不得把实例永久留在手动模式：否则此后调度器再也无法自行唤醒。
		expect(system.isSchedulingSuspended()).toBe(false);
	});
});
