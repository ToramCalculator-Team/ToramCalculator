/**
 * 区域轨迹描述符与求值函数。
 *
 * 逻辑层、SAB、渲染层与编辑器共用本模块：
 * - `TrajectoryTemplate` 是作者侧描述（起点/中心可以用施法者、目标或显式坐标）；
 * - `Trajectory` 是生成时解析后的具体轨迹（只含具体向量，可直接序列化进 SAB）；
 * - `resolveTrajectory` 在区域生成时把模板解析为具体轨迹；
 * - `evalTrajectory` 是纯函数，逻辑层与渲染层用同一份代码求当前帧位置。
 *
 * 所有移动轨迹都以「路径弧长 = speed * t」推进，距离越长飞行时间越长；
 * static / attach 没有路径长度，因此显式携带 lifetimeMs。
 */

export type Vec3 = {
	x: number;
	y: number;
	z: number;
};

/** 作者侧位置来源。 */
export type PositionSource =
	| { kind: "caster"; offset?: Vec3 }
	| { kind: "target"; offset?: Vec3 }
	| { kind: "explicit"; point: Vec3 };

/** 作者侧轨迹模板。 */
export type TrajectoryTemplate =
	| { kind: "static"; center: PositionSource; lifetimeMs: number }
	| { kind: "attach"; anchor: PositionSource; lifetimeMs: number }
	| { kind: "segment"; from: PositionSource; to: PositionSource; speed: number }
	| { kind: "ray"; from: PositionSource; dir: Vec3 | "toTarget"; speed: number; maxDistance: number }
	| {
			kind: "arc";
			center: PositionSource;
			normal: Vec3;
			radius: number;
			startAngle: number;
			endAngle: number;
			speed: number;
	  }
	| {
			kind: "spiral";
			center: PositionSource;
			normal: Vec3;
			startAngle: number;
			startRadius: number;
			endRadius: number;
			radiusGrowthPerRadian: number;
			speed: number;
	  };

/** 生成时解析后的具体轨迹；可直接写入 SAB。 */
export type Trajectory =
	| { kind: "static"; center: Vec3; lifetimeMs: number }
	| { kind: "attach"; anchor: "source" | "target"; offset: Vec3; lifetimeMs: number }
	| { kind: "segment"; from: Vec3; to: Vec3; speed: number }
	| { kind: "ray"; from: Vec3; dir: Vec3; speed: number; maxDistance: number }
	| { kind: "arc"; center: Vec3; normal: Vec3; radius: number; startAngle: number; endAngle: number; speed: number }
	| {
			kind: "spiral";
			center: Vec3;
			normal: Vec3;
			startAngle: number;
			startRadius: number;
			endRadius: number;
			radiusGrowthPerRadian: number;
			speed: number;
	  };

