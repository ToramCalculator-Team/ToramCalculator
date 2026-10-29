import type { DamageRangeType } from "@db/schema/enums";
import type { EffectRange } from "../EffectRange/types";

export type DamageOrigin = { kind: "attack" } | { kind: "area"; areaId: string };

export type DamageDirection = "front" | "back" | "left" | "right";

export interface DamageDefinition {
	identity: {
		sourceId: string;
		sourceSkillId?: string;
		sourceCampId: string;
		sourceTeamId: string;
	};
	attackSemantics: {
		damageCount: number;
		damageIntervalMs: number;
	};
	payload: {
		damageFormula: string;
		casterSnapshot: Record<string, number>;
		skillLv: number;
		damageTags: string[];
		lockCasterAttributes: boolean;
	};
	targetId?: string;
}

export interface ResolvedDamageEffect extends DamageDefinition {
	rangeKind: DamageRangeType;
	range: EffectRange;
}

export interface DamageDispatchPayload {
	sourceId: string;
	sourceSkillId?: string;
	sourceTeamId: string;
	origin: DamageOrigin;
	damageFormula: string;
	casterSnapshot: Record<string, number>;
	skillLv: number;
	damageCount: number;
	damageIndex: number;
	damageTags: string[];
	lockCasterAttributes: boolean;
	direction: DamageDirection;
	isFatal: boolean;
	vars: {
		distance: number;
		targetCount: number;
	};
}

/** 伤害归因按队伍、施法成员和技能（或普通攻击）聚合，不使用 Area 或命中步骤身份。 */
export function damageSourceKey(source: { sourceTeamId: string; sourceId: string; sourceSkillId?: string }): string {
	const action = source.sourceSkillId ? `skill:${source.sourceSkillId}` : "normalAtk";
	return `team:${source.sourceTeamId}/member:${source.sourceId}/${action}`;
}
