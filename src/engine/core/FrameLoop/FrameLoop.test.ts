import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FrameLoop } from "./FrameLoop";
import type { FrameLoopTick } from "./types";

describe("FrameLoop", () => {
	let nowMs = 0;
	let nextTimerId = 1;
	let timers: Map<Parameters<typeof clearTimeout>[0], () => void>;

	beforeEach(() => {
		nowMs = 0;
		nextTimerId = 1;
		timers = new Map();
		vi.spyOn(performance, "now").mockImplementation(() => nowMs);
		vi.spyOn(globalThis, "setTimeout").mockImplementation((handler, _delay, ...args) => {
			if (typeof handler !== "function") throw new Error("测试调度器只接受函数回调");
			// 确定性测试只需要稳定身份；Node 的 Timeout 对象不参与生产实现。
			const timerId = nextTimerId++ as unknown as ReturnType<typeof setTimeout>;
			timers.set(timerId, () => handler(...args));
			return timerId;
		});
		vi.spyOn(globalThis, "clearTimeout").mockImplementation((timerId) => {
			timers.delete(timerId);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function wakeAt(sampleTimeMs: number): void {
		const next = timers.entries().next();
		if (next.done) throw new Error("没有待执行的时钟回调");
		const [timerId, callback] = next.value;
		timers.delete(timerId);
		nowMs = sampleTimeMs;
		callback();
	}

	it("把不均匀唤醒换算为均匀 Fixed Tick", () => {
		const fixedStepMs = 1000 / 60;
		const batches: FrameLoopTick[] = [];
		const loop = new FrameLoop({ logicHz: 60 });
		loop.start((tick) => batches.push(tick));

		wakeAt(8);
		wakeAt(25);
		wakeAt(50);

		expect(batches.map((tick) => tick.dueTicks)).toEqual([1, 2]);
		const emittedSteps = batches.flatMap((tick) => Array.from({ length: tick.dueTicks }, () => tick.fixedStepMs));
		expect(emittedSteps).toHaveLength(3);
		for (const step of emittedSteps) expect(step).toBeCloseTo(fixedStepMs, 10);
		expect(loop.getFrameLoopStats().overstepMs).toBeCloseTo(0, 8);
	});

	it("单轮只追赶预算内 Tick，并记录丢弃的 Virtual Time", () => {
		const batches: FrameLoopTick[] = [];
		const loop = new FrameLoop({ logicHz: 60, maxCatchUpTicks: 2 });
		loop.start((tick) => batches.push(tick));

		wakeAt(100);

		expect(batches).toHaveLength(1);
		expect(batches[0]?.dueTicks).toBe(2);
		expect(batches[0]?.discardedVirtualTimeMs).toBeCloseTo(100 - 2 * (1000 / 60), 8);
		expect(loop.getFrameLoopStats().totalTicks).toBe(2);
	});

	it("暂停期间不补时，并保留暂停前的 Fixed Time overstep", () => {
		const batches: FrameLoopTick[] = [];
		const loop = new FrameLoop({ logicHz: 60 });
		loop.start((tick) => batches.push(tick));
		nowMs = 10;
		loop.pause();
		expect(timers.size).toBe(0);
		const pausedClock = loop.getClockSnapshot(100);
		expect(pausedClock.state).toBe("paused");
		expect(pausedClock.timelineTimeMs).toBeCloseTo(110, 8);

		nowMs = 1010;
		expect(loop.getClockSnapshot(100).timelineTimeMs).toBe(pausedClock.timelineTimeMs);
		loop.resume();
		expect(timers.size).toBe(1);
		wakeAt(1020);

		expect(batches.map((tick) => tick.dueTicks)).toEqual([1]);
		expect(loop.getClockSnapshot(100).timelineTimeMs).toBeCloseTo(100 + 20 - 1000 / 60, 8);
	});

	it("倍率变化先结算旧倍率，再按新倍率推进共享时间轴", () => {
		const batches: FrameLoopTick[] = [];
		const loop = new FrameLoop({ logicHz: 60 });
		loop.start((tick) => batches.push(tick));
		nowMs = 5;
		loop.setTimeScale(2);
		nowMs = 10;

		const clock = loop.getClockSnapshot(0);
		expect(clock.timelineTimeMs).toBeCloseTo(15, 8);
		expect(clock.timeScale).toBe(2);
		wakeAt(11);
		expect(batches.map((tick) => tick.dueTicks)).toEqual([1]);
	});

	it("运行态始终只保留一个 deadline timer", () => {
		const loop = new FrameLoop({ logicHz: 60 });
		loop.start(() => undefined);
		expect(timers.size).toBe(1);
		loop.start(() => undefined);
		expect(timers.size).toBe(1);
		loop.setTimeScale(1.5);
		expect(timers.size).toBe(1);
		loop.setLogicHz(30);
		expect(timers.size).toBe(1);
		loop.pause();
		expect(timers.size).toBe(0);
		loop.resume();
		expect(timers.size).toBe(1);
		loop.stop();
		expect(timers.size).toBe(0);
	});
});
