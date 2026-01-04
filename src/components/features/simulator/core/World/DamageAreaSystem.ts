import type { AnyMemberEntry, MemberManager } from "../Member/MemberManager";
import type { SpaceManager } from "./SpaceManager";
import type {
	DamageAreaRequest,
	DamageDispatchPayload,
	Vec3,
} from "./types";

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
export class DamageAreaSystem {
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
		const { rangeKind, rangeParams } = request.range;

		// 根据 rangeKind 确定 shape 和 trajectory
		let shape: DamageAreaInstance["shape"];
		let trajectory: DamageAreaInstance["trajectory"];

		switch (rangeKind) {
			case "Enemy": {
				// 以施法者当前位置为中心的圆
				shape = {
					type: "circle",
					radius: rangeParams.radius ?? 0,
				};
				trajectory = {
					type: "static",
					center: request.castPosition,
				};
				break;
			}
			case "Range": {
				// 以目标为中心的圆，落点锁定
				shape = {
					type: "circle",
					radius: rangeParams.radius ?? 0,
				};
				trajectory = {
					type: "static",
					center: request.targetPosition ?? request.castPosition,
				};
				break;
			}
			case "MoveAttack": {
				// 圆在线段上移动
				shape = {
					type: "circle",
					radius: rangeParams.width ? rangeParams.width / 2 : 0,
				};
				trajectory = {
					type: "linear",
					start: request.castPosition,
					dir: rangeParams.dir ?? { x: 1, y: 0, z: 0 },
					speed: rangeParams.speed ?? 0,
				};
				break;
			}
			case "None": {
				// 单体攻击，视为 radius=0 的特殊 range
				shape = {
					type: "circle",
					radius: 0,
				};
				trajectory = {
					type: "static",
					center: request.targetPosition ?? request.castPosition,
				};
				break;
			}
			default: {
				// custom 或其他，默认使用 static
				shape = {
					type: "circle",
					radius: rangeParams.radius ?? 0,
				};
				trajectory = {
					type: "static",
					center: request.castPosition,
				};
				break;
			}
		}

		const instance: DamageAreaInstance = {
			areaId,
			request,
			shape,
			trajectory,
			lastHitFrameByTargetId: new Map(),
		};

		this.instances.set(areaId, instance);
		return areaId;
	}

	/**
	 * 移除伤害区域
	 */
	remove(areaId: string): void {
		this.instances.delete(areaId);
	}

	/**
	 * 按施法者ID移除所有相关区域
	 */
	removeBySource(sourceId: string): void {
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
			const { request, shape, trajectory } = instance;
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
			const candidates = this.spaceManager.queryCircle<AnyMemberEntry>(
				currentCenter,
				shape.radius,
			);

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

				const payload: DamageDispatchPayload = {
					sourceId: request.identity.sourceId,
					areaId: instance.areaId,
					compiledDamageExpr: request.payload.compiledDamageExpr,
					attackCount: request.attackSemantics.attackCount,
					damageCount: request.attackSemantics.damageCount,
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
			this.instances.delete(areaId);
		}
	}

	/**
	 * 计算当前中心点
	 */
	private computeCurrentCenter(instance: DamageAreaInstance, frame: number): Vec3 {
		const { trajectory, request } = instance;
		const { startFrame } = request.lifetime;

		if (trajectory.type === "static") {
			return trajectory.center ?? request.castPosition;
		}

		// linear
		const elapsedFrames = frame - startFrame;
		const elapsedTime = elapsedFrames; // 假设 1 frame = 1 时间单位
		const { start, dir, speed } = trajectory;

		if (!start || !dir || speed === undefined) {
			return request.castPosition;
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
}

