/**
 * 渲染同步系统（内容编排关注点）。
 *
 * 职责：
 * 1. 每帧从 SAB 世界状态（WorldStateReader）读取权威位置/yaw，写入 entity.physics。
 * 2. 基于 SAB commitVersion 判断：
 *    - 版本不变：渲染层基于权威速度自主外推（匀速演进）
 *    - 版本变化：瞬间校正到新的权威位置
 *
 * 物理计算在 Worker 内 GameEngine 完成，本系统只做"消费 + 渲染投影"。
 */

import { STATE_FLAG_AIRBORNE, STATE_FLAG_MOVING, type WorldStateSnapshot } from "~/engine/core/thread/worldStateBuffer";
import type { EntityRuntime } from "./entityTypes";
import { endMovementSession, maybeLogMovementJitter, recordMovementProbe } from "./movementJitterProbe";

/** 角度差规范化到 [-π, π]，避免 yaw 过 ±π 时反向旋转。 */
function normalizeAngleDiff(diff: number): number {
	while (diff > Math.PI) diff -= 2 * Math.PI;
	while (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
}

type EntityRenderState = {
	/** 渲染 mesh 当前位置 */
	x: number;
	y: number;
	z: number;
	yaw: number;
	/** 权威速度（单位/秒），用于版本不变时的外推 */
	authVelocityX: number;
	authVelocityZ: number;
	/** 上一次读到的 SAB commitVersion */
	lastCommitVersion: number;
};

export class RenderSyncSystem {
	/** 渲染端状态，按 entityId 缓存。 */
	private readonly renderStates = new Map<string, EntityRenderState>();
	/** 槽位代次变化表示实体重建，必须丢弃旧状态。 */
	private readonly generations = new Map<string, number>();

	/**
	 * 同步所有实体的渲染状态（每帧调用）。
	 * 若 SAB 可用，先从 SAB 更新 physics，再基于 commitVersion 判断外推或校正。
	 */
	syncEntities(
		entities: Map<string, EntityRuntime>,
		entitySlots: ReadonlyMap<string, number>,
		snapshot: WorldStateSnapshot | null,
		dtSec: number,
	): void {
		const commitVersion = snapshot?.commitVersion ?? 0;

		entities.forEach((entity) => {
			let stateFlags: number | null = null;
			if (snapshot) {
				// SAB 路径：每帧读权威状态，更新 entity.physics（供相机跟随与拾取使用）。
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
					}
				}
			}
			if (entity.type === "character") {
				entity.animationController.setMovement(entity.physics.moving, entity.physics.speed);
				if (stateFlags !== null) {
					entity.animationController.setAirborne((stateFlags & STATE_FLAG_AIRBORNE) !== 0);
				}
			}
			this.syncEntityRender(entity, dtSec, commitVersion);

			// 临时验证：确认 feature 分支与 main 的卡顿差异，验证后删除。
			if (entity.type === "character" && snapshot) {
				if (entity.physics.moving) {
					recordMovementProbe(entity.id, snapshot.logicalTimeMs, entity.physics.pos, entity.mesh.position, dtSec);
					maybeLogMovementJitter(120);
				} else {
					// 停止移动时结束当前会话，避免跨静止期的伪速度
					endMovementSession(entity.id);
				}
			}
		});
	}

	/** 清理已消失实体的渲染状态。 */
	removeEntity(entityId: string): void {
		this.renderStates.delete(entityId);
		this.generations.delete(entityId);
	}

	/** 传送、硬校正和同 ID 重建会中断位置连续性，下一帧必须直接采用新权威位置。 */
	resetEntity(entityId: string): void {
		this.renderStates.delete(entityId);
	}

	/**
	 * 同步单个实体：基于 commitVersion 判断是外推还是校正。
	 * dtSec = 本帧渲染时间（秒），用于匀速外推。
	 */
	private syncEntityRender(entity: EntityRuntime, dtSec: number, commitVersion: number): void {
		const physics = entity.physics;

		let state = this.renderStates.get(entity.id);
		if (!state) {
			// 首帧：直接跳到权威位置（无历史状态可外推）。
			state = {
				x: physics.pos.x,
				y: physics.pos.y,
				z: physics.pos.z,
				yaw: physics.yaw,
				authVelocityX: 0,
				authVelocityZ: 0,
				lastCommitVersion: commitVersion,
			};
			this.renderStates.set(entity.id, state);
		} else {
			// 判断 SAB 版本是否变化
			if (commitVersion !== state.lastCommitVersion) {
				// 版本变化：瞬间校正到新的权威位置
				state.x = physics.pos.x;
				state.y = physics.pos.y;
				state.z = physics.pos.z;
				state.yaw = physics.yaw;
				state.lastCommitVersion = commitVersion;

				// 更新权威速度（基于 yaw 和 speed 计算 XZ 平面的速度分量）
				if (physics.moving && physics.speed > 0) {
					state.authVelocityX = Math.sin(physics.yaw) * physics.speed;
					state.authVelocityZ = Math.cos(physics.yaw) * physics.speed;
				} else {
					state.authVelocityX = 0;
					state.authVelocityZ = 0;
				}
			} else {
				// 版本不变：基于权威速度匀速外推
				if (dtSec > 0 && (state.authVelocityX !== 0 || state.authVelocityZ !== 0)) {
					state.x += state.authVelocityX * dtSec;
					state.z += state.authVelocityZ * dtSec;
					// yaw 保持不变（匀速直线运动）
				}
				// 如果权威速度为 0（静止），state 保持不变
			}
		}

		entity.mesh.position.copyFromFloats(state.x, state.y, state.z);
		entity.mesh.rotation.y = state.yaw;
	}
}