export type TrajectoryAnchors = {
	source: Vec3;
	target: Vec3;
};

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const EPSILON = 1e-6;

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(a: Vec3, scalar: number): Vec3 {
	return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

export function vec3Length(a: Vec3): number {
	return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function vec3Normalize(a: Vec3): Vec3 {
	const length = vec3Length(a);
	if (length < EPSILON) return { x: 0, y: 0, z: 0 };
	return vec3Scale(a, 1 / length);
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
	const clamped = Math.min(1, Math.max(0, t));
	return {
		x: a.x + (b.x - a.x) * clamped,
		y: a.y + (b.y - a.y) * clamped,
		z: a.z + (b.z - a.z) * clamped,
	};
}

function resolvePositionSource(source: PositionSource, anchors: TrajectoryAnchors): Vec3 {
	switch (source.kind) {
		case "caster":
			return vec3Add(anchors.source, source.offset ?? ZERO);
		case "target":
			return vec3Add(anchors.target, source.offset ?? ZERO);
		case "explicit":
			return source.point;
	}
}

/**
 * 把作者侧模板解析为具体轨迹。
 *
 * @param template 轨迹模板
 * @param source   施法者位置（区域生成时）
 * @param target   目标位置（区域生成时；无目标时退化为施法者位置）
 */
export function resolveTrajectory(template: TrajectoryTemplate, source: Vec3, target: Vec3): Trajectory {
	const anchors: TrajectoryAnchors = { source, target };
	switch (template.kind) {
		case "static":
			return {
				kind: "static",
				center: resolvePositionSource(template.center, anchors),
				lifetimeMs: template.lifetimeMs,
			};
		case "attach": {
			const anchor = template.anchor;
			if (anchor.kind === "caster") {
				return { kind: "attach", anchor: "source", offset: anchor.offset ?? ZERO, lifetimeMs: template.lifetimeMs };
			}
			if (anchor.kind === "target") {
				return { kind: "attach", anchor: "target", offset: anchor.offset ?? ZERO, lifetimeMs: template.lifetimeMs };
			}
			// 显式点无法跟随移动，退化为静止区域。
			return { kind: "static", center: anchor.point, lifetimeMs: template.lifetimeMs };
		}
		case "segment": {
			const from = resolvePositionSource(template.from, anchors);
			const to = resolvePositionSource(template.to, anchors);
			return { kind: "segment", from, to, speed: template.speed };
		}
		case "ray": {
			const from = resolvePositionSource(template.from, anchors);
			const dir = template.dir === "toTarget" ? vec3Normalize(vec3Sub(target, from)) : vec3Normalize(template.dir);
			return { kind: "ray", from, dir, speed: template.speed, maxDistance: template.maxDistance };
		}
		case "arc": {
			const center = resolvePositionSource(template.center, anchors);
			return {
				kind: "arc",
				center,
				normal: vec3Normalize(template.normal),
				radius: template.radius,
				startAngle: template.startAngle,
				endAngle: template.endAngle,
				speed: template.speed,
			};
		}
		case "spiral": {
			const center = resolvePositionSource(template.center, anchors);
			return {
				kind: "spiral",
				center,
				normal: vec3Normalize(template.normal),
				startAngle: template.startAngle,
				startRadius: template.startRadius,
				endRadius: template.endRadius,
				radiusGrowthPerRadian: template.radiusGrowthPerRadian,
				speed: template.speed,
			};
		}
	}
}

/** 由法向量构造一组正交基，用于在法平面内画圆。 */
function buildOrthonormalBasis(normal: Vec3): { u: Vec3; v: Vec3 } {
	const n = vec3Normalize(normal);
	const reference = Math.abs(n.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
	const u = vec3Normalize(cross(reference, n));
	const v = cross(n, u);
	return { u, v };
}

function cross(a: Vec3, b: Vec3): Vec3 {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

function spiralArcLength(radiusGrowthPerRadian: number, startRadius: number, theta: number): number {
	if (Math.abs(radiusGrowthPerRadian) < EPSILON) return Math.abs(startRadius) * Math.abs(theta);
	const k = radiusGrowthPerRadian;
	const a = Math.abs(k);
	const u0 = startRadius;
	const u1 = startRadius + k * theta;
	return (spiralArcLengthIntegral(u1, a) - spiralArcLengthIntegral(u0, a)) / k;
}

function spiralArcLengthIntegral(u: number, a: number): number {
	const sqrt = Math.sqrt(u * u + a * a);
	return (u / 2) * sqrt + ((a * a) / 2) * Math.asinh(u / a);
}

function solveSpiralTheta(
	radiusGrowthPerRadian: number,
	startRadius: number,
	targetArcLength: number,
	maxTheta: number,
): number {
	if (Math.abs(radiusGrowthPerRadian) < EPSILON) {
		return startRadius === 0 ? 0 : targetArcLength / Math.abs(startRadius);
	}
	const k = radiusGrowthPerRadian;
	const total = spiralArcLength(k, startRadius, maxTheta);
	const clamped = Math.min(Math.max(0, targetArcLength), Math.abs(total));
	let theta = maxTheta * (clamped / Math.max(EPSILON, Math.abs(total)));
	for (let iteration = 0; iteration < 8; iteration++) {
		const current = spiralArcLength(k, startRadius, theta);
		const derivative = Math.sqrt((startRadius + k * theta) ** 2 + k * k);
		if (Math.abs(current - clamped) < 1e-4 || derivative < EPSILON) break;
		theta -= (current - clamped) / derivative;
	}
	return Math.min(Math.max(0, theta), Math.abs(maxTheta));
}

/**
 * 求轨迹在 `elapsedMs` 时刻的位置。
 *
 * 移动轨迹按弧长匀速推进；elapsedMs 超过生命周期时返回终点位置。
 * attach 轨迹需要每帧的锚点位置，由 `anchors` 提供。
 */
export function evalTrajectory(trajectory: Trajectory, elapsedMs: number, anchors: TrajectoryAnchors): Vec3 {
	const elapsedSec = Math.max(0, elapsedMs) / 1000;
	switch (trajectory.kind) {
		case "static":
			return trajectory.center;
		case "attach": {
			const anchor = trajectory.anchor === "source" ? anchors.source : anchors.target;
			return vec3Add(anchor, trajectory.offset);
		}
		case "segment": {
			const total = vec3Length(vec3Sub(trajectory.to, trajectory.from));
			if (total < EPSILON) return trajectory.to;
			const ratio = Math.min(1, (trajectory.speed * elapsedSec) / total);
			return vec3Lerp(trajectory.from, trajectory.to, ratio);
		}
		case "ray": {
			const distance = Math.min(trajectory.maxDistance, trajectory.speed * elapsedSec);
			return vec3Add(trajectory.from, vec3Scale(trajectory.dir, distance));
		}
		case "arc": {
			const radius = Math.max(EPSILON, trajectory.radius);
			const delta = trajectory.endAngle - trajectory.startAngle;
			const direction = Math.sign(delta) || 1;
			const travelled = (trajectory.speed * elapsedSec) / radius;
			const maxAngle = Math.abs(delta);
			const theta = direction * Math.min(maxAngle, travelled);
			const { u, v } = buildOrthonormalBasis(trajectory.normal);
			const x = Math.cos(theta) * radius;
			const y = Math.sin(theta) * radius;
			return {
				x: trajectory.center.x + u.x * x + v.x * y,
				y: trajectory.center.y + u.y * x + v.y * y,
				z: trajectory.center.z + u.z * x + v.z * y,
			};
		}
		case "spiral": {
			const k = trajectory.radiusGrowthPerRadian;
			if (Math.abs(k) < EPSILON) {
				// 半径不变时退化为圆弧。
				const radius = Math.max(EPSILON, trajectory.startRadius);
				const theta = (trajectory.speed * elapsedSec) / radius;
				const { u, v } = buildOrthonormalBasis(trajectory.normal);
				const angle = trajectory.startAngle + theta;
				return {
					x: trajectory.center.x + u.x * Math.cos(angle) * radius + v.x * Math.sin(angle) * radius,
					y: trajectory.center.y + u.y * Math.cos(angle) * radius + v.y * Math.sin(angle) * radius,
					z: trajectory.center.z + u.z * Math.cos(angle) * radius + v.z * Math.sin(angle) * radius,
				};
			}
			const maxTheta = (trajectory.endRadius - trajectory.startRadius) / k;
			const totalArcLength = Math.abs(spiralArcLength(k, trajectory.startRadius, maxTheta));
			const targetArcLength = Math.min(totalArcLength, trajectory.speed * elapsedSec);
			const theta = solveSpiralTheta(k, trajectory.startRadius, targetArcLength, maxTheta);
			const radius = trajectory.startRadius + k * theta;
			const { u, v } = buildOrthonormalBasis(trajectory.normal);
			const angle = trajectory.startAngle + theta;
			return {
				x: trajectory.center.x + u.x * Math.cos(angle) * radius + v.x * Math.sin(angle) * radius,
				y: trajectory.center.y + u.y * Math.cos(angle) * radius + v.y * Math.sin(angle) * radius,
				z: trajectory.center.z + u.z * Math.cos(angle) * radius + v.z * Math.sin(angle) * radius,
			};
		}
	}
}

/** 轨迹生命周期（毫秒）。移动轨迹由路径长度与速度推导，不单独指定。 */
export function trajectoryDurationMs(trajectory: Trajectory): number {
	switch (trajectory.kind) {
		case "static":
		case "attach":
			return trajectory.lifetimeMs;
		case "segment": {
			const distance = vec3Length(vec3Sub(trajectory.to, trajectory.from));
			return trajectory.speed > 0 ? (distance / trajectory.speed) * 1000 : 0;
		}
		case "ray":
			return trajectory.speed > 0 ? (trajectory.maxDistance / trajectory.speed) * 1000 : 0;
		case "arc": {
			const delta = Math.abs(trajectory.endAngle - trajectory.startAngle);
			return trajectory.speed > 0 ? (trajectory.radius * delta * 1000) / trajectory.speed : 0;
		}
		case "spiral": {
			if (trajectory.speed <= 0) return 0;
			const k = trajectory.radiusGrowthPerRadian;
			const maxTheta = (trajectory.endRadius - trajectory.startRadius) / k;
			const arcLength = Math.abs(spiralArcLength(k, trajectory.startRadius, maxTheta));
			return (arcLength / trajectory.speed) * 1000;
		}
	}
}

/** 轨迹结束时间（毫秒）。 */
export function trajectoryEndTimeMs(trajectory: Trajectory, spawnTimeMs: number): number {
	return spawnTimeMs + trajectoryDurationMs(trajectory);
}

/**
 * 常用轨迹预设。供 BT/DSL 伤害节点和区域动画编辑器引用。
 */
export const trajectoryPresets = {
	/** 自身位置静止区域 */
	staticAtSelf(lifetimeMs: number, offset?: Vec3): TrajectoryTemplate {
		return { kind: "static", center: { kind: "caster", offset }, lifetimeMs };
	},
	/** 目标位置静止区域 */
	staticAtTarget(lifetimeMs: number, offset?: Vec3): TrajectoryTemplate {
		return { kind: "static", center: { kind: "target", offset }, lifetimeMs };
	},
	/** 附着自身移动 */
	attachToSelf(lifetimeMs: number, offset?: Vec3): TrajectoryTemplate {
		return { kind: "attach", anchor: { kind: "caster", offset }, lifetimeMs };
	},
	/** 附着目标移动 */
	attachToTarget(lifetimeMs: number, offset?: Vec3): TrajectoryTemplate {
		return { kind: "attach", anchor: { kind: "target", offset }, lifetimeMs };
	},
	/** 飞箭：从施法者位置飞向目标位置，距离越长飞行时间越长。 */
	projectileToTarget(speed: number): TrajectoryTemplate {
		return { kind: "segment", from: { kind: "caster" }, to: { kind: "target" }, speed };
	},
	/** 直线弹道：从施法者位置沿指定方向飞行。 */
	projectileToDir(dir: Vec3, speed: number, maxDistance: number): TrajectoryTemplate {
		return { kind: "ray", from: { kind: "caster" }, dir, speed, maxDistance };
	},
	/** 直线弹道：从施法者位置飞向目标位置，并按 maxDistance 截断。 */
	projectileRayToTarget(speed: number, maxDistance: number): TrajectoryTemplate {
		return { kind: "ray", from: { kind: "caster" }, dir: "toTarget", speed, maxDistance };
	},
	/** 自身周围圆弧 */
	arcAroundSelf(
		radius: number,
		startAngle: number,
		endAngle: number,
		speed: number,
		normal: Vec3 = { x: 0, y: 1, z: 0 },
	): TrajectoryTemplate {
		return { kind: "arc", center: { kind: "caster" }, normal, radius, startAngle, endAngle, speed };
	},
	/** 自身中心螺旋线 */
	spiralAroundSelf(
		startAngle: number,
		startRadius: number,
		endRadius: number,
		radiusGrowthPerRadian: number,
		speed: number,
		normal: Vec3 = { x: 0, y: 1, z: 0 },
	): TrajectoryTemplate {
		return {
			kind: "spiral",
			center: { kind: "caster" },
			normal,
			startAngle,
			startRadius,
			endRadius,
			radiusGrowthPerRadian,
			speed,
		};
	},
} as const;
