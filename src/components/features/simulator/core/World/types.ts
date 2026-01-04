/**
 * World Area 子系统类型定义
 */

import type { DamageRangeType } from "@db/schema/enums";

/**
 * 三维向量
 */
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/**
 * 计算两点之间的距离
 */
export function distance(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 伤害范围参数
 */
export interface DamageRangeParams {
	/** 半径（用于 range/surroundings） */
	radius?: number;
	/** 速度（用于 move） */
	speed?: number;
	/** 方向（用于 move，Vec3 单位向量） */
	dir?: Vec3;
	/** 宽度（用于 move） */
	width?: number;
	/** 自定义参数 */
	[key: string]: unknown;
}

/**
 * 伤害区域请求（施法者侧构造）
 */
export interface DamageAreaRequest {
	/** 身份信息 */
	identity: {
		/** 施法者ID */
		sourceId: string;
		/** 施法者阵营ID */
		sourceCampId: string;
	};
	/** 生命周期 */
	lifetime: {
		/** 开始帧 */
		startFrame: number;
		/** 持续帧数 */
		durationFrames: number;
	};
	/** 命中策略 */
	hitPolicy: {
		/** 同目标命中节流（每 N 帧可再次命中） */
		hitIntervalFrames: number;
	};
	/** 攻击语义 */
	attackSemantics: {
		/** 攻击次数，多次造成伤害公式对应的伤害 */
		attackCount: number;
		/** 伤害数量，将伤害公式计算出的伤害平均分配到攻击次数 */
		damageCount: number;
	};
	/** 范围配置 */
	range: {
		/** 范围类型 */
		rangeKind: DamageRangeType;
		/** 范围参数 */
		rangeParams: DamageRangeParams;
	};
	/** 伤害载荷 */
	payload: {
		/** 编译后的伤害表达式（先以 string 占位） */
		compiledDamageExpr: string;
		/** 可选的 self 绑定值 */
		selfBindings?: Record<string, number | string | boolean>;
	};
	/** 施法时的位置（用于计算轨迹） */
	castPosition: Vec3;
	/** 目标位置（用于 rangeAttack 锁定中心） */
	targetPosition?: Vec3;
}

/**
 * 伤害派发载荷（派发给受击者）
 */
export interface DamageDispatchPayload {
	/** 施法者ID */
	sourceId: string;
	/** 区域ID */
	areaId: string;
	/** 编译后的伤害表达式 */
	compiledDamageExpr: string;
	/** 攻击次数 */
	attackCount: number;
	/** 伤害数量 */
	damageCount: number;
	/** 动态变量 */
	vars: {
		/** 距离（中心到目标位置） */
		distance: number;
		/** 目标数量（本 tick 实际命中的目标数） */
		targetCount: number;
	};
}

/**
 * Buff 区域请求（占位类型）
 */
export interface BuffAreaRequest {
	/** 区域ID */
	areaId: string;
	/** 施法者ID */
	sourceId: string;
	/** 施法者阵营ID */
	sourceCampId: string;
	/** 开始帧 */
	startFrame: number;
	/** 持续帧数 */
	durationFrames: number;
	/** 范围类型 */
	rangeKind: DamageRangeType;
	/** 范围参数 */
	rangeParams: DamageRangeParams;
	/** 施法位置 */
	castPosition: Vec3;
}

/**
 * 陷阱区域请求（占位类型）
 */
export interface TrapAreaRequest {
	/** 区域ID */
	areaId: string;
	/** 施法者ID */
	sourceId: string;
	/** 施法者阵营ID */
	sourceCampId: string;
	/** 开始帧 */
	startFrame: number;
	/** 持续帧数 */
	durationFrames: number;
	/** 范围类型 */
	rangeKind: DamageRangeType;
	/** 范围参数 */
	rangeParams: DamageRangeParams;
	/** 施法位置 */
	castPosition: Vec3;
}

