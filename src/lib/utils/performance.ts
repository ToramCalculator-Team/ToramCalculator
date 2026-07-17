/**
 * 统一性能监控工具
 *
 * 整合了装饰器、观察者模式、配置管理等功能
 * 提供统一的API接口，避免功能分散
 *
 * ==================== 使用说明 ====================
 *
 * 1. 基本使用
 * ```typescript
 * import { Performance } from '~/utils/performance';
 *
 * // 监控函数执行时间
 * const myFunction = Performance.monitor('my_function', async () => {
 *   // 你的代码
 *   await someAsyncOperation();
 * });
 *
 * // 监控类方法
 * class MyClass {
 *   @Performance.decorator('my_method')
 *   async myMethod() {
 *     // 你的代码
 *   }
 * }
 * ```
 *
 * 2. 配置管理
 * ```typescript
 * // 设置日志级别
 * Performance.setLogLevel('info'); // 'none' | 'error' | 'warn' | 'info' | 'debug'
 *
 * // 设置最小记录时间（毫秒）
 * Performance.setMinRecordTime(100);
 *
 * // 快速配置预设
 * PerformanceConfig.dev();    // 开发模式：显示详细信息
 * PerformanceConfig.prod();   // 生产模式：只显示错误
 * PerformanceConfig.debug();  // 调试模式：显示所有信息
 * PerformanceConfig.silent(); // 静默模式：关闭所有日志
 * PerformanceConfig.slowOnly(); // 只显示慢操作（>100ms）
 * ```
 *
 * 3. 统计和报告
 * ```typescript
 * // 获取性能统计
 * const stats = Performance.getStats();
 *
 * // 打印统计报告
 * Performance.printStats();
 *
 * // 清除统计数据
 * Performance.clearStats();
 *
 * // 获取所有性能事件
 * const events = Performance.getEvents();
 *
 * // 清除事件记录
 * Performance.clearEvents();
 * ```
 *
 * 4. 搜索性能监控
 * ```typescript
 * // 记录搜索性能数据
 * Performance.recordSearch({
 *   searchId: 'unique_id',
 *   keyword: '搜索关键词',
 *   totalTime: 150,
 *   dbConnectionTime: 10,
 *   importTime: 5,
 *   searchTime: 120,
 *   processTime: 15,
 *   tableMetrics: {
 *     'item': { queryTime: 50, dataFetchTime: 30, resultCount: 100 }
 *   },
 *   totalResults: 100
 * });
 *
 * // 获取搜索统计
 * const searchStats = Performance.getSearchStats();
 *
 * // 打印搜索统计
 * Performance.printSearchStats();
 * ```
 *
 * 5. 浏览器控制台访问
 * ```javascript
 * // 在浏览器控制台中
 * window.Performance.printStats();           // 打印统计
 * window.Performance.setLogLevel('debug');   // 设置日志级别
 * window.PerformanceConfig.dev();            // 快速配置
 * ```
 *
 * 6. 自定义观察者
 * ```typescript
 * import { Performance, PerformanceObserver } from '~/utils/performance';
 *
 * class MyObserver implements PerformanceObserver {
 *   onPerformanceEvent(event) {
 *     // 自定义处理逻辑
 *     console.log(`自定义监控: ${event.operation} 耗时 ${event.duration}ms`);
 *   }
 * }
 *
 * Performance.addObserver(new MyObserver());
 * ```
 *
 * ==================== 配置选项 ====================
 *
 * - consoleLevel: 控制台日志级别 ('none' | 'error' | 'warn' | 'info' | 'debug')
 * - enableStats: 是否启用统计收集 (boolean)
 * - enableEventStorage: 是否启用事件存储 (boolean)
 * - operationFilter: 操作过滤关键词 (string)
 * - minRecordTime: 最小记录时间，毫秒 (number)
 *
 * ==================== 性能事件结构 ====================
 *
 * ```typescript
 * interface PerformanceEvent {
 *   id: string;                    // 唯一标识
 *   operation: string;             // 操作名称
 *   startTime: number;             // 开始时间
 *   endTime: number;               // 结束时间
 *   duration: number;              // 执行时长
 *   metadata?: Record<string, any>; // 额外信息
 * }
 * ```
 *
 * ==================== 最佳实践 ====================
 *
 * 1. 使用有意义的操作名称，便于识别和统计
 * 2. 在生产环境中使用 PerformanceConfig.prod() 减少日志输出
 * 3. 定期调用 Performance.printStats() 查看性能趋势
 * 4. 对于频繁调用的函数，设置合适的 minRecordTime 避免日志过多
 * 5. 使用 operationFilter 只监控特定操作
 *
 * ==================== 注意事项 ====================
 *
 * 1. 性能监控本身也会消耗一些资源，建议在生产环境中适度使用
 * 2. 事件存储有最大数量限制（1000条），超出会自动清理旧数据
 * 3. 装饰器只能用于类方法，不能用于普通函数
 * 4. 异步函数会自动处理 Promise 的 resolve 和 reject
 */

