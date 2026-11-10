import type { DamageRangeType } from "@db/schema/enums";

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface DamageRangeParams {
	radius?: number;
	speed?: number;
	dir?: Vec3;
	width?: number;
	[key: string]: unknown;
}

export type EffectRangeAnchor =
	| { kind: "caster"; offset?: Vec3 }
	| { kind: "target"; offset?: Vec3 }
	| { kind: "explicit"; point: Vec3 }
	| { kind: "betweenSourceAndTarget" };

/** 任何攻击效果都可以使用的逻辑空间范围，不携带 Area 生命周期或视觉字段。 */
export interface EffectRange {
	shape:
		| { kind: "point" }
		| { kind: "circle"; radius: number }
		| { kind: "rect"; width: number; height: number | "sourceToTarget" };
	anchor: EffectRangeAnchor;
	yaw: number | "sourceToTarget";
	trajectory?: import("./trajectory").TrajectoryTemplate;
}

export type DamageRange = DamageRangeType;
