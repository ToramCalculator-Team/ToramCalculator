/**
 * 轻量级日志系统
 *
 * 设计要点：
 * - 使用 console.xxx.bind() + getter 保留浏览器 DevTools 的源码定位能力
 * - 每个模块通过 createLogger(tag) 创建带前缀和局部等级的 logger 实例
 * - 全局日志级别是运行环境门控；为空时使用局部等级，非空时限制最高输出等级
 */

export enum LogLevel {
	SILENT = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
}

let globalLevel: LogLevel | null = null;

const noop = (() => {}) as (...args: unknown[]) => void;

export type LoggerOptions = {
	level?: LogLevel;
};

function getEffectiveLogLevel(localLevel: LogLevel): LogLevel {
	return globalLevel === null ? localLevel : Math.min(localLevel, globalLevel);
}

function shouldLog(messageLevel: LogLevel, localLevel: LogLevel): boolean {
	return getEffectiveLogLevel(localLevel) >= messageLevel;
}

/**
 * 创建带标签前缀的 logger
 *
 * 用法：
 * ```ts
 * const log = createLogger("PlayerSM");
 * log.info("执行技能", skillName);   // [PlayerSM] 执行技能 魔法炮
 * log.debug("帧数据", frameData);    // 可通过 log.setLevel 或 setGlobalLogLevel 控制
 * ```
 *
 * getter + bind 机制确保 DevTools 点击日志条目时跳转到调用方源码，而非 Logger 内部。
 */
export function createLogger(tag: string, options: LoggerOptions = {}) {
	const prefix = `[${tag}]`;
	let localLevel = options.level ?? LogLevel.DEBUG;

	return {
		/**
		 * SILENT = 0,
		 * ERROR = 1,
		 * WARN = 2,
		 * INFO = 3,
		 * DEBUG = 4,
		 */
		setLevel(level: LogLevel) {
			localLevel = level;
		},
		getLevel(): LogLevel {
			return localLevel;
		},
		getEffectiveLevel(): LogLevel {
			return getEffectiveLogLevel(localLevel);
		},
		get error(): (...args: unknown[]) => void {
			return shouldLog(LogLevel.ERROR, localLevel) ? console.error.bind(console, prefix) : noop;
		},
		get warn(): (...args: unknown[]) => void {
			return shouldLog(LogLevel.WARN, localLevel) ? console.warn.bind(console, prefix) : noop;
		},
		get info(): (...args: unknown[]) => void {
			return shouldLog(LogLevel.INFO, localLevel) ? console.log.bind(console, prefix) : noop;
		},
		get debug(): (...args: unknown[]) => void {
			return shouldLog(LogLevel.DEBUG, localLevel) ? console.log.bind(console, prefix) : noop;
		},
	};
}

export type Logger = ReturnType<typeof createLogger>;

export function setGlobalLogLevel(level: LogLevel | null) {
	globalLevel = level;
}

export function getGlobalLogLevel(): LogLevel | null {
	return globalLevel;
}

export function setLogLevel(level: LogLevel | null) {
	setGlobalLogLevel(level);
}

export function getLogLevel(): LogLevel | null {
	return getGlobalLogLevel();
}
