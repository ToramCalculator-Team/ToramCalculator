import { describe, expect, it } from "vitest";
import { evalTrajectory, resolveTrajectory, trajectoryDurationMs, trajectoryPresets } from "./trajectory";

const source = { x: 0, y: 0, z: 0 };
const target = { x: 10, y: 0, z: 0 };

describe("trajectory", () => {
	it("segment 按路径速度推进并在终点截断", () => {
		const resolved = resolveTrajectory(trajectoryPresets.projectileToTarget(5), source, target);
		expect(resolved.kind).toBe("segment");
		if (resolved.kind !== "segment") return;
		expect(resolved.from).toEqual(source);
		expect(resolved.to).toEqual(target);
		expect(trajectoryDurationMs(resolved)).toBe(2000);
		expect(evalTrajectory(resolved, 1000, { source, target })).toEqual({ x: 5, y: 0, z: 0 });
		expect(evalTrajectory(resolved, 99999, { source, target })).toEqual({ x: 10, y: 0, z: 0 });
	});

	it("ray 的 maxDistance 决定飞行时间与终点", () => {
		const resolved = resolveTrajectory(trajectoryPresets.projectileToDir({ x: 1, y: 0, z: 0 }, 2, 8), source, target);
		expect(resolved.kind).toBe("ray");
		if (resolved.kind !== "ray") return;
		expect(trajectoryDurationMs(resolved)).toBe(4000);
		expect(evalTrajectory(resolved, 2000, { source, target })).toEqual({ x: 4, y: 0, z: 0 });
	});

	it("spiral 从起始半径到结束半径并保持弧长匀速", () => {
		const resolved = resolveTrajectory(
			trajectoryPresets.spiralAroundSelf(0, 1, 5, (5 - 1) / (2 * Math.PI), 4),
			source,
			target,
		);
		expect(resolved.kind).toBe("spiral");
		if (resolved.kind !== "spiral") return;
		const duration = trajectoryDurationMs(resolved);
		expect(duration).toBeGreaterThan(0);
		if (duration == null) return;
		const start = evalTrajectory(resolved, 0, { source, target });
		const end = evalTrajectory(resolved, duration, { source, target });
		expect(Math.hypot(start.x - source.x, start.z - source.z)).toBeCloseTo(1, 5);
		expect(Math.hypot(end.x - source.x, end.z - source.z)).toBeCloseTo(5, 5);
	});

	it("附着轨迹只描述锚点运动，不携带区域生命周期", () => {
		const attachResolved = resolveTrajectory(trajectoryPresets.attachToSelf(), source, target);
		expect(attachResolved).toEqual({
			kind: "attach",
			anchor: "source",
			offset: { x: 0, y: 0, z: 0 },
		});
		expect(trajectoryDurationMs(attachResolved)).toBeNull();
		expect(evalTrajectory(attachResolved, 500, { source, target })).toEqual(source);
	});
});
