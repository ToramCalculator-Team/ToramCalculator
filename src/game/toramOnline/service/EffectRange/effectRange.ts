import type { WorldObservable } from "../observable";
import type { SpaceManager } from "../SpaceManager";
import { resolvePositionSource, resolveTrajectory, type Trajectory, type TrajectoryAnchors } from "./trajectory";
import type { EffectRange, Vec3 } from "./types";

export type ResolvedEffectRange = {
	shape: { kind: "point" } | { kind: "circle"; radius: number } | { kind: "rect"; width: number; height: number };
	position: Vec3;
	yaw: number;
	trajectory?: Trajectory;
};

function resolveShape(range: EffectRange, anchors: TrajectoryAnchors): ResolvedEffectRange["shape"] {
	if (range.shape.kind === "point") return { kind: "point" };
	if (range.shape.kind === "circle") return { kind: "circle", radius: range.shape.radius };
	return {
		kind: "rect",
		width: range.shape.width,
		height:
			range.shape.height === "sourceToTarget" ? distanceBetween(anchors.source, anchors.target) : range.shape.height,
	};
}

/** 在同一组 source/target 锚点上解析范围，供逻辑判定、Area 和渲染投影共用。 */
export function resolveEffectRange(range: EffectRange, anchors: TrajectoryAnchors): ResolvedEffectRange {
	const position =
		range.anchor.kind === "betweenSourceAndTarget"
			? {
					x: (anchors.source.x + anchors.target.x) / 2,
					y: (anchors.source.y + anchors.target.y) / 2,
					z: (anchors.source.z + anchors.target.z) / 2,
				}
			: resolvePositionSource(range.anchor, anchors);
	const yaw =
		range.yaw === "sourceToTarget"
			? Math.atan2(anchors.target.x - anchors.source.x, anchors.target.z - anchors.source.z)
			: range.yaw;
	return {
		shape: resolveShape(range, anchors),
		position,
		yaw,
		trajectory: range.trajectory ? resolveTrajectory(range.trajectory, anchors.source, anchors.target) : undefined,
	};
}

/**
 * 执行一次范围查询。
 *
 * 单体攻击由调用方传入锁定目标，其余形状统一走 SpaceManager；返回值顺序保持空间介质顺序，
 * 后续多段伤害只使用这次查询的快照，不重新读取范围。
 */
export function queryDamageTargets(input: {
	spaceManager: SpaceManager;
	resolvedRange: ResolvedEffectRange;
	sourceCampId: string;
	lockedTarget?: WorldObservable | null;
}): WorldObservable[] {
	const { resolvedRange } = input;
	if (resolvedRange.shape.kind === "point") {
		const target = input.lockedTarget;
		return target?.alive && target.campId !== input.sourceCampId ? [target] : [];
	}
	const options = {
		aliveOnly: true,
		filter: (observable: WorldObservable) => observable.campId !== input.sourceCampId,
	};
	if (resolvedRange.shape.kind === "rect") {
		return input.spaceManager.queryRectangle(
			resolvedRange.position,
			resolvedRange.shape.width,
			resolvedRange.shape.height,
			resolvedRange.yaw,
			options,
		).members;
	}
	return input.spaceManager.queryCircle(resolvedRange.position, resolvedRange.shape.radius, options).members;
}

export function damageDirection(center: Vec3, target: Vec3): "front" | "back" | "left" | "right" {
	const dx = target.x - center.x;
	const dz = target.z - center.z;
	if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return "front";
	if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? "right" : "left";
	return dz >= 0 ? "front" : "back";
}

export function distanceBetween(a: Vec3, b: Vec3): number {
	return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
