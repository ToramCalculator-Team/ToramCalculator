/**
 * 渲染位姿投影。
 *
 * 渲染器按共享 renderLogicalTime 采样最近两个逻辑提交；提交到达间隔只影响可用样本，
 * 不再改变位置推进速度。latest 之后最多外推一个 Fixed Tick，边界由上层时间映射统一限制。
 */

import {
	STATE_FLAG_AIRBORNE,
	STATE_FLAG_MOVING,
	type WorldStateMember,
	type WorldStateSnapshot,
} from "~/engine/core/thread/worldStateBuffer";
import type { EntityRuntime } from "./entityTypes";

function normalizeAngleDiff(diff: number): number {
	while (diff > Math.PI) diff -= 2 * Math.PI;
	while (diff < -Math.PI) diff += 2 * Math.PI;
	return diff;
}

function interpolateAngle(from: number, to: number, alpha: number): number {
	return from + normalizeAngleDiff(to - from) * alpha;
}

export type SampledPose = {
	x: number;
	y: number;
	z: number;
	yaw: number;
};

export type SampledMemberState = {
	member: WorldStateMember;
	pose: SampledPose;
};

function extrapolatePose(member: WorldStateMember, elapsedMs: number): SampledPose {
	const elapsedSec = Math.max(0, elapsedMs) / 1000;
	const moving = (member.stateFlags & STATE_FLAG_MOVING) !== 0;
	return {
		x: member.position.x + (moving ? Math.sin(member.yaw) * member.speed * elapsedSec : 0),
		y: member.position.y,
		z: member.position.z + (moving ? Math.cos(member.yaw) * member.speed * elapsedSec : 0),
		yaw: member.yaw,
	};
}

function sampleMemberState(
	previous: WorldStateSnapshot | null,
	latest: WorldStateSnapshot,
	slotIndex: number,
	renderLogicalTimeMs: number,
): SampledMemberState | null {
	const current = latest.members[slotIndex];
	const previousLogicalTimeMs = previous?.logicalTimeMs;
	const older = previous?.members[slotIndex];
	const useOlderState =
		previousLogicalTimeMs !== undefined &&
		previousLogicalTimeMs <= latest.logicalTimeMs &&
		renderLogicalTimeMs < latest.logicalTimeMs;
	if (useOlderState) {
		if (!older?.active) return null;
		if (!current?.active || older.generation !== current.generation || latest.logicalTimeMs <= previousLogicalTimeMs) {
			return { member: older, pose: extrapolatePose(older, 0) };
		}
		const alpha = Math.min(
			1,
			Math.max(0, (renderLogicalTimeMs - previousLogicalTimeMs) / (latest.logicalTimeMs - previousLogicalTimeMs)),
		);
		return {
			member: older,
			pose: {
				x: older.position.x + (current.position.x - older.position.x) * alpha,
				y: older.position.y + (current.position.y - older.position.y) * alpha,
				z: older.position.z + (current.position.z - older.position.z) * alpha,
				yaw: interpolateAngle(older.yaw, current.yaw, alpha),
			},
		};
	}

	if (!current?.active) return null;
	return { member: current, pose: extrapolatePose(current, renderLogicalTimeMs - latest.logicalTimeMs) };
}

/** 对一个渲染逻辑时刻采样全部成员，供实体、区域锚点和离散状态共同消费。 */
export function sampleWorldStateMembers(
	previous: WorldStateSnapshot | null,
	latest: WorldStateSnapshot,
	renderLogicalTimeMs: number,
): Array<SampledMemberState | null> {
	return latest.members.map((_, slotIndex) => sampleMemberState(previous, latest, slotIndex, renderLogicalTimeMs));
}

export class RenderSyncSystem {
	/** 使用同一渲染逻辑时间同步全部实体，避免位置与动画各自累计本地 delta。 */
	syncEntities(
		entities: Map<string, EntityRuntime>,
		entitySlots: ReadonlyMap<string, number>,
		sampledMembers: ReadonlyArray<SampledMemberState | null>,
	): void {
		entities.forEach((entity) => {
			const slotIndex = entitySlots.get(entity.id);
			if (slotIndex === undefined) return;
			const sampled = sampledMembers[slotIndex];
			if (!sampled) {
				entity.mesh.setEnabled(false);
				return;
			}

			entity.mesh.setEnabled(true);
			this.applyMemberState(entity, sampled.member, sampled.pose);
		});
	}

	private applyMemberState(entity: EntityRuntime, member: WorldStateMember, pose: SampledPose): void {
		entity.physics.pos.x = pose.x;
		entity.physics.pos.y = pose.y;
		entity.physics.pos.z = pose.z;
		entity.physics.yaw = pose.yaw;
		entity.physics.moving = (member.stateFlags & STATE_FLAG_MOVING) !== 0;
		entity.physics.speed = member.speed;
		if (entity.type === "character") {
			entity.animationController.setMovement(entity.physics.moving, entity.physics.speed);
			entity.animationController.setAirborne((member.stateFlags & STATE_FLAG_AIRBORNE) !== 0);
		}
		entity.mesh.position.copyFromFloats(pose.x, pose.y, pose.z);
		entity.mesh.rotation.y = pose.yaw;
	}
}
