/**
 * 施法者属性快照（CasterSnapshot）
 *
 * 用途：
 * - 技能脱手后，弹道飞行 / 延迟命中 / 分段伤害在结算时，公式里的 `self.*` 应当读取
 *   "施放瞬间"锁定的施法者属性，而非施法者当下的实时值。否则施法者在弹道飞行途中
 *   掉 buff、换装备会"回溯"影响已脱手的伤害。本模块负责承载这份锁定值。
 * - `target.*` 不在此列：受击者属性永远由结算侧实时读取。
 *
 * 设计：
 * - 本模块是快照「键编码约定」的唯一所有者。写入（伤害请求构造侧）与读取
 *   （受击结算侧的 self facade）都必须经由此处，避免编码约定散落两端、各改一半。
 * - 键约定：
 *   - 计算值     `key`            （如 `atk`）
 *   - 基础值     `_key`           （如 `_atk`，对应 getBaseValue）
 *   - buff 命中  `hasBuff:id`     （0/1，对应 hasBuff('id')）
 */

/** 施法者快照数据（纯数据，可序列化、可进 checkpoint）。 */
export type CasterSnapshot = Record<string, number>;

/** 表达式求值时 `self` 暴露的只读视图（与实时 Member 的取值面对齐）。 */
export interface SelfFacade {
	statContainer: {
		getValue(key: string): number;
		getBaseValue(key: string): number;
	};
	hasBuff(id: string): boolean;
}

const BASE_VALUE_PREFIX = "_";
const HAS_BUFF_PREFIX = "hasBuff:";

/** 写入计算值。 */
export function setStat(snapshot: CasterSnapshot, key: string, value: number): void {
	snapshot[key] = value;
}

/** 写入基础值（getBaseValue 通道）。 */
export function setBaseValue(snapshot: CasterSnapshot, key: string, value: number): void {
	snapshot[`${BASE_VALUE_PREFIX}${key}`] = value;
}

/** 写入 buff 命中标志（0/1）。 */
export function setHasBuff(snapshot: CasterSnapshot, id: string, present: boolean): void {
	snapshot[`${HAS_BUFF_PREFIX}${id}`] = present ? 1 : 0;
}

/**
 * 基于快照构造 `self` 只读视图。
 *
 * 缺键回退 0 并通过 onMissing 上报（构造侧的依赖分析应已覆盖所有用到的键，
 * 缺键通常意味着依赖分析与公式不一致，是可诊断的 bug 信号）。
 */
export function createSelfFacade(snapshot: CasterSnapshot, onMissing?: (key: string) => void): SelfFacade {
	const read = (key: string): number => {
		if (key in snapshot) return snapshot[key];
		onMissing?.(key);
		return 0;
	};
	return {
		statContainer: {
			getValue: (key) => read(key),
			getBaseValue: (key) => read(`${BASE_VALUE_PREFIX}${key}`),
		},
		hasBuff: (id) => snapshot[`${HAS_BUFF_PREFIX}${id}`] === 1,
	};
}
