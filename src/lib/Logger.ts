/**
 * 轻量级日志系统
 *
 * 设计要点：
 * - 使用 console.xxx.bind() + getter 保留浏览器 DevTools 的源码定位能力
 * - 通过全局日志级别控制输出，SILENT 模式下零 I/O 开销
 * - 每个模块通过 createLogger(tag) 创建带前缀的 logger 实例
 */

export const enum LogLevel {
	SILENT = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

let globalLevel: LogLevel = LogLevel.DEBUG;

const noop = (() => {}) as (...args: unknown[]) => void;

/**
 * 创建带标签前缀的 logger
 *
 * 用法：
 * ```ts
 * const log = createLogger("PlayerSM");
 * log.info("执行技能", skillName);   // [PlayerSM] 执行技能 魔法炮
 * log.debug("帧数据", frameData);    // 可通过 setLogLevel 全局关闭
 * ```
 *
 * getter + bind 机制确保 DevTools 点击日志条目时跳转到调用方源码，而非 Logger 内部。
 */
export function createLogger(tag: string) {
	const prefix = `[${tag}]`;

	return {
		get error(): (...args: unknown[]) => void {
			return globalLevel >= LogLevel.ERROR ? console.error.bind(console, prefix) : noop;
		},
		get warn(): (...args: unknown[]) => void {
			return globalLevel >= LogLevel.WARN ? console.warn.bind(console, prefix) : noop;
		},
		get info(): (...args: unknown[]) => void {
			return globalLevel >= LogLevel.INFO ? console.log.bind(console, prefix) : noop;
		},
		get debug(): (...args: unknown[]) => void {
			return globalLevel >= LogLevel.DEBUG ? console.log.bind(console, prefix) : noop;
		},
	};
}

export type Logger = ReturnType<typeof createLogger>;

export function setLogLevel(level: LogLevel) {
	globalLevel = level;
}

export function getLogLevel(): LogLevel {
	return globalLevel;
}
