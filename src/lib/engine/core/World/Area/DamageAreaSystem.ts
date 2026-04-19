import { createLogger } from "~/lib/Logger";
import type { Checkpointable, DamageAreaSystemCheckpoint } from "../../types";
import type { AnyMemberEntry, MemberManager } from "../Member/MemberManager";
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
	/** 每个目标的最后命中帧（用于 hitIntervalFrames 节流） */
	lastHitFrameByTargetId: Map<string, number>;
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
			lastHitFrameByTargetId: new Map(),
		};

		this.instances.set(areaId, instance);
		log.debug(`DamageAreaSystem: 添加伤害区域: ${areaId}`);
		return areaId;
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
	 * 每帧更新
	 */
	tick(frame: number): void {
		const instancesToRemove: string[] = [];

		for (const instance of this.instances.values()) {
			const { request, shape } = instance;
			const { startFrame, durationFrames } = request.lifetime;

			// 检查生命周期
			if (frame < startFrame) {
				continue; // 尚未开始
			}
			if (frame >= startFrame + durationFrames) {
				instancesToRemove.push(instance.areaId);
				continue; // 已过期
			}

			// 计算当前中心点
			const currentCenter = this.computeCurrentCenter(instance, frame);

			// 查询范围内的候选目标
			const candidates = this.spaceManager.queryCircle<AnyMemberEntry>(currentCenter, shape.radius);

			// 过滤：仅敌方阵营
			const enemyTargets = candidates.members.filter((member) => {
				return member.campId !== request.identity.sourceCampId;
			});

			// 命中节流：每 N 帧允许再次命中
			const hitIntervalFrames = request.hitPolicy.hitIntervalFrames;
			const validTargets: AnyMemberEntry[] = [];
			for (const target of enemyTargets) {
				const lastHitFrame = instance.lastHitFrameByTargetId.get(target.id) ?? -Infinity;
				if (frame - lastHitFrame >= hitIntervalFrames) {
					validTargets.push(target);
					instance.lastHitFrameByTargetId.set(target.id, frame);
				}
			}

			// 计算动态变量
			const targetCount = validTargets.length;

			// 对每个有效目标派发伤害
			for (const target of validTargets) {
				const distance = this.computeDistance(currentCenter, target.position);
				const direction = this.computeDirection(currentCenter, target.position);

				const payload: DamageDispatchPayload = {
					sourceId: request.identity.sourceId,
					areaId: instance.areaId,
					damageFormula: request.payload.damageFormula,
					casterSnapshot: request.payload.casterSnapshot,
					skillLv: request.payload.skillLv,
					attackCount: request.attackSemantics.attackCount,
					damageCount: request.attackSemantics.damageCount,
					damageTags: [...request.payload.damageTags],
					warningZone: request.payload.warningZone,
					direction,
					// 受击 Pipeline 计算最终伤害后会回填 isFatal；派发时未知。
					isFatal: false,
					vars: {
						distance,
						targetCount,
					},
				};

				// 派发到目标
				target.actor.send({
					type: "受到攻击",
					data: { damageRequest: payload },
				});
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
	private computeCurrentCenter(instance: DamageAreaInstance, frame: number): Vec3 {
		const { trajectory, request } = instance;
		const { startFrame } = request.lifetime;
		const caster = this.memberManager.getMember(request.identity.sourceId);
		if (!caster) {
			throw new Error(`DamageAreaSystem: 施法者不存在: ${request.identity.sourceId}`);
		}

		if (trajectory.type === "static") {
			return trajectory.center ?? caster.position;
		}

		// linear
		const elapsedFrames = frame - startFrame;
		const elapsedTime = elapsedFrames; // 假设 1 frame = 1 时间单位
		const { start, dir, speed } = trajectory;

		if (!start || !dir || speed === undefined) {
			return caster.position;
		}

		return {
			x: start.x + dir.x * speed * elapsedTime,
			y: start.y + dir.y * speed * elapsedTime,
			z: start.z + dir.z * speed * elapsedTime,
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
				lastHitFrameByTargetId: Array.from(instance.lastHitFrameByTargetId.entries()),
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
				lastHitFrameByTargetId: new Map(entry.lastHitFrameByTargetId),
			};
			this.instances.set(entry.areaId, instance);
		}
	}

	private deriveShapeAndTrajectory(request: DamageAreaRequest): Pick<DamageAreaInstance, "shape" | "trajectory"> {
		const { rangeKind, rangeParams } = request.range;
		const caster = this.memberManager.getMember(request.identity.sourceId);
		const target = request.targetId ? this.memberManager.getMember(request.targetId) : caster;

		if (!caster || !target) {
			throw new Error(`DamageAreaSystem: 施法者不存在: ${request.identity.sourceId}`);
		}

		switch (rangeKind) {
			case "Enemy":
				return {
					shape: { type: "circle", radius: rangeParams.radius ?? 0 },
					trajectory: { type: "static", center: caster.position },
				};
			case "Range":
				return {
					shape: { type: "circle", radius: rangeParams.radius ?? 0 },
					trajectory: { type: "static", center: target.position },
				};
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
			case "None":
				return {
					shape: { type: "circle", radius: 0 },
					trajectory: { type: "static", center: target.position },
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
	 * @param frame 当前逻辑帧
	 */
	getAreaSnapshot(frame: number): Array<{ id: string; position: Vec3; shape: { radius: number }; remainingTime: number }> {
		const result: Array<{ id: string; position: Vec3; shape: { radius: number }; remainingTime: number }> = [];
		for (const instance of this.instances.values()) {
			const { request } = instance;
			const { startFrame, durationFrames } = request.lifetime;
			if (frame < startFrame || frame >= startFrame + durationFrames) continue;
			const position = this.computeCurrentCenter(instance, frame);
			const remainingFrames = startFrame + durationFrames - frame;
			const remainingTime = Math.max(0, remainingFrames / 60);
			result.push({
				id: instance.areaId,
				position,
				shape: { radius: instance.shape.radius },
				remainingTime,
			});
		}
		return result;
	}
}
