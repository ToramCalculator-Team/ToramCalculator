import { createLogger } from "~/lib/Logger";
import type { Checkpointable, DamageAreaSystemCheckpoint, SimulationTickContext } from "../../types";
import type { MemberManager } from "../MemberManager";
import type { WorldObservable } from "../observable";
import type { SpaceManager } from "../SpaceManager";
import type { DamageAreaRequest, DamageDirection, DamageDispatchPayload, Vec3 } from "./types";

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
	/** 轨迹：static 或 linear */
	trajectory: {
		type: "static" | "linear";
		/** 静态中心（static 时使用） */
		center?: Vec3;
		/** 线性起点（linear 时使用） */
		start?: Vec3;
		/** 线性方向（linear 时使用，单位向量） */
		dir?: Vec3;
		/** 线性速度（linear 时使用） */
		speed?: number;
	};
	/** 每个目标的最后命中时间（用于 hitIntervalMs 节流） */
	lastHitTimeMsByTargetId: Map<string, number>;
	/** 每个目标已派发的伤害段数（用于 damageCount 上限） */
	damageCountByTargetId: Map<string, number>;
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
		const areaId = `damage_${this.nextAreaId++}`;
		const { shape, trajectory } = this.deriveShapeAndTrajectory(request);

		const instance: DamageAreaInstance = {
			areaId,
			request,
			shape,
			trajectory,
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
			const { startTimeMs, durationMs } = request.lifetime;

			// 检查生命周期
			if (currentTimeMs < startTimeMs) {
				continue; // 尚未开始
			}
			if (currentTimeMs >= startTimeMs + durationMs) {
				instancesToRemove.push(instance.areaId);
				continue; // 已过期
			}

			// 计算当前中心点
			const currentCenter = this.computeCurrentCenter(instance, currentTimeMs);

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
				const singleTarget = request.targetId ? this.memberManager.getMember(request.targetId) : null;
				if (singleTarget && singleTarget.alive && singleTarget.campId !== request.identity.sourceCampId) {
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
		const caster = this.memberManager.getMember(request.identity.sourceId);
		if (!caster) {
			throw new Error(`DamageAreaSystem: 施法者不存在: ${request.identity.sourceId}`);
		}

		if (trajectory.type === "static") {
			return trajectory.center ?? caster.position;
		}

		// linear
		const elapsedTimeSeconds = Math.max(0, currentTimeMs - startTimeMs) / 1000;
		const { start, dir, speed } = trajectory;

		if (!start || !dir || speed === undefined) {
			return caster.position;
		}

		return {
			x: start.x + dir.x * speed * elapsedTimeSeconds,
			y: start.y + dir.y * speed * elapsedTimeSeconds,
			z: start.z + dir.z * speed * elapsedTimeSeconds,
		};
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
			const { shape, trajectory } = this.deriveShapeAndTrajectory(request);
			const instance: DamageAreaInstance = {
				areaId: entry.areaId,
				request,
				shape,
				trajectory,
				lastHitTimeMsByTargetId: new Map(entry.lastHitTimeMsByTargetId),
				damageCountByTargetId: new Map(entry.damageCountByTargetId ?? []),
			};
			this.instances.set(entry.areaId, instance);
		}
	}

	private deriveShapeAndTrajectory(request: DamageAreaRequest): Pick<DamageAreaInstance, "shape" | "trajectory"> {
		const { rangeKind, rangeParams } = request.range;
		const caster = this.memberManager.getMember(request.identity.sourceId);

		if (!caster) {
			throw new Error(`DamageAreaSystem: 施法者不存在: ${request.identity.sourceId}`);
		}

		switch (rangeKind) {
			case "Single":
			case "None":
				return {
					shape: { type: "circle", radius: 0 },
					// 设计说明：单体攻击不通过空间查询筛选目标，但 distance 仍应表达施法者到目标的距离。
					trajectory: { type: "static", center: caster.position },
				};
			case "Enemy":
				return {
					shape: { type: "circle", radius: rangeParams.radius ?? 0 },
					trajectory: { type: "static", center: caster.position },
				};
			case "Range": {
				const target = request.targetId ? this.memberManager.getMember(request.targetId) : caster;
				if (!target) {
					throw new Error(`DamageAreaSystem: 目标不存在: ${request.targetId}`);
				}
				return {
					shape: { type: "circle", radius: rangeParams.radius ?? 0 },
					trajectory: { type: "static", center: target.position },
				};
			}
			case "MoveAttack":
				return {
					shape: { type: "circle", radius: rangeParams.width ? rangeParams.width / 2 : 0 },
					trajectory: {
						type: "linear",
						start: caster.position,
						dir: rangeParams.dir ?? { x: 1, y: 0, z: 0 },
						speed: rangeParams.speed ?? 0,
					},
				};
			default:
				return {
					shape: { type: "circle", radius: rangeParams.radius ?? 0 },
					trajectory: { type: "static", center: caster.position },
				};
		}
	}

	clear(): void {
		this.instances.clear();
	}

	/**
	 * 导出当前存活区域状态（用于渲染快照）
	 * @param currentTimeMs 当前模拟时间（毫秒）
	 */
	getAreaSnapshot(
		currentTimeMs: number,
	): Array<{ id: string; position: Vec3; shape: { radius: number }; remainingTimeMs: number }> {
		const result: Array<{ id: string; position: Vec3; shape: { radius: number }; remainingTimeMs: number }> = [];
		for (const instance of this.instances.values()) {
			const { request } = instance;
			const { startTimeMs, durationMs } = request.lifetime;
			if (currentTimeMs < startTimeMs || currentTimeMs >= startTimeMs + durationMs) continue;
			const position = this.computeCurrentCenter(instance, currentTimeMs);
			const remainingTimeMs = Math.max(0, startTimeMs + durationMs - currentTimeMs);
			result.push({
				id: instance.areaId,
				position,
				shape: { radius: instance.shape.radius },
				remainingTimeMs,
			});
		}
		return result;
	}
}
