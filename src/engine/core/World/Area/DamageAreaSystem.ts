import { createLogger } from "~/lib/logger";
import type { Checkpointable, DamageAreaSystemCheckpoint, SimulationTickContext } from "../../types";
import type { MemberManager } from "../MemberManager";
import type { WorldObservable } from "../observable";
import type { SpaceManager } from "../SpaceManager";
import {
	evalTrajectory,
	resolveTrajectory,
	type Trajectory,
	type TrajectoryAnchors,
	trajectoryDurationMs,
	vec3Normalize,
} from "./trajectory";
import {
	type DamageAreaRequest,
	type DamageDirection,
	type DamageDispatchPayload,
	type Vec3,
	WORLD_AREA_CAPACITY,
	WORLD_AREA_CAPACITY_EXCEEDED_CODE,
} from "./types";

const log = createLogger("DmgArea");

/**
 * 伤害区域实例
 */
interface DamageAreaInstance {
	/** 区域ID */
	areaId: string;
	/** 请求数据 */
	request: DamageAreaRequest;
	/** 形状：目前为 circle */
	shape: {
		type: "circle";
		radius: number;
	};
	/** 生成时解析好的具体轨迹；逻辑与渲染共用同一求值函数。 */
	trajectory: Trajectory;
	/** 轨迹路径生命周期（毫秒）。移动轨迹由弧长推导，static/attach 为显式 lifetimeMs。 */
	trajectoryDurationMs: number;
	/**
	 * 实例存活生命周期（毫秒）。在轨迹路径生命周期基础上，为多段伤害保留后续结算窗口：
	 * - static/attach / 区域检索：max(路径时长, 原伤害窗口)
	 * - 单体弹道：路径时长 + 原伤害窗口（到达后才开始结算）
	 */
	instanceDurationMs: number;
	/** 每个目标的最后命中时间（用于 hitIntervalMs 节流） */
	lastHitTimeMsByTargetId: Map<string, number>;
	/** 每个目标已派发的伤害段数（用于 damageCount 上限） */
	damageCountByTargetId: Map<string, number>;
}

export interface DamageAreaRealtimeState {
	id: string;
	shape: { kind: "point" | "circle" | "rect"; radius: number; width?: number; height?: number };
	spawnTimeMs: number;
	trajectory: Trajectory;
	sourceMemberId: string;
	targetMemberId?: string;
	visualProfileId?: string;
}

/**
 * 伤害区域系统
 * 管理跨帧伤害区域实例，负责命中检测、节流、动态变量注入和事件派发
 */
export class DamageAreaSystem implements Checkpointable<DamageAreaSystemCheckpoint> {
	private instances: Map<string, DamageAreaInstance> = new Map();
	private nextAreaId = 1;

	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {}

	/**
	 * 添加伤害区域
	 */
	add(request: DamageAreaRequest): string {
		if (this.instances.size >= WORLD_AREA_CAPACITY) {
			throw new Error(
				`[${WORLD_AREA_CAPACITY_EXCEEDED_CODE}] damage area 容量超限: ${this.instances.size + 1} > ${WORLD_AREA_CAPACITY}`,
			);
		}
		const areaId = `damage_${this.nextAreaId++}`;
		const { shape, trajectory, trajectoryDurationMs, instanceDurationMs } = this.deriveShapeAndTrajectory(request);

		const instance: DamageAreaInstance = {
			areaId,
			request,
			shape,
			trajectory,
			trajectoryDurationMs,
			instanceDurationMs,
			lastHitTimeMsByTargetId: new Map(),
			damageCountByTargetId: new Map(),
		};

		this.instances.set(areaId, instance);
		log.debug(`DamageAreaSystem: 添加伤害区域: ${areaId}`);
		return areaId;
	}

	/** 供预览分支判断技能是否生成过伤害区域；区域可能在同帧过期，不能只看当前存活实例。 */
	getCreatedAreaCount(): number {
		return this.nextAreaId - 1;
	}

	/**
	 * 移除伤害区域
	 */
	remove(areaId: string): void {
		log.debug(`DamageAreaSystem: 移除伤害区域: ${areaId}`);
		this.instances.delete(areaId);
	}

	/**
	 * 按施法者ID移除所有相关区域
	 */
	removeBySource(sourceId: string): void {
		log.debug(`DamageAreaSystem: 移除施法者: ${sourceId}的所有伤害区域`);
		for (const [areaId, instance] of this.instances.entries()) {
			if (instance.request.identity.sourceId === sourceId) {
				this.instances.delete(areaId);
			}
		}
	}

