import { describe, expect, it } from "vitest";
import type { FrameLoopClockSnapshot } from "~/engine/core/FrameLoop/types";
import type { WorldStateSnapshot } from "~/engine/core/thread/worldStateBuffer";
import { resolveRenderLogicalTime, resolveRenderStateSnapshot } from "./renderTimeline";

function createSnapshot(
	logicalTimeMs: number,
	clockOverrides: Partial<FrameLoopClockSnapshot> = {},
): WorldStateSnapshot {
	return {
		commitVersion: 2,
		logicalTimeMs,
		tickIndex: 1,
		clock: {
			state: "running",
			revision: 1,
			sampledAtEpochMs: 10_000,
			timelineTimeMs: logicalTimeMs,
			timeScale: 1,
			fixedStepMs: 1000 / 60,
			...clockOverrides,
		},
		members: [],
		areas: [],
		modifierSources: [],
		modifierChains: [],
	};
}

describe("resolveRenderLogicalTime", () => {
	it("按共享倍率推进并默认落后一个 Fixed Tick", () => {
		const fixedStepMs = 1000 / 60;
		const snapshot = createSnapshot(100 + fixedStepMs, {
			timelineTimeMs: 100 + fixedStepMs,
			timeScale: 2,
		});

		expect(resolveRenderLogicalTime(snapshot, 10_005)).toBeCloseTo(110, 8);
	});

	it("Worker 提交延迟时最多外推一个 Fixed Tick", () => {
		const fixedStepMs = 1000 / 60;
		const snapshot = createSnapshot(100, { timelineTimeMs: 110 });

		expect(resolveRenderLogicalTime(snapshot, 10_100)).toBeCloseTo(100 + fixedStepMs, 8);
	});

	it("暂停或停止后固定在最后一个已完成逻辑 Tick", () => {
		for (const state of ["paused", "stopped"] as const) {
			const snapshot = createSnapshot(125, { state, timelineTimeMs: 130 });
			expect(resolveRenderLogicalTime(snapshot, 20_000)).toBe(125);
		}
	});

	it("离散状态到达 latest 逻辑时刻后才切换", () => {
		const previous = createSnapshot(100);
		const latest = createSnapshot(100 + 1000 / 60);

		expect(resolveRenderStateSnapshot(previous, latest, 110)).toBe(previous);
		expect(resolveRenderStateSnapshot(previous, latest, latest.logicalTimeMs)).toBe(latest);
	});
});
