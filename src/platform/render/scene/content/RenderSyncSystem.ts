/**
 * 渲染同步系统（内容编排关注点）。
 *
 * 职责：
 * 1. 每帧从 SAB 世界状态（WorldStateReader）读取权威位置/yaw，写入 entity.physics（指数平滑）。
 * 2. 把 entity.physics 同步到 Babylon mesh position/rotation.y。
 *
 * 物理计算在 Worker 内 GameEngine 完成，本系统只做"消费 + 渲染投影"。
 *
 * 实时内容提供 WorldStateReader，每帧读取权威状态并对渲染位置做指数平滑（lerp）。
 * 无 reader 的控制器只服务静态内容，不提供第二套实时运动降级路径。
 */

import {
	STATE_FLAG_AIRBORNE,
	STATE_FLAG_MOVING,
	type WorldStateReader,
	type WorldStateSnapshot,
} from "~/engine/core/thread/worldStateBuffer";
import type { EntityRuntime } from "./entityTypes";

/**
 * 指数平滑系数（60fps 下每帧 lerp 权重）。
 * 值越大收敛越快；0.25 在 12Hz 逻辑帧下视觉流畅，且跳帧/抖动时天然稳定。
 * alpha = 1 - exp(-k * dt)，此处直接用常量（60fps ≈ 16.7ms/frame 下 ~0.25）。
 */
const SMOOTH_ALPHA = 0.25;

/** 角度差规范化到 [-π, π]，避免 yaw 过 ±π 时反向旋转。 */
function normalizeAngleDiff(diff: number): number {
	while (diff > Math.PI) diff -= 2 * Math.PI;
	while (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
}

export class RenderSyncSystem {
	/** 渲染端平滑后的位置/yaw，按 entityId 缓存（独立于 entity.physics）。 */
	private readonly smoothed = new Map<string, { x: number; y: number; z: number; yaw: number }>();
	/** 槽位代次变化表示实体重建，必须丢弃旧插值。 */
	private readonly generations = new Map<string, number>();

	constructor(private worldStateReader?: WorldStateReader | null) {}

	/**
	 * 同步所有实体的渲染状态（每帧调用）。
	 * 若 SAB 可用，先从 SAB 更新 physics，再 lerp 平滑，最后同步 mesh。
	 */
	syncEntities(
		entities: Map<string, EntityRuntime>,
		entitySlots: ReadonlyMap<string, number>,
		snapshot: WorldStateSnapshot | null,
		dtSec: number,
	): void {
		entities.forEach((entity) => {
			let stateFlags: number | null = null;
			if (snapshot) {
				// SAB 路径：每帧读权威状态，指数平滑后写入 mesh。
				const slotIdx = entitySlots.get(entity.id);
				if (slotIdx !== undefined) {
					const slot = snapshot.members[slotIdx];
					if (slot) {
						if (!slot.active) {
							entity.mesh.setEnabled(false);
							return;
						}
						entity.mesh.setEnabled(true);
						if (this.generations.get(entity.id) !== slot.generation) {
							this.generations.set(entity.id, slot.generation);
							this.resetEntity(entity.id);
						}
						stateFlags = slot.stateFlags;
						// 更新 entity.physics（统一真相，让相机跟随与拾取读到正确值）。
						entity.physics.pos.x = slot.position.x;
						entity.physics.pos.y = slot.position.y;
						entity.physics.pos.z = slot.position.z;
						entity.physics.yaw = slot.yaw;
						entity.physics.moving = (slot.stateFlags & STATE_FLAG_MOVING) !== 0;
						entity.physics.speed = slot.speed;
						if (entity.type === "character") {
							const mspd = this.worldStateReader?.readMspd(slotIdx, snapshot);
							if (mspd !== null && mspd !== undefined) entity.animationController.setMotionSpeed(mspd);
						}
					}
				}
			}
			if (entity.type === "character") {
				entity.animationController.setMovement(entity.physics.moving, entity.physics.speed);
				if (stateFlags !== null) {
					entity.animationController.setAirborne((stateFlags & STATE_FLAG_AIRBORNE) !== 0);
				}
			}
			this.syncEntityRender(entity, dtSec);
		});
	}

	/** 清理已消失实体的平滑状态。 */
	removeEntity(entityId: string): void {
		this.smoothed.delete(entityId);
		this.generations.delete(entityId);
	}

	/** 传送、硬校正和同 ID 重建会中断位置连续性，下一帧必须直接采用新权威位置。 */
	resetEntity(entityId: string): void {
		this.smoothed.delete(entityId);
	}

	/**
	 * 同步单个实体：指数平滑 + mesh 写入。
	 * dtSec = 本帧渲染时间（秒），用于时间自适应 lerp；若为 0 则用固定 alpha。
	 */
	private syncEntityRender(entity: EntityRuntime, dtSec: number): void {
		const physics = entity.physics;

		// 指数平滑：每帧向权威位置 lerp，消除 tick 间隙抖动。
		// alpha = 1 - exp(-k*dt)，k ≈ 15 在 60fps 下约 0.22；直接使用常量近似。
		const alpha = dtSec > 0 ? Math.min(1, 1 - Math.exp(-15 * dtSec)) : SMOOTH_ALPHA;

		let s = this.smoothed.get(entity.id);
		if (!s) {
			// 首帧：直接跳到权威位置（无历史状态可平滑）。
			s = { x: physics.pos.x, y: physics.pos.y, z: physics.pos.z, yaw: physics.yaw };
			this.smoothed.set(entity.id, s);
		} else {
			s.x += (physics.pos.x - s.x) * alpha;
			s.y += (physics.pos.y - s.y) * alpha;
			s.z += (physics.pos.z - s.z) * alpha;
			// yaw 平滑需规范化差值，避免过 ±π 时反向旋转。
			s.yaw += normalizeAngleDiff(physics.yaw - s.yaw) * alpha;
		}

		entity.mesh.position.copyFromFloats(s.x, s.y, s.z);
		entity.mesh.rotation.y = s.yaw;
	}
}