	/**
	 * 每 tick 更新
	 */
	tick(tick: SimulationTickContext): void {
		const currentTimeMs = tick.currentTimeMs;
		const instancesToRemove: string[] = [];

		for (const instance of this.instances.values()) {
			const { request, shape } = instance;
			const { startTimeMs } = request.lifetime;

			// 检查生命周期
			if (currentTimeMs < startTimeMs) {
				continue; // 尚未开始
			}
			if (currentTimeMs >= startTimeMs + instance.instanceDurationMs) {
				instancesToRemove.push(instance.areaId);
				continue; // 已过期
			}

			// 计算当前中心点
			const currentCenter = this.computeCurrentCenter(instance, currentTimeMs);

			// 单体锁定检索需要等待弹道到达；static/attach 视为立即到达。
			const elapsedMs = Math.max(0, currentTimeMs - startTimeMs);
			const hasArrived =
				instance.trajectory.kind === "static" ||
				instance.trajectory.kind === "attach" ||
				elapsedMs + Math.max(1, tick.deltaTimeMs) >= instance.trajectoryDurationMs;

			const hitIntervalMs = request.hitPolicy.hitIntervalMs;
			const damageCount = Math.max(1, Math.floor(request.attackSemantics.damageCount));
			const segmentIndexesByTargetId = new Map<string, number[]>();
			const collectSegmentIndexes = (targetId: string): number[] => {
				const dispatchedCount = instance.damageCountByTargetId.get(targetId) ?? 0;
				if (dispatchedCount >= damageCount) return [];

				const lastHitTimeMs = instance.lastHitTimeMsByTargetId.get(targetId) ?? -Infinity;
				if (hitIntervalMs > 0 && currentTimeMs - lastHitTimeMs < hitIntervalMs) return [];

				const remaining = damageCount - dispatchedCount;
				const dispatchCount = hitIntervalMs <= 0 ? remaining : 1;
				const indexes = Array.from({ length: dispatchCount }, (_, index) => dispatchedCount + index);
				instance.damageCountByTargetId.set(targetId, dispatchedCount + dispatchCount);
				instance.lastHitTimeMsByTargetId.set(targetId, currentTimeMs);
				return indexes;
			};

			// 根据范围类型选择候选目标。
			// 统一以 WorldObservable 只读视图承载，调用方只依赖 id/campId/position/alive，
			// 不再触碰富类 Member 内部实现（偏差#1 收敛）。
			let validTargets: WorldObservable[];

			if (request.range.rangeKind === "Single" || request.range.rangeKind === "None") {
				// 单体/无范围：锁定 targetId，不经空间查询。
				// 仍取 Member（getMember 返回富类，本身即 WorldObservable），但只读取投影字段。
				if (!hasArrived) {
					validTargets = [];
				} else {
					const singleTarget = request.targetId ? this.memberManager.getMember(request.targetId) : null;
					if (singleTarget?.alive && singleTarget.campId !== request.identity.sourceCampId) {
						const segmentIndexes = collectSegmentIndexes(singleTarget.id);
						if (segmentIndexes.length > 0) {
							segmentIndexesByTargetId.set(singleTarget.id, segmentIndexes);
							validTargets = [singleTarget];
						} else {
							validTargets = [];
						}
					} else {
						validTargets = [];
					}
				}
			} else {
				// 查询范围内的候选目标。存活过滤就地下沉给介质，敌我关系在此判定。
				const candidates = this.spaceManager.queryCircle(currentCenter, shape.radius, {
					aliveOnly: true,
					filter: (observable) => observable.campId !== request.identity.sourceCampId,
				});

				// 命中节流：间隔达到 hitIntervalMs 后允许再次命中
				validTargets = [];
				for (const target of candidates.members) {
					const segmentIndexes = collectSegmentIndexes(target.id);
					if (segmentIndexes.length > 0) {
						validTargets.push(target);
						segmentIndexesByTargetId.set(target.id, segmentIndexes);
					}
				}
			}

			// 计算动态变量
			const targetCount = validTargets.length;

			// 对每个有效目标派发伤害
			for (const target of validTargets) {
				const distance = this.computeDistance(currentCenter, target.position);
				const direction = this.computeDirection(currentCenter, target.position);
				const segmentIndexes = segmentIndexesByTargetId.get(target.id) ?? [0];

				for (const damageIndex of segmentIndexes) {
					const payload: DamageDispatchPayload = {
						sourceId: request.identity.sourceId,
						sourceSkillId: request.identity.sourceSkillId,
						areaId: instance.areaId,
						damageFormula: request.payload.damageFormula,
						casterSnapshot: request.payload.casterSnapshot,
						skillLv: request.payload.skillLv,
						damageCount: request.attackSemantics.damageCount,
						damageIndex,
						damageTags: [...request.payload.damageTags],
						warningZone: request.payload.warningZone,
						lockCasterAttributes: request.payload.lockCasterAttributes,
						direction,
						// 受击 Pipeline 计算最终伤害后会回填 isFatal；派发时未知。
						isFatal: false,
						vars: {
							distance,
							targetCount,
						},
					};

					// 派发到目标。
					// 经 memberManager.sendTo(id, event) 路由，而非 target.actor.send——
					// 因为 target 是 WorldObservable 只读投影，不暴露 actor。
					this.memberManager.sendTo(target.id, {
						type: "受到攻击",
						data: { damageRequest: payload },
					});
				}
			}
		}

		// 移除过期的实例
		for (const areaId of instancesToRemove) {
			log.debug(`DamageAreaSystem: 移除过期的伤害区域: ${areaId}`);
			this.instances.delete(areaId);
		}
	}

