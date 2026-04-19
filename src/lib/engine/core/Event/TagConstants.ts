/**
 * 引擎内置标签常量。
 *
 * 这些常量用于构造 Worker 级的 `TagRegistry`。加入/删除元素会改变位索引 —
 * 若需要保留 checkpoint 兼容性，应只追加（追加后在 TagRegistry 内部仍按排序分配，
 * 因此实际兼容性由 tag 字符串集合 + 排序后索引共同决定）。
 */

import { ABNORMAL_TYPE } from "@db/schema/enums";

/**
 * 伤害归因标签。
 *
 * 参考 `DamageDispatchPayload.damageTags` 约定。
 * - 元素：fire / water / earth / wind / light / dark / normal
 * - 性质：physical / magical / percentage
 * - 异常衍生：ignition / poison / bleed / magicalExplosion
 * - 特殊类型：controlEnhance（锤击·控制强化等）
 * - 化学：chemical（红/蓝区副作用）
 */
export const DAMAGE_TAGS = [
	// 元素
	"normal",
	"fire",
	"water",
	"earth",
	"wind",
	"light",
	"dark",
	// 性质
	"physical",
	"magical",
	"percentage",
	// 异常衍生伤害
	"ignition",
	"poison",
	"bleed",
	"magicalExplosion",
	// 特殊
	"controlEnhance",
	"chemical",
] as const;

export type DamageTag = (typeof DAMAGE_TAGS)[number];

/**
 * 状态标签（与 StatusInstance.type 共用命名空间）。
 *
 * 直接复用 ABNORMAL_TYPE 枚举；后续若引入非异常类状态（无敌、系统 buff 等），
 * 再在此处合并。
 */
export const STATUS_TAGS: readonly string[] = ABNORMAL_TYPE;

/**
 * 引擎启动时构造 TagRegistry 用的全集。
 *
 * TagRegistry 会内部排序后分配位索引；此处顺序不影响运行时。
 */
export function getBuiltInTags(): readonly string[] {
	const set = new Set<string>();
	for (const tag of DAMAGE_TAGS) set.add(tag);
	for (const tag of STATUS_TAGS) set.add(tag);
	return [...set];
}
