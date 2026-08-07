/**
 * 标签字符串 → 位索引注册表。
 *
 * 用途：
 * - 伤害归因标签（damageTags: fire / poison / magicalExplosion / controlEnhance …）
 * - 状态类型（ABNORMAL_TYPE 枚举值）
 * - 事件类别（阶段 3 的 EventCatalog 复用同一套位分配方案）
 *
 * 设计约束：
 * - 引擎初始化时一次性构造并冻结；构造后不得再注册新 tag。
 * - 位索引跨启动必须稳定（排序后建表），否则 checkpoint 回放对不齐。
 * - 第一版用 `bigint` 作为位图载体，保证 ≥ 64 位容量上限时也能无缝扩展（bigint 无位宽限制）。
 *   若后续需要 TypedArray 化（性能场景），可在此文件替换实现。
 */

export class TagRegistry {
	private readonly bitByTag: ReadonlyMap<string, number>;
	private readonly tagByBit: readonly string[];
	public readonly size: number;

	/**
	 * @param tags 标签字符串集合。重复项会被去重；**内部会排序后分配位索引以保证跨启动稳定**。
	 */
	constructor(tags: Iterable<string>) {
		const unique = [...new Set(tags)].sort();
		const map = new Map<string, number>();
		unique.forEach((tag, index) => {
			map.set(tag, index);
		});
		this.bitByTag = map;
		this.tagByBit = Object.freeze(unique);
		this.size = unique.length;
		Object.freeze(this);
	}

	/** 返回 tag 对应的位索引；未注册则抛错（避免悄无声息被忽略）。 */
	getBit(tag: string): number {
		const bit = this.bitByTag.get(tag);
		if (bit === undefined) {
			throw new Error(`TagRegistry: 未注册的标签 "${tag}"`);
		}
		return bit;
	}

	/** 根据 tag 集合合成一个位图。 */
	getMask(tags: Iterable<string>): bigint {
		let mask = 0n;
		for (const tag of tags) {
			mask |= 1n << BigInt(this.getBit(tag));
		}
		return mask;
	}

	/** 检查某个 mask 是否包含指定 tag 位。 */
	has(mask: bigint, tag: string): boolean {
		const bit = this.bitByTag.get(tag);
		if (bit === undefined) return false;
		return (mask & (1n << BigInt(bit))) !== 0n;
	}

	/** 两个 mask 是否有位相交。 */
	intersects(a: bigint, b: bigint): boolean {
		return (a & b) !== 0n;
	}

	/** 导出 mask 包含的所有 tag（主要用于调试 / 日志）。 */
	listTags(mask: bigint): string[] {
		const result: string[] = [];
		for (let i = 0; i < this.tagByBit.length; i++) {
			if ((mask & (1n << BigInt(i))) !== 0n) {
				result.push(this.tagByBit[i]);
			}
		}
		return result;
	}
}