// ==================== 类型定义 ====================

export interface PerformanceEvent {
	id: string;
	operation: string;
	startTime: number;
	endTime: number;
	duration: number;
	metadata?: Record<string, any>;
}

export interface PerformanceObserver {
	onPerformanceEvent(event: PerformanceEvent): void;
}

export interface PerformanceConfig {
	// 控制台日志级别
	consoleLevel: "none" | "error" | "warn" | "info" | "debug";
	// 是否启用统计收集
	enableStats: boolean;
	// 是否启用事件存储
	enableEventStorage: boolean;
	// 操作过滤（只监控包含指定关键词的操作）
	operationFilter?: string;
	// 最小记录时间（毫秒），低于此时间的操作不记录
	minRecordTime: number;
}

export interface SearchPerformanceData {
	searchId: string;
	keyword: string;
	totalTime: number;
	dbConnectionTime: number;
	importTime: number;
	searchTime: number;
	processTime: number;
	tableMetrics: Record<
		string,
		{
			queryTime: number;
			dataFetchTime: number;
			resultCount: number;
		}
	>;
	totalResults: number;
}

// ==================== 全局配置 ====================

let globalConfig: PerformanceConfig = {
	consoleLevel: "info",
	enableStats: true,
	enableEventStorage: true,
	minRecordTime: 0,
};

/**
 * 设置全局性能监控配置
 */
export function setConfig(config: Partial<PerformanceConfig>) {
	globalConfig = { ...globalConfig, ...config };
	console.log(`🔧 [性能监控] 配置已更新:`, globalConfig);
}

/**
 * 获取当前配置
 */
export function getConfig(): PerformanceConfig {
	return { ...globalConfig };
}

// ==================== 事件发射器 ====================

class PerformanceEventEmitter {
	private static observers: PerformanceObserver[] = [];
	private static events: PerformanceEvent[] = [];
	private static maxEvents = 1000;

	static addObserver(observer: PerformanceObserver) {
		PerformanceEventEmitter.observers.push(observer);
	}

	static removeObserver(observer: PerformanceObserver) {
		const index = PerformanceEventEmitter.observers.indexOf(observer);
		if (index > -1) {
			PerformanceEventEmitter.observers.splice(index, 1);
		}
	}

	static emit(event: PerformanceEvent) {
		// 检查操作过滤
		if (globalConfig.operationFilter && !event.operation.includes(globalConfig.operationFilter)) {
			return;
		}

		// 存储事件
		if (globalConfig.enableEventStorage) {
			PerformanceEventEmitter.events.push(event);
			if (PerformanceEventEmitter.events.length > PerformanceEventEmitter.maxEvents) {
				PerformanceEventEmitter.events = PerformanceEventEmitter.events.slice(-PerformanceEventEmitter.maxEvents);
			}
		}

		// 通知所有观察者
		PerformanceEventEmitter.observers.forEach((observer) => {
			try {
				observer.onPerformanceEvent(event);
			} catch (error) {
				console.warn("Performance observer error:", error);
			}
		});
	}

	static getEvents(): PerformanceEvent[] {
		return [...PerformanceEventEmitter.events];
	}

	static clearEvents() {
		PerformanceEventEmitter.events = [];
	}
}

// ==================== 观察者实现 ====================

/**
 * 控制台性能观察者
 */
export class ConsoleObserver implements PerformanceObserver {
	private enabled = true;
	private operationFilter?: string;

	constructor(options?: { enabled?: boolean; operationFilter?: string }) {
		this.enabled = options?.enabled ?? true;
		this.operationFilter = options?.operationFilter;
	}

	onPerformanceEvent(event: PerformanceEvent) {
		if (!this.enabled) return;
		if (this.operationFilter && !event.operation.includes(this.operationFilter)) return;

		// 根据配置的日志级别决定是否输出
		const level = globalConfig.consoleLevel;
		if (level === "none") return;

		const emoji = this.getOperationEmoji(event.operation);
		const message = `${emoji} [性能监控] ${event.operation}: ${event.duration.toFixed(2)}ms`;

		// 根据操作类型和耗时决定日志级别
		let shouldLog = false;
		let logLevel = "info";

		if (event.metadata?.success === false) {
			shouldLog = level === "error" || level === "warn" || level === "info" || level === "debug";
			logLevel = "error";
		} else if (event.duration > 1000) {
			shouldLog = level === "warn" || level === "info" || level === "debug";
			logLevel = "warn";
		} else if (event.duration > 100) {
			shouldLog = level === "info" || level === "debug";
			logLevel = "info";
		} else {
			shouldLog = level === "debug";
			logLevel = "debug";
		}

		if (shouldLog) {
			switch (logLevel) {
				case "error":
					console.error(message);
					break;
				case "warn":
					console.warn(message);
					break;
				case "debug":
					console.debug(message);
					break;
				default:
					console.log(message);
			}
		}
	}

