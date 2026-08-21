import type { Checkpointable, DamageAreaSystemCheckpoint, SimulationTickContext } from "../../types";
import type { DamageDispatchPayload } from "../Damage/types";
import {
	damageDirection,
	distanceBetween,
	queryDamageTargets,
	type ResolvedEffectRange,
	resolveEffectRange,
} from "../EffectRange/effectRange";
import {
	evalTrajectory,
	type Trajectory,
	type TrajectoryAnchors,
	trajectoryDurationMs,
} from "../EffectRange/trajectory";
import type { MemberManager } from "../MemberManager";
import type { SpaceManager } from "../SpaceManager";
import { type DamageAreaSpec, type Vec3, WORLD_AREA_CAPACITY, WORLD_AREA_CAPACITY_EXCEEDED_CODE } from "./types";

interface DamageAreaInstance {
	areaId: string;
	spec: DamageAreaSpec;
	range: ResolvedEffectRange;
	durationMs: number;
	lastHitTimeMsByTargetId: Map<string, number>;
	damageCountByTargetId: Map<string, number>;
}

function isResolvedEffectRange(value: unknown): value is ResolvedEffectRange {
	if (!value || typeof value !== "object") return false;
	// checkpoint 是跨版本 unknown 数据；先收窄为候选结构，再逐字段校验后恢复。
	const range = value as Partial<ResolvedEffectRange>;
	if (!range.position || typeof range.position !== "object" || !Number.isFinite(range.yaw)) return false;
	const position = range.position as Partial<Vec3>;
	if (![position.x, position.y, position.z].every(Number.isFinite)) return false;
	if (!range.shape || typeof range.shape !== "object") return false;
	if (range.shape.kind === "point") return true;
	if (range.shape.kind === "circle") return Number.isFinite(range.shape.radius) && range.shape.radius >= 0;
	return (
		range.shape.kind === "rect" &&
		Number.isFinite(range.shape.width) &&
		range.shape.width >= 0 &&
		Number.isFinite(range.shape.height) &&
		range.shape.height >= 0
	);
}

function isHitTimeline(value: unknown): value is Array<[string, number]> {
	return (
		Array.isArray(value) &&
		value.every(
			(entry) =>
				Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && Number.isFinite(entry[1]),
		)
	);
}

export interface DamageAreaRealtimeState {
	id: string;
	rangeKind: DamageAreaSpec["rangeKind"];
	position: Vec3;
	yaw: number;
	shape: ResolvedEffectRange["shape"];
	spawnTimeMs: number;
	durationMs: number;
	trajectory?: Trajectory;
	sourceMemberId: string;
	targetMemberId?: string;
}

/**
 * 持续伤害 Area 的唯一生命周期所有者。
 * 瞬时伤害由 AreaManager 对外执行，不注册到本系统。
 */
export class DamageAreaSystem implements Checkpointable<DamageAreaSystemCheckpoint> {
	private readonly instances = new Map<string, DamageAreaInstance>();
	private nextAreaId = 1;

	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {}

	/** 注册一个真正跨 Tick 存在的持续 Area。 */
	createDamageArea(spec: DamageAreaSpec): string {
		if (this.instances.size >= WORLD_AREA_CAPACITY) {
			throw new Error(
				`[${WORLD_AREA_CAPACITY_EXCEEDED_CODE}] damage area 容量超限: ${this.instances.size + 1} > ${WORLD_AREA_CAPACITY}`,
			);
		}
		const anchors = this.getAnchors(spec.identity.sourceId, spec.targetId);
		const range = resolveEffectRange(spec.range, anchors);
		const pathDurationMs = range.trajectory ? trajectoryDurationMs(range.trajectory) : null;
		const durationMs = pathDurationMs ?? spec.lifetime.durationMs;
		if (!Number.isFinite(durationMs) || durationMs <= 0) {
			throw new Error(
				pathDurationMs === null
					? `DamageAreaSystem: 静止持续区域缺少正数 durationMs`
					: `DamageAreaSystem: 移动区域轨迹无法推导正数生命周期`,
			);
		}
		const areaId = `damage_${this.nextAreaId++}`;
		this.instances.set(areaId, {
			areaId,
			spec,
			range,
			durationMs,
			lastHitTimeMsByTargetId: new Map(),
			damageCountByTargetId: new Map(),
		});
		return areaId;
	}

