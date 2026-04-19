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
 * 警告区域类型。
 *
 * 用于红/蓝区护盾等按警告圈染色的 hook 识别来源。
 * - `red` / `blue`：红/蓝色警告范围攻击（怪物 AoE 告警区）
 * - `none`：非警告区攻击（普攻、直射技能等）
 */
export type DamageWarningZone = "red" | "blue" | "none";

/**
 * 命中目标相对施法者的方位（基于目标朝向）。
 *
 * 用于「殿后（镜头朝向后方受击减伤）」等方向类 hook。
 * 初版仅四向；后续可扩展为连续角度。
 */
export type DamageDirection = "front" | "back" | "left" | "right";

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
		/** 原始伤害表达式（保留 self/target/skill.lv/distance/targetCount 等变量） */
		damageFormula: string;
		/** 施法者属性快照（施法时捕获的 self.xxx 属性值） */
		casterSnapshot: Record<string, number>;
		/** 技能等级 */
		skillLv: number;
		/**
		 * 伤害归因标签。供受击 Pipeline 的 overlay / proc mask 订阅判定。
		 * 约定集合（非穷举）：
		 * - 元素：fire / water / earth / wind / light / dark / normal
		 * - 性质：physical / magical / percentage
		 * - 异常衍生伤害：ignition / poison / bleed / magicalExplosion
		 * - 特殊类型：controlEnhance（锤击·控制强化）
		 */
		damageTags: string[];
		/** 警告区域类型（红/蓝区护盾识别依据） */
		warningZone: DamageWarningZone;
	};
	/** 施法时的位置（用于计算轨迹） */
	casterId: string;
	/** 目标位置（用于 rangeAttack 锁定中心） */
	targetId?: string;
}

/**
 * 伤害派发载荷（派发给受击者）
 *
 * 受击 Pipeline（`hitResolve` / `applyDamage`）消费本 payload；
 * 绝大多数按伤害来源判定的 passive / 托环（燃烧的斗志、红区护盾、殿后 …）
 * 依赖 `damageTags` / `warningZone` / `direction` 做条件分支。
 *
 * 字段由 `DamageAreaSystem.tick` 从 `DamageAreaRequest` 透传并追加动态变量（距离、方向）。
 */
export interface DamageDispatchPayload {
	/** 施法者ID */
	sourceId: string;
	/** 区域ID */
	areaId: string;
	/** 原始伤害表达式 */
	damageFormula: string;
	/** 施法者属性快照 */
	casterSnapshot: Record<string, number>;
	/** 技能等级 */
	skillLv: number;
	/** 攻击次数 */
	attackCount: number;
	/** 伤害数量 */
	damageCount: number;
	/** 伤害归因标签（见 DamageAreaRequest.payload.damageTags 说明） */
	damageTags: string[];
	/** 警告区域类型 */
	warningZone: DamageWarningZone;
	/** 目标相对施法者的方位（由 DamageAreaSystem 基于几何位置计算） */
	direction: DamageDirection;
	/**
	 * 是否致死。派发时初值为 `false`；由受击 Pipeline 计算出最终伤害后，
	 * 若 `damage >= target.hp.current` 则置 `true`，供"最后的抵抗 / 最后的意志"等
	 * 致死拦截类 overlay 与 `death.incoming` 订阅读取。
	 */
	isFatal: boolean;
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