	private getOperationEmoji(operation: string): string {
		if (operation.includes("db")) return "🗄️";
		if (operation.includes("search")) return "🔍";
		if (operation.includes("import")) return "📦";
		if (operation.includes("fetch")) return "📡";
		if (operation.includes("process")) return "⚙️";
		return "⏱️";
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	setOperationFilter(filter: string) {
		this.operationFilter = filter;
	}
}

/**
 * 统计性能观察者
 */
export class StatisticsObserver implements PerformanceObserver {
	private stats: Map<string, { count: number; totalTime: number; minTime: number; maxTime: number }> = new Map();

	onPerformanceEvent(event: PerformanceEvent) {
		if (!globalConfig.enableStats) return;

		const key = event.operation;
		const current = this.stats.get(key) || { count: 0, totalTime: 0, minTime: Infinity, maxTime: 0 };

		current.count++;
		current.totalTime += event.duration;
		current.minTime = Math.min(current.minTime, event.duration);
		current.maxTime = Math.max(current.maxTime, event.duration);

		this.stats.set(key, current);
	}

	getStats() {
		const result: Record<
			string,
			{ count: number; avgTime: number; minTime: number; maxTime: number; totalTime: number }
		> = {};

		this.stats.forEach((value, key) => {
			result[key] = {
				count: value.count,
				avgTime: value.totalTime / value.count,
				minTime: value.minTime,
				maxTime: value.maxTime,
				totalTime: value.totalTime,
			};
		});

		return result;
	}

	printStats() {
		const stats = this.getStats();
		console.log("\n📊 ===== 性能统计 =====");

		Object.entries(stats)
			.sort(([, a], [, b]) => b.totalTime - a.totalTime)
			.forEach(([operation, stat]) => {
				console.log(`${operation}:`);
				console.log(`  调用次数: ${stat.count}`);
				console.log(`  平均时间: ${stat.avgTime.toFixed(2)}ms`);
				console.log(`  最小时间: ${stat.minTime.toFixed(2)}ms`);
				console.log(`  最大时间: ${stat.maxTime.toFixed(2)}ms`);
				console.log(`  总时间: ${stat.totalTime.toFixed(2)}ms`);
			});

		console.log("📊 ====================\n");
	}

	clear() {
		this.stats.clear();
	}
}

// ==================== 装饰器 ====================

/**
 * 性能监控装饰器（类方法）
 */
export function performanceMonitor(operation: string) {
	return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
		const method = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const eventId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const startTime = performance.now();

			try {
				const result = await method.apply(this, args);
				const endTime = performance.now();
				const duration = endTime - startTime;

				// 检查最小记录时间
				if (duration >= globalConfig.minRecordTime) {
					PerformanceEventEmitter.emit({
						id: eventId,
						operation,
						startTime,
						endTime,
						duration,
						metadata: { args: args.length, success: true },
					});
				}

				return result;
			} catch (error) {
				const endTime = performance.now();
				const duration = endTime - startTime;

				// 错误总是记录
				PerformanceEventEmitter.emit({
					id: eventId,
					operation,
					startTime,
					endTime,
					duration,
					metadata: {
						args: args.length,
						success: false,
						error: error instanceof Error ? error.message : String(error),
					},
				});

				throw error;
			}
		};
	};
}

/**
 * 性能监控函数装饰器
 */
export function monitorPerformance<T extends (...args: any[]) => any>(operation: string, fn: T): T {
	return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
		const eventId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const startTime = performance.now();

		try {
			const result = await fn(...args);
			const endTime = performance.now();
			const duration = endTime - startTime;

			// 检查最小记录时间
			if (duration >= globalConfig.minRecordTime) {
				PerformanceEventEmitter.emit({
					id: eventId,
					operation,
					startTime,
					endTime,
					duration,
					metadata: { args: args.length, success: true },
				});
			}

			return result;
		} catch (error) {
			const endTime = performance.now();
			const duration = endTime - startTime;

			// 错误总是记录
			PerformanceEventEmitter.emit({
				id: eventId,
				operation,
				startTime,
				endTime,
				duration,
				metadata: { args: args.length, success: false, error: error instanceof Error ? error.message : String(error) },
			});

			throw error;
		}
	}) as T;
}

// ==================== 搜索性能监控 ====================

/**
 * 搜索性能数据收集器
 */
class SearchPerformanceCollector {
	private searchData: SearchPerformanceData[] = [];

	recordSearchData(data: SearchPerformanceData) {
		this.searchData.push(data);
		if (this.searchData.length > 100) {
			this.searchData = this.searchData.slice(-100);
		}
	}

