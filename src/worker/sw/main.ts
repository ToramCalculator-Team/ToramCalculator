/**
 * main.ts - Service Worker 入口与调度
 *
 * 职责：
 * - 绑定 SW 生命周期事件（install/activate）
 * - 统一处理 fetch 与 postMessage 指令
 * - 调用 core 模块完成预缓存、版本检查、定期检查与资源匹配
 *
 * 设计：
 * - 入口只做“调度”，所有具体逻辑下沉到 core/*
 * - 保持最小日志与最少状态，可维护性优先
 */
import { CACHE_STRATEGIES, PERIODIC_CHECK_CONFIG } from "./config";
import { cacheOrNetwork, clearOldCaches, getCacheStatus, preCacheAll } from "./core/cache";
import { isAssetResource, isCoreResource, isPageResource } from "./core/fetch";
import { getCheckStatus, startPeriodicCheck, stopPeriodicCheck } from "./core/periodic";
import { checkVersionChange, getVersionStatus, updateStoredVersion } from "./core/version";
import type { SWMessage } from "./types";

const IS_DEV =
	typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.MODE === "development";

(async (worker: ServiceWorkerGlobalScope) => {
	// install：预缓存核心与静态资源（开发模式跳过），并立刻接管下一阶段
	// install: 预缓存
	worker.addEventListener("install", (event) => {
		event.waitUntil(
			(async () => {
				if (!IS_DEV) {
					await preCacheAll();
				}
				await worker.skipWaiting();
			})(),
		);
	});

	// activate：清理旧缓存、启动定期版本检查、接管客户端
	// activate: 清旧缓存 + 接管 + 启动定期检查
	worker.addEventListener("activate", (event) => {
		event.waitUntil(
			(async () => {
				if (!IS_DEV) {
					await clearOldCaches();
					startPeriodicCheck(async () => {
						const r = await checkVersionChange();
						if (r.hasChanged) {
							await clearOldCaches();
							await preCacheAll();
						}
					});
				}
				await worker.clients.claim();
			})(),
		);
	});

	// fetch：同源 GET 请求使用 cache-first；其余直连网络
	// fetch: cache-first 策略
	worker.addEventListener("fetch", (event) => {
		const url = new URL(event.request.url);
		if (url.origin !== location.origin || event.request.method !== "GET") return;
		if (IS_DEV) return;

		event.respondWith(
			(async () => {
				const p = url.pathname;
				// manifest：优先缓存，失败返回空对象，避免硬错误
				if (p === "/chunk-manifest.json") {
					// 开发模式下不处理 manifest（避免 dev server 404）
					if (IS_DEV) return fetch(event.request);
					const cache = await caches.open(CACHE_STRATEGIES.CORE);
					const cached = await cache.match(event.request);
					if (cached) return cached;
					try {
						const r = await fetch(event.request);
						if (r.ok) await cache.put(event.request, r.clone());
						return r;
					} catch {
						return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
					}
				}

				// 主文档：cache-first
				if (p === "/" || p === "/index.html") {
					const cached = await caches.match(event.request);
					if (cached) return cached;
					const r = await fetch(event.request);
					if (r.ok) {
						const cache = await caches.open(CACHE_STRATEGIES.CORE);
						await cache.put(event.request, r.clone());
					}
					return r;
				}

				// 路由：App Shell
				if (isPageResource(p)) {
					const shell = await caches.match("/");
					return shell || fetch(event.request);
				}

				// 其他静态资源：cache-first；其余直连
				if (isCoreResource(p)) return cacheOrNetwork(event as any, CACHE_STRATEGIES.CORE);
				if (isAssetResource(p)) return cacheOrNetwork(event as any, CACHE_STRATEGIES.ASSETS);
				return fetch(event.request);
			})(),
		);
	});

	// postMessage：将主线程指令映射到核心动作
	// message: 指令调度
	worker.addEventListener("message", (event) => {
		const msg: SWMessage = event.data;
		switch (msg.type) {
			case "CHECK_CACHE_VERSION":
				event.waitUntil(
					(async () => {
						const r = await checkVersionChange();
						if (r.hasChanged) {
							await clearOldCaches();
							await preCacheAll();
						}
						notifyAll("CACHE_UPDATED", { timestamp: Date.now(), changed: r.hasChanged });
					})(),
				);
				break;
			case "FORCE_UPDATE":
				event.waitUntil(
					(async () => {
						await preCacheAll();
						notifyAll("FORCE_UPDATE_COMPLETED", { timestamp: Date.now() });
					})(),
				);
				break;
			case "CLEAR_CACHE":
				event.waitUntil(
					(async () => {
						const names = await caches.keys();
						await Promise.all(names.map((n) => caches.delete(n)));
						await updateStoredVersion();
						notifyAll("CACHE_CLEARED", { timestamp: Date.now() });
					})(),
				);
				break;
			case "START_PERIODIC_CHECK":
				startPeriodicCheck(async () => {
					const r = await checkVersionChange();
					if (r.hasChanged) {
						await clearOldCaches();
						await preCacheAll();
					}
				});
				notifyAll("PERIODIC_CHECK_STARTED", { status: getCheckStatus() });
				break;
			case "STOP_PERIODIC_CHECK":
				stopPeriodicCheck();
				notifyAll("PERIODIC_CHECK_STOPPED", {});
				break;
			case "GET_CHECK_STATUS":
				notifyClient(event.source, "CHECK_STATUS", getCheckStatus());
				break;
			case "CACHE_STATUS_REQUEST":
				event.waitUntil(
					(async () => {
						const s = await getCacheStatus();
						notifyClient(event.source, "CACHE_STATUS", s);
					})(),
				);
				break;
			case "GET_VERSION_STATUS":
				event.waitUntil(
					(async () => {
						const s = await getVersionStatus();
						notifyClient(event.source, "VERSION_STATUS", s);
					})(),
				);
				break;
			case "SET_CONFIG":
				if (msg.data && typeof msg.data.periodicCheckInterval === "number") {
					PERIODIC_CHECK_CONFIG.INTERVAL = msg.data.periodicCheckInterval;
				}
				break;
			default:
				break;
		}
	});

	// 广播工具：通知所有/单个客户端
	function notifyAll(type: string, data: any) {
		(self as any).clients.matchAll().then((cs: readonly Client[]) => {
			cs.forEach((c: any) => {
				c.postMessage({ type, data });
			});
		});
	}
	function notifyClient(client: any, type: string, data: any) {
		if (client && "postMessage" in client) client.postMessage({ type, data });
	}
})(self as any);
