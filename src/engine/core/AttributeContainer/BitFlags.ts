/**
 * 属性状态位标志
 * 使用位运算优化状态检查
 */
export enum AttributeFlags {
	// 仅保留必要标记：是否为计算属性、是否为基础值、是否已有缓存
	HAS_COMPUTATION = 1 << 0, // 0001: 有计算函数
	IS_BASE = 1 << 1, // 0010: 基础属性
	IS_CACHED = 1 << 2, // 0100: 有缓存值
}

/**
 * 位标志操作工具类
 */
export const BitFlags = {
	/**
	 * 设置标志位
	 */
	set(flags: Uint32Array, index: number, flag: AttributeFlags): void {
		const arrayIndex = index >>> 5; // index / 32
		const bitIndex = index & 31; // index % 32
		flags[arrayIndex] |= flag << bitIndex;
	},

	/**
	 * 清除标志位
	 */
	clear(flags: Uint32Array, index: number, flag: AttributeFlags): void {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		flags[arrayIndex] &= ~(flag << bitIndex);
	},

	/**
	 * 检查标志位
	 */
	has(flags: Uint32Array, index: number, flag: AttributeFlags): boolean {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		return (flags[arrayIndex] & (flag << bitIndex)) !== 0;
	},

	/**
	 * 切换标志位
	 */
	toggle(flags: Uint32Array, index: number, flag: AttributeFlags): void {
		const arrayIndex = index >>> 5;
		const bitIndex = index & 31;
		flags[arrayIndex] ^= flag << bitIndex;
	},
};
