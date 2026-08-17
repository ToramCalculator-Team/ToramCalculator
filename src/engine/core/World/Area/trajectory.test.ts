import { describe, expect, it } from "vitest";
import {
	evalTrajectory,
	resolveTrajectory,
	type Trajectory,
	trajectoryDurationMs,
	trajectoryPresets,
} from "./trajectory";

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
		const start = evalTrajectory(resolved, 0, { source, target });
		const end = evalTrajectory(resolved, duration, { source, target });
		expect(Math.hypot(start.x - source.x, start.z - source.z)).toBeCloseTo(1, 5);
		expect(Math.hypot(end.x - source.x, end.z - source.z)).toBeCloseTo(5, 5);
	});

	it("静态预设与附着预设的解析", () => {
		const staticResolved = resolveTrajectory(
			trajectoryPresets.staticAtTarget(1000, { x: 0, y: 1, z: 0 }),
			source,
			target,
		);
		expect(staticResolved).toEqual({ kind: "static", center: { x: 10, y: 1, z: 0 }, lifetimeMs: 1000 });

		const attachResolved = resolveTrajectory(trajectoryPresets.attachToSelf(1000), source, target);
		expect(attachResolved).toEqual({
			kind: "attach",
			anchor: "source",
			offset: { x: 0, y: 0, z: 0 },
			lifetimeMs: 1000,
		});
		expect(evalTrajectory(attachResolved as Trajectory, 500, { source, target })).toEqual(source);
	});
});
