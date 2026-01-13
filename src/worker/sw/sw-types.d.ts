/**
 * sw-types.d.ts - Service Worker 专用类型声明
 *
 * 用途：
 *   - 提供 Service Worker 环境下的全局类型声明
 *   - 增强 TypeScript 在 SW 环境下的类型支持
 *   - 定义构建时注入的全局变量类型
 *
 * 维护：架构师/全栈/工具开发
 */

// Service Worker 全局对象扩展
declare global {
	interface ServiceWorkerGlobalScope {}

	// 由 esbuild define 注入的全局常量（编译期替换）
	const __SW_VERSION__: string | undefined;
	const __SW_BUILD_TS__: number | undefined;

	// 扩展 globalThis
	interface GlobalThis {}
}

// Service Worker 相关事件类型扩展
interface ExtendableEvent extends Event {
	waitUntil(f: Promise<any>): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
	data: any;
	source: Client | MessagePort | ServiceWorker | null;
	ports: ReadonlyArray<MessagePort>;
}

interface FetchEvent extends ExtendableEvent {
	request: Request;
	respondWith(r: Response | Promise<Response>): void;
	preloadResponse: Promise<Response>;
	clientId: string;
	resultingClientId: string;
	replacesClientId: string;
}

interface InstallEvent extends ExtendableEvent {
	// Install event specific properties
}

interface ActivateEvent extends ExtendableEvent {
	// Activate event specific properties
}

// 缓存 API 增强
interface CacheQueryOptions {
	ignoreSearch?: boolean;
	ignoreMethod?: boolean;
	ignoreVary?: boolean;
	cacheName?: string;
}

interface CacheAddAllOptions {
	ignoreMethod?: boolean;
}

// 客户端类型
interface Client {
	url: string;
	frameType: ClientFrameType;
	id: string;
	type: ClientType;
	postMessage(message: any, transfer?: Transferable[]): void;
}

interface WindowClient extends Client {
	focused: boolean;
	visibilityState: VisibilityState;
	focus(): Promise<WindowClient>;
	navigate(url: string): Promise<WindowClient | null>;
}

type ClientFrameType = "auxiliary" | "top-level" | "nested" | "none";
type ClientType = "window" | "worker" | "sharedworker";

// Performance API 增强
interface Performance {
	now(): number;
	mark(markName: string): void;
	measure(measureName: string, startMark?: string, endMark?: string): void;
	getEntriesByName(name: string, type?: string): PerformanceEntry[];
	getEntriesByType(type: string): PerformanceEntry[];
	clearMarks(markName?: string): void;
	clearMeasures(measureName?: string): void;
}

// 错误处理增强
interface ErrorEvent extends Event {
	message: string;
	filename: string;
	lineno: number;
	colno: number;
	error: Error;
}

interface PromiseRejectionEvent extends Event {
	promise: Promise<any>;
	reason: any;
}

export {};
