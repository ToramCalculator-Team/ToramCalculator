import { damageDirection, distanceBetween, queryDamageTargets, resolveEffectRange } from "../EffectRange/effectRange";
import type { MemberManager } from "../MemberManager";
import type { SpaceManager } from "../SpaceManager";
import type { DamageDispatchPayload, ResolvedDamageEffect } from "./types";

export type InstantDamageScheduler = (targetMemberId: string, payload: DamageDispatchPayload, delayMs: number) => void;

/** 查询一次目标快照并调度全部伤害段；后续伤害段不再执行空间查询。 */
export class DamageSystem {
	private readonly pendingInstantDamage: ResolvedDamageEffect[] = [];

	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {}

	/**
	 * 记录当前 Tick 产生的瞬时伤害。范围解析和目标锁定延后到成员全部更新完成后，
	 * 避免成员注册顺序改变同一首段伤害的可见时间边界。
	 */
	queueInstantDamage(effect: ResolvedDamageEffect): void {
		this.pendingInstantDamage.push(effect);
	}

	/** 在成员 Tick 收尾边界统一解析并派发当前 Tick 的瞬时伤害。 */
	flushInstantDamage(schedule: InstantDamageScheduler): void {
		if (this.pendingInstantDamage.length === 0) return;
		const effects = this.pendingInstantDamage
			.splice(0)
			.map((effect, order) => ({ effect, order }))
			.sort((left, right) => {
				const leftSourceId = left.effect.identity.sourceId;
				const rightSourceId = right.effect.identity.sourceId;
				return leftSourceId < rightSourceId ? -1 : leftSourceId > rightSourceId ? 1 : left.order - right.order;
			});
		const dispatches: Array<{ targetMemberId: string; payload: DamageDispatchPayload; delayMs: number }> = [];
		for (const { effect } of effects) {
			this.executeInstantDamage(effect, (targetMemberId, payload, delayMs) => {
				dispatches.push({ targetMemberId, payload, delayMs });
			});
		}
		for (const dispatch of dispatches) schedule(dispatch.targetMemberId, dispatch.payload, dispatch.delayMs);
	}

	clear(): void {
		this.pendingInstantDamage.length = 0;
	}

	executeInstantDamage(effect: ResolvedDamageEffect, schedule: InstantDamageScheduler): void {
		const source = this.memberManager.getMember(effect.identity.sourceId);
		if (!source) throw new Error(`executeInstantDamage: 施法者不存在: ${effect.identity.sourceId}`);
		const target = effect.targetId ? this.memberManager.getMember(effect.targetId) : null;
		const range = resolveEffectRange(effect.range, {
			source: source.position,
			target: target?.position ?? source.position,
		});
		const targets = queryDamageTargets({
			spaceManager: this.spaceManager,
			resolvedRange: range,
			sourceCampId: effect.identity.sourceCampId,
			lockedTarget: target,
		});
		const damageCount = Math.max(1, Math.floor(effect.attackSemantics.damageCount));
		const intervalMs = Math.max(0, effect.attackSemantics.damageIntervalMs);
		for (const hitTarget of targets) {
			const distance = distanceBetween(range.position, hitTarget.position);
			const direction = damageDirection(range.position, hitTarget.position);
			for (let damageIndex = 0; damageIndex < damageCount; damageIndex++) {
				const payload: DamageDispatchPayload = {
					sourceId: effect.identity.sourceId,
					sourceSkillId: effect.identity.sourceSkillId,
					sourceTeamId: effect.identity.sourceTeamId,
					origin: { kind: "attack" },
					damageFormula: effect.payload.damageFormula,
					casterSnapshot: effect.payload.casterSnapshot,
					skillLv: effect.payload.skillLv,
					damageCount,
					damageIndex,
					damageTags: [...effect.payload.damageTags],
					lockCasterAttributes: effect.payload.lockCasterAttributes,
					direction,
					isFatal: false,
					vars: { distance, targetCount: targets.length },
				};
				schedule(hitTarget.id, payload, damageIndex * intervalMs);
			}
		}
	}
}
