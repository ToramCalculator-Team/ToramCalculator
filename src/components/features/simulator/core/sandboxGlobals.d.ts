/**
 * Simulator Worker 沙盒全局类型定义
 *
 * 目标：
 * - 在整个 simulator 代码范围内只扩展一次 globalThis
 * - 避免在具体实现文件里重复 declare global 导致类型不可见/冲突
 */

export interface SimulatorSafeAPI {
	console: typeof console;
	setTimeout: typeof setTimeout;
	clearTimeout: typeof clearTimeout;
	setInterval: typeof setInterval;
	clearInterval: typeof clearInterval;
	Date: DateConstructor;
	Math: Math;
	JSON: typeof JSON;

	// 数学函数
	floor: (x: number) => number;
	ceil: (x: number) => number;
	round: (x: number) => number;
	max: (...values: number[]) => number;
	min: (...values: number[]) => number;
	abs: (x: number) => number;
	pow: (x: number, y: number) => number;
	sqrt: (x: number) => number;

	// 工具函数
	generateId: () => string;
	now: () => number;
}

declare global {
	/**
	 * Worker 沙盒会注入 safeAPI；非 Worker 环境下可能不存在
	 *
	 * 用 `var` 声明而不是扩展 `GlobalThis`，可以让 `globalThis.safeAPI` 在 TS 中更稳定可用。
	 */
	var safeAPI: SimulatorSafeAPI | undefined;
}