	/**
	 * 计算当前中心点
	 */
	private computeCurrentCenter(instance: DamageAreaInstance, currentTimeMs: number): Vec3 {
		const { trajectory, request } = instance;
		const { startTimeMs } = request.lifetime;
		const anchors = this.getTrajectoryAnchors(request);
		return evalTrajectory(trajectory, Math.max(0, currentTimeMs - startTimeMs), anchors);
	}

	/** 读取 attach 轨迹所需的锚点位置。 */
	private getTrajectoryAnchors(request: DamageAreaRequest): TrajectoryAnchors {
		const caster = this.memberManager.getMember(request.identity.sourceId);
		const target = request.targetId ? this.memberManager.getMember(request.targetId) : undefined;
		const sourcePos = caster?.position ?? { x: 0, y: 0, z: 0 };
		const targetPos = target?.position ?? sourcePos;
		return { source: sourcePos, target: targetPos };
	}

	/**
	 * 计算距离
	 */
	private computeDistance(a: Vec3, b: Vec3): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		const dz = a.z - b.z;
		return Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	/**
	 * 计算目标相对施法者的方位（四向）。
	 *
	 * 当前实现：仅基于 XZ 平面位置差。XZ 都接近 0 时视为正面命中。
	 * 后续当 Member 拥有独立 `facing` 字段后，应改为在目标本地坐标系下计算。
	 */
	private computeDirection(casterCenter: Vec3, targetPos: Vec3): DamageDirection {
		const dx = targetPos.x - casterCenter.x;
		const dz = targetPos.z - casterCenter.z;
		if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return "front";
		if (Math.abs(dx) >= Math.abs(dz)) {
			return dx >= 0 ? "right" : "left";
		}
		return dz >= 0 ? "front" : "back";
	}

	captureCheckpoint(): DamageAreaSystemCheckpoint {
		const instances: DamageAreaSystemCheckpoint["instances"] = [];
		for (const instance of this.instances.values()) {
			instances.push({
				areaId: instance.areaId,
				requestPayload: structuredClone(instance.request),
				lastHitTimeMsByTargetId: Array.from(instance.lastHitTimeMsByTargetId.entries()),
				damageCountByTargetId: Array.from(instance.damageCountByTargetId.entries()),
			});
		}
		return {
			nextAreaId: this.nextAreaId,
			instances,
		};
	}

	restoreCheckpoint(checkpoint: DamageAreaSystemCheckpoint): void {
		this.instances.clear();
		this.nextAreaId = checkpoint.nextAreaId;

		for (const entry of checkpoint.instances) {
			const request = entry.requestPayload as DamageAreaRequest;
			const { shape, trajectory, trajectoryDurationMs, instanceDurationMs } = this.deriveShapeAndTrajectory(request);
			const instance: DamageAreaInstance = {
				areaId: entry.areaId,
				request,
				shape,
				trajectory,
				trajectoryDurationMs,
				instanceDurationMs,
				lastHitTimeMsByTargetId: new Map(entry.lastHitTimeMsByTargetId),
				damageCountByTargetId: new Map(entry.damageCountByTargetId ?? []),
			};
			this.instances.set(entry.areaId, instance);
		}
	}

