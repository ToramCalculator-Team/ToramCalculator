import { createLogger, LogLevel as LocalLevel } from "~/lib/logger";

export namespace Log {
	export enum LogLevel {
		FATAL = "fatal",
		ERROR = "error",
		WARN = "warn",
		INFO = "info",
		DEBUG = "debug",
	}

	const levelMap: Record<LogLevel, LocalLevel> = {
		[LogLevel.FATAL]: LocalLevel.ERROR,
		[LogLevel.ERROR]: LocalLevel.ERROR,
		[LogLevel.WARN]: LocalLevel.WARN,
		[LogLevel.INFO]: LocalLevel.INFO,
		[LogLevel.DEBUG]: LocalLevel.DEBUG,
	};

	type LocalLogger = ReturnType<typeof createLogger>;
	const loggers = new Map<string, LocalLogger>();
	let current = LogLevel.ERROR;

	function get(module = "reactor-ts"): LocalLogger {
		let logger = loggers.get(module);
		if (!logger) {
			logger = createLogger(module);
			logger.setLevel(levelMap[current]);
			loggers.set(module, logger);
		}
		return logger;
	}

	function emit(severity: LogLevel, obj: unknown, message: () => string, module?: string): void {
		const logger = get(module);
		if (logger.getEffectiveLevel() < levelMap[severity]) return;
		const text = message.call(obj);
		if (severity === LogLevel.DEBUG) logger.debug(text);
		else if (severity === LogLevel.INFO) logger.info(text);
		else if (severity === LogLevel.WARN) logger.warn(text);
		else logger.error(text);
	}

	export const globalLogger = {
		debug: (...args: unknown[]) => get().debug(...args),
		info: (...args: unknown[]) => get().info(...args),
		warn: (...args: unknown[]) => get().warn(...args),
		error: (...args: unknown[]) => get().error(...args),
		fatal: (...args: unknown[]) => get().error("[fatal]", ...args),
		isLevelEnabled: (level: string) => get().getEffectiveLevel() >= (levelMap[level as LogLevel] ?? LocalLevel.DEBUG),
		child: ({ module }: { module: string }) => get(module),
		get level() {
			return current;
		},
		set level(value: LogLevel) {
			setLevel(value);
		},
	};

	export const hr = "=".repeat(80);

	export function getInstance(module: string): LocalLogger {
		return get(module);
	}

	export function setLevel(level: LogLevel, module?: string): void {
		if (module) {
			get(module).setLevel(levelMap[level]);
			return;
		}
		current = level;
		for (const logger of loggers.values()) logger.setLevel(levelMap[level]);
	}

	export const fatal = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.FATAL, obj, message, module);
	export const error = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.ERROR, obj, message, module);
	export const warn = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.WARN, obj, message, module);
	export const info = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.INFO, obj, message, module);
	export const debug = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.DEBUG, obj, message, module);
	export const log = (obj: unknown, message: () => string, module?: string) =>
		emit(LogLevel.INFO, obj, message, module);
}