	getCreatedAreaCount(): number {
		return this.nextAreaId - 1;
	}

	remove(areaId: string): void {
		this.instances.delete(areaId);
	}

	removeBySource(sourceId: string): void {
		for (const [areaId, instance] of this.instances) {
			if (instance.spec.identity.sourceId === sourceId) this.instances.delete(areaId);
		}
	}

	tick(tick: SimulationTickContext): void {
		const removals: string[] = [];
		for (const instance of this.instances.values()) {
			const { spec } = instance;
			const elapsedMs = tick.currentTimeMs - spec.lifetime.startTimeMs;
			if (elapsedMs < 0) continue;
			const finitePathDuration = instance.range.trajectory ? trajectoryDurationMs(instance.range.trajectory) : null;
			const reachedEnd = elapsedMs >= instance.durationMs;
			if (reachedEnd && finitePathDuration === null) {
				removals.push(instance.areaId);
				continue;
			}
			const center = this.currentCenter(instance, Math.min(elapsedMs, instance.durationMs));
			const range = { ...instance.range, position: center };
			const lockedTarget = spec.targetId ? this.memberManager.getMember(spec.targetId) : null;
			const candidates = queryDamageTargets({
				spaceManager: this.spaceManager,
				resolvedRange: range,
				sourceCampId: spec.identity.sourceCampId,
				lockedTarget,
			});
			const dispatches: Array<{ target: (typeof candidates)[number]; indexes: number[] }> = [];
			for (const target of candidates) {
				const indexes = this.collectDamageIndexes(instance, target.id, tick.currentTimeMs);
				if (indexes.length > 0) dispatches.push({ target, indexes });
			}
			for (const { target, indexes } of dispatches) {
				const distance = distanceBetween(center, target.position);
				const direction = damageDirection(center, target.position);
				for (const damageIndex of indexes) {
					this.memberManager.sendTo(target.id, {
						type: "受到攻击",
						data: {
							damageRequest: this.createDispatchPayload(
								spec,
								{ kind: "area", areaId: instance.areaId },
								damageIndex,
								distance,
								direction,
								dispatches.length,
							),
						},
					});
				}
			}
			if (reachedEnd) removals.push(instance.areaId);
		}
		for (const areaId of removals) this.instances.delete(areaId);
	}

	private collectDamageIndexes(instance: DamageAreaInstance, targetId: string, currentTimeMs: number): number[] {
		const damageCount = Math.max(1, Math.floor(instance.spec.attackSemantics.damageCount));
		const dispatched = instance.damageCountByTargetId.get(targetId) ?? 0;
		if (dispatched >= damageCount) return [];
		const intervalMs = Math.max(0, instance.spec.hitPolicy.hitIntervalMs);
		const lastHit = instance.lastHitTimeMsByTargetId.get(targetId) ?? -Infinity;
		if (intervalMs > 0 && currentTimeMs - lastHit < intervalMs) return [];
		const count = intervalMs === 0 ? damageCount - dispatched : 1;
		const indexes = Array.from({ length: count }, (_, index) => dispatched + index);
		instance.damageCountByTargetId.set(targetId, dispatched + count);
		instance.lastHitTimeMsByTargetId.set(targetId, currentTimeMs);
		return indexes;
	}

	private createDispatchPayload(
		damage: Pick<DamageAreaSpec, "identity" | "attackSemantics" | "payload">,
		origin: DamageDispatchPayload["origin"],
		damageIndex: number,
		distance: number,
		direction: DamageDispatchPayload["direction"],
		targetCount: number,
	): DamageDispatchPayload {
		return {
			sourceId: damage.identity.sourceId,
			sourceSkillId: damage.identity.sourceSkillId,
			sourceTeamId: damage.identity.sourceTeamId,
			origin,
			damageFormula: damage.payload.damageFormula,
			casterSnapshot: damage.payload.casterSnapshot,
			skillLv: damage.payload.skillLv,
			damageCount: damage.attackSemantics.damageCount,
			damageIndex,
			damageTags: [...damage.payload.damageTags],
			lockCasterAttributes: damage.payload.lockCasterAttributes,
			direction,
			isFatal: false,
			vars: { distance, targetCount },
		};
	}