	private deriveShapeAndTrajectory(
		request: DamageAreaRequest,
	): Pick<DamageAreaInstance, "shape" | "trajectory" | "trajectoryDurationMs" | "instanceDurationMs"> {
		const { rangeKind, rangeParams } = request.range;
		const caster = this.memberManager.getMember(request.identity.sourceId);

		if (!caster) {
			throw new Error(`DamageAreaSystem: 施法者不存在: ${request.identity.sourceId}`);
		}

		const durationMs = Math.max(0, request.lifetime.durationMs);
		const target = request.targetId ? this.memberManager.getMember(request.targetId) : undefined;
		const targetPos = target?.position ?? caster.position;

		let shape: DamageAreaInstance["shape"];
		if (request.shape) {
			shape = {
				type: "circle",
				radius:
					request.shape.kind === "rect"
						? Math.max(request.shape.width ?? 0, request.shape.height ?? 0) / 2
						: (request.shape.radius ?? 0),
			};
		} else {
			shape = {
				type: "circle",
				radius:
					rangeKind === "MoveAttack" ? (rangeParams.width ? rangeParams.width / 2 : 0) : (rangeParams.radius ?? 0),
			};
		}

		let trajectory: Trajectory;
		if (request.trajectory) {
			trajectory = resolveTrajectory(request.trajectory, caster.position, targetPos);
		} else {
			switch (rangeKind) {
				case "Single":
				case "None":
					// 设计说明：单体攻击不通过空间查询筛选目标，但 distance 仍应表达施法者到目标的距离。
					trajectory = { kind: "static", center: caster.position, lifetimeMs: durationMs };
					break;
				case "Enemy":
					trajectory = { kind: "static", center: caster.position, lifetimeMs: durationMs };
					break;
				case "Range":
					trajectory = { kind: "static", center: targetPos, lifetimeMs: durationMs };
					break;
				case "MoveAttack": {
					const dir = vec3Normalize(rangeParams.dir ?? { x: 1, y: 0, z: 0 });
					const speed = rangeParams.speed ?? 0;
					trajectory = {
						kind: "ray",
						from: caster.position,
						dir,
						speed,
						maxDistance: speed * (durationMs / 1000),
					};
					break;
				}
				default:
					trajectory = { kind: "static", center: caster.position, lifetimeMs: durationMs };
					break;
			}
		}

		const pathDurationMs = trajectoryDurationMs(trajectory);
		const damageWindowMs = Math.max(0, request.lifetime.durationMs);
		let instanceDurationMs = pathDurationMs;
		if (request.trajectory) {
			const isSingleTarget = rangeKind === "Single" || rangeKind === "None";
			if (isSingleTarget) {
				instanceDurationMs = pathDurationMs + damageWindowMs;
			} else {
				instanceDurationMs = Math.max(pathDurationMs, damageWindowMs);
			}
		}
		return { shape, trajectory, trajectoryDurationMs: pathDurationMs, instanceDurationMs };
	}

	clear(): void {
		this.instances.clear();
	}

	/** 导出当前存活区域，供 Worker 写入统一实时世界状态。 */
	getAreaSnapshot(currentTimeMs: number): DamageAreaRealtimeState[] {
		const result: DamageAreaRealtimeState[] = [];
		for (const instance of this.instances.values()) {
			const { request } = instance;
			const { startTimeMs } = request.lifetime;
			if (currentTimeMs < startTimeMs || currentTimeMs >= startTimeMs + instance.trajectoryDurationMs) continue;
			result.push({
				id: instance.areaId,
				shape: {
					kind:
						request.shape?.kind ??
						(request.range.rangeKind === "Single" || request.range.rangeKind === "None" ? "point" : "circle"),
					radius: instance.shape.radius,
					width: request.shape?.width,
					height: request.shape?.height,
				},
				spawnTimeMs: startTimeMs,
				trajectory: instance.trajectory,
				sourceMemberId: request.identity.sourceId,
				targetMemberId: request.targetId,
				visualProfileId: request.visualProfileId,
			});
		}
		return result;
	}
}