	getSearchStats() {
		if (this.searchData.length === 0) {
			return {
				totalSearches: 0,
				averageSearchTime: 0,
				averageResults: 0,
				slowestSearch: null,
				fastestSearch: null,
			};
		}

		const totalTime = this.searchData.reduce((sum, data) => sum + data.totalTime, 0);
		const totalResults = this.searchData.reduce((sum, data) => sum + data.totalResults, 0);
		const slowest = this.searchData.reduce((max, data) => (data.totalTime > max.totalTime ? data : max));
		const fastest = this.searchData.reduce((min, data) => (data.totalTime < min.totalTime ? data : min));

		return {
			totalSearches: this.searchData.length,
			averageSearchTime: totalTime / this.searchData.length,
			averageResults: totalResults / this.searchData.length,
			slowestSearch: slowest,
			fastestSearch: fastest,
		};
	}

	printSearchStats() {
		const stats = this.getSearchStats();
		console.log("\n🔍 ===== 搜索性能统计 =====");
		console.log(`总搜索次数: ${stats.totalSearches}`);
		console.log(`平均搜索时间: ${stats.averageSearchTime.toFixed(2)}ms`);
		console.log(`平均结果数量: ${stats.averageResults.toFixed(1)}条`);
		if (stats.slowestSearch) {
			console.log(`最慢搜索: "${stats.slowestSearch.keyword}" (${stats.slowestSearch.totalTime.toFixed(2)}ms)`);
		}
		if (stats.fastestSearch) {
			console.log(`最快搜索: "${stats.fastestSearch.keyword}" (${stats.fastestSearch.totalTime.toFixed(2)}ms)`);
		}
		console.log("🔍 ========================\n");
	}

	clear() {
		this.searchData = [];
	}
}

// ==================== 实例创建 ====================

const consoleObserver = new ConsoleObserver();
const statisticsObserver = new StatisticsObserver();
const searchCollector = new SearchPerformanceCollector();

// 注册默认观察者
PerformanceEventEmitter.addObserver(consoleObserver);
PerformanceEventEmitter.addObserver(statisticsObserver);

// ==================== 统一API ====================

/**
 * 统一性能监控API
 */
export const Performance = {
	// 配置管理
	setConfig,
	getConfig,

	// 装饰器
	monitor: monitorPerformance,
	decorator: performanceMonitor,

	// 观察者管理
	addObserver: (observer: PerformanceObserver) => PerformanceEventEmitter.addObserver(observer),
	removeObserver: (observer: PerformanceObserver) => PerformanceEventEmitter.removeObserver(observer),

	// 事件管理
	getEvents: () => PerformanceEventEmitter.getEvents(),
	clearEvents: () => PerformanceEventEmitter.clearEvents(),

	// 统计管理
	getStats: () => statisticsObserver.getStats(),
	printStats: () => statisticsObserver.printStats(),
	clearStats: () => statisticsObserver.clear(),

	// 搜索性能
	recordSearch: (data: SearchPerformanceData) => searchCollector.recordSearchData(data),
	getSearchStats: () => searchCollector.getSearchStats(),
	printSearchStats: () => searchCollector.printSearchStats(),
	clearSearchStats: () => searchCollector.clear(),

	// 控制台控制
	setConsoleEnabled: (enabled: boolean) => consoleObserver.setEnabled(enabled),
	setOperationFilter: (filter: string) => consoleObserver.setOperationFilter(filter),

	// 快捷配置方法
	setLogLevel: (level: "none" | "error" | "warn" | "info" | "debug") => setConfig({ consoleLevel: level }),
	setMinRecordTime: (time: number) => setConfig({ minRecordTime: time }),
	enableStats: (enabled: boolean) => setConfig({ enableStats: enabled }),
	enableEventStorage: (enabled: boolean) => setConfig({ enableEventStorage: enabled }),
};

// ==================== 快捷配置 ====================

/**
 * 预设配置
 */
export const PerformanceConfig = {
	// 开发模式：显示详细信息
	dev: () =>
		setConfig({
			consoleLevel: "info",
			enableStats: true,
			enableEventStorage: true,
			minRecordTime: 10,
		}),

	// 生产模式：只显示错误
	prod: () =>
		setConfig({
			consoleLevel: "error",
			enableStats: true,
			enableEventStorage: false,
			minRecordTime: 100,
		}),

	// 调试模式：显示所有信息
	debug: () =>
		setConfig({
			consoleLevel: "debug",
			enableStats: true,
			enableEventStorage: true,
			minRecordTime: 0,
		}),

	// 静默模式：关闭所有日志
	silent: () => setConfig({ consoleLevel: "none" }),

	// 只显示慢操作（>100ms）
	slowOnly: () =>
		setConfig({
			consoleLevel: "warn",
			minRecordTime: 100,
		}),
};