	private getAnchors(sourceId: string, targetId?: string): TrajectoryAnchors {
		const source = this.memberManager.getMember(sourceId);
		if (!source) throw new Error(`DamageAreaSystem: 施法者不存在: ${sourceId}`);
		const target = targetId ? this.memberManager.getMember(targetId) : null;
		return { source: source.position, target: target?.position ?? source.position };
	}

	private currentCenter(instance: DamageAreaInstance, elapsedMs: number): Vec3 {
		if (!instance.range.trajectory) return instance.range.position;
		return evalTrajectory(
			instance.range.trajectory,
			elapsedMs,
			this.getAnchors(instance.spec.identity.sourceId, instance.spec.targetId),
		);
	}

	captureCheckpoint(): DamageAreaSystemCheckpoint {
		return {
			nextAreaId: this.nextAreaId,
			instances: Array.from(this.instances.values(), (instance) => ({
				areaId: instance.areaId,
				requestPayload: structuredClone(instance.spec),
				resolvedRange: structuredClone(instance.range),
				durationMs: instance.durationMs,
				lastHitTimeMsByTargetId: Array.from(instance.lastHitTimeMsByTargetId),
				damageCountByTargetId: Array.from(instance.damageCountByTargetId),
			})),
		};
	}

	restoreCheckpoint(checkpoint: DamageAreaSystemCheckpoint): void {
		const restored = checkpoint.instances.map((entry): DamageAreaInstance => {
			if (!entry.requestPayload || typeof entry.requestPayload !== "object") {
				throw new Error("DamageAreaSystem: checkpoint 缺少 Area 定义");
			}
			// requestPayload 属于旧 checkpoint 公共结构，恢复范围前保留原始 Area 业务定义。
			const spec = entry.requestPayload as DamageAreaSpec;
			const range = entry.resolvedRange;
			const durationMs = entry.durationMs;
			if (
				!isResolvedEffectRange(range) ||
				!Number.isFinite(durationMs) ||
				durationMs <= 0 ||
				!isHitTimeline(entry.lastHitTimeMsByTargetId) ||
				!isHitTimeline(entry.damageCountByTargetId)
			) {
				throw new Error("DamageAreaSystem: checkpoint 缺少已解析范围、有效生命周期或完整命中时间轴");
			}
			return {
				areaId: entry.areaId,
				spec,
				range,
				durationMs,
				lastHitTimeMsByTargetId: new Map(entry.lastHitTimeMsByTargetId),
				damageCountByTargetId: new Map(entry.damageCountByTargetId),
			};
		});
		this.clear();
		this.nextAreaId = checkpoint.nextAreaId;
		for (const instance of restored) this.instances.set(instance.areaId, instance);
	}

	clear(): void {
		this.instances.clear();
	}

	getAreaSnapshot(currentTimeMs: number): DamageAreaRealtimeState[] {
		const result: DamageAreaRealtimeState[] = [];
		for (const instance of this.instances.values()) {
			const elapsedMs = currentTimeMs - instance.spec.lifetime.startTimeMs;
			if (elapsedMs < 0 || elapsedMs >= instance.durationMs) continue;
			result.push({
				id: instance.areaId,
				rangeKind: instance.spec.rangeKind,
				position: instance.range.position,
				yaw: instance.range.yaw,
				shape: instance.range.shape,
				spawnTimeMs: instance.spec.lifetime.startTimeMs,
				durationMs: instance.durationMs,
				trajectory: instance.range.trajectory,
				sourceMemberId: instance.spec.identity.sourceId,
				targetMemberId: instance.spec.targetId,
			});
		}
		return result;
	}
}
