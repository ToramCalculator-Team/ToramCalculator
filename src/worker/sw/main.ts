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
 * - install/activate 只处理 app shell 的核心缓存，保证首次接管成本可控。
 * - warm 资源由页面在首屏稳定后触发，下载过程由 SW 执行并通过消息回传进度。
 * - fetch 仍然使用 cache-first；后台 warm 未完成时，用户访问功能也会按需补缓存。
 */
import { CACHE_STRATEGIES, PERIODIC_CHECK_CONFIG } from "./config";
import { cacheOrNetwork, clearOldCaches, getCacheStatus, preCacheCore, warmCacheAll } from "./core/cache";
import { isAssetResource, isCoreResource, isPageResource } from "./core/fetch";
import { getCheckStatus, startPeriodicCheck, stopPeriodicCheck } from "./core/periodic";
import { checkVersionChange, getVersionStatus, updateStoredVersion } from "./core/version";
import type { SWMessage } from "./types";

const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "development";

let cacheStrategy: "all" | "core-only" | "assets-only" = "core-only";

(async (worker: ServiceWorkerGlobalScope) => {
	// install：只预缓存核心资源（开发模式跳过），并立刻接管下一阶段
	worker.addEventListener("install", (event) => {
		event.waitUntil(
			(async () => {
				if (!IS_DEV) {
					await preCacheCore();
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
						const result = await checkVersionChange();
						if (result.hasChanged) {
							await clearOldCaches();
							await preCacheCore();
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
		if (url.origin !== location.origin || event.request.method !== "GET" || IS_DEV) return;

		event.respondWith(
			(async () => {
				const pathname = url.pathname;

				// manifest：优先缓存，失败返回空对象，避免硬错误
				if (pathname === "/chunk-manifest.json") {
					const cache = await caches.open(CACHE_STRATEGIES.CORE);
					const cached = await cache.match(event.request);
					if (cached) return cached;
					try {
						const response = await fetch(event.request);
						if (response.ok) await cache.put(event.request, response.clone());
						return response;
					} catch {
						return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
					}
				}

				// 主文档：cache-first
				if (pathname === "/" || pathname === "/index.html") {
					const cached = await caches.match(event.request);
					if (cached) return cached;
					const response = await fetch(event.request);
					if (response.ok) {
						const cache = await caches.open(CACHE_STRATEGIES.CORE);
						await cache.put(event.request, response.clone());
					}
					return response;
				}

				// 路由：App Shell
				if (isPageResource(pathname)) {
					const shell = await caches.match("/");
					return shell || fetch(event.request);
				}

				// 其他静态资源：cache-first；其余直连
				if (isCoreResource(pathname)) return cacheOrNetwork(event as any, CACHE_STRATEGIES.CORE);
				if (isAssetResource(pathname)) return cacheOrNetwork(event as any, CACHE_STRATEGIES.ASSETS);
				return fetch(event.request);
			})(),
		);
	});

	// warm 缓存统一走同一个入口，避免后台自动补齐和手动完整缓存重复下载。
	const runWarmCache = (options: { force?: boolean } = {}) =>
		warmCacheAll({
			force: options.force,
			concurrency: 4,
			notify: (progress) => {
				notifyAll("WARM_CACHE_PROGRESS", progress);
			},
		})
			.then((result) => {
				if (result.failed > 0) {
					notifyAll("WARM_CACHE_FAILED", { failed: result.failed, total: result.total });
				} else {
					notifyAll("WARM_CACHE_COMPLETED", { total: result.total, bytes: result.bytes });
				}
				return result;
			})
			.finally(() => {
				void getCacheStatus().then((status) => notifyAll("CACHE_STATUS", status));
			});

	// postMessage：将主线程指令映射到核心动作
	// message: 指令调度
	worker.addEventListener("message", (event) => {
		const msg: SWMessage = event.data;
		switch (msg.type) {
			case "CHECK_CACHE_VERSION":
				event.waitUntil(
					(async () => {
						const result = await checkVersionChange();
						if (result.hasChanged) {
							await clearOldCaches();
							await preCacheCore();
						}
						notifyAll("CACHE_UPDATED", { timestamp: Date.now(), changed: result.hasChanged });
					})(),
				);
				break;
			case "FORCE_UPDATE":
				event.waitUntil(
					(async () => {
						await preCacheCore();
						if (msg.data?.mode === "all" || cacheStrategy === "all") {
							await runWarmCache({ force: msg.data?.force ?? true });
						}
						notifyAll("FORCE_UPDATE_COMPLETED", { timestamp: Date.now() });
					})(),
				);
				break;
			case "WARM_CACHE":
				event.waitUntil(runWarmCache({ force: !!msg.data?.force }));
				break;
			case "CLEAR_CACHE":
				event.waitUntil(
					(async () => {
						const names = await caches.keys();
						await Promise.all(names.map((name) => caches.delete(name)));
						await updateStoredVersion();
						notifyAll("CACHE_CLEARED", { timestamp: Date.now() });
					})(),
				);
				break;
			case "START_PERIODIC_CHECK":
				startPeriodicCheck(async () => {
					const result = await checkVersionChange();
					if (result.hasChanged) {
						await clearOldCaches();
						await preCacheCore();
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
						const status = await getCacheStatus();
						notifyClient(event.source, "CACHE_STATUS", status);
					})(),
				);
				break;
			case "GET_VERSION_STATUS":
				event.waitUntil(
					(async () => {
						const status = await getVersionStatus();
						notifyClient(event.source, "VERSION_STATUS", status);
					})(),
				);
				break;
			case "SET_CONFIG":
				if (msg.data && typeof msg.data.periodicCheckInterval === "number") {
					PERIODIC_CHECK_CONFIG.INTERVAL = msg.data.periodicCheckInterval;
				}
				if (
					msg.data?.cacheStrategy === "all" ||
					msg.data?.cacheStrategy === "core-only" ||
					msg.data?.cacheStrategy === "assets-only"
				) {
					cacheStrategy = msg.data.cacheStrategy;
				}
				break;
			default:
				break;
		}
	});

	// 广播工具：通知所有/单个客户端
	function notifyAll(type: string, data: unknown) {
		worker.clients.matchAll().then((clients) => {
			for (const client of clients) {
				client.postMessage({ type, data });
			}
		});
	}

	function notifyClient(client: Client | MessagePort | ServiceWorker | null, type: string, data: unknown) {
		if (client && "postMessage" in client) {
			client.postMessage({ type, data });
		}
	}
})(self as unknown as ServiceWorkerGlobalScope);
