import type { DamageRangeType } from "@db/schema/enums";
import type { DamageDefinition } from "../Damage/types";
import type { EffectRange, DamageRangeParams, Vec3 } from "../EffectRange/types";

/** Area 是跨 Tick 持续实体，容量与 SAB 区域表共同遵守此边界。 */
export const WORLD_AREA_CAPACITY = 256;
export const WORLD_AREA_CAPACITY_EXCEEDED_CODE = "realtime_area_capacity_exceeded";

/** 只有持续伤害 Area 才需要的额外生命周期和命中策略。 */
export interface DamageAreaSpec extends DamageDefinition {
	rangeKind: DamageRangeType;
	range: EffectRange;
	lifetime: {
		startTimeMs: number;
		durationMs: number;
	};
	hitPolicy: {
		hitIntervalMs: number;
	};
}

export interface BuffAreaRequest {
	areaId: string;
	sourceId: string;
	sourceCampId: string;
	startTimeMs: number;
	durationMs: number;
	rangeKind: DamageRangeType;
	rangeParams: DamageRangeParams;
	castPosition: Vec3;
}

export interface TrapAreaRequest {
	areaId: string;
	sourceId: string;
	sourceCampId: string;
	startTimeMs: number;
	durationMs: number;
	rangeKind: DamageRangeType;
	rangeParams: DamageRangeParams;
	castPosition: Vec3;
}

export type { DamageRangeParams, EffectRange, Vec3 } from "../EffectRange/types";
