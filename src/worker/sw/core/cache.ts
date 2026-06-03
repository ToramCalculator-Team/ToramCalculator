/**
 * core/cache.ts - 缓存管理
 *
 * 职责：
 * - 基于 manifest 预缓存核心与后台资源
 * - 清理旧版本缓存
 * - 提供 cache-first 策略与缓存状态
 *
 * 设计说明：
 * - core 是 install 阶段需要的 app shell，体积必须可控，避免首次接管被大资源阻塞。
 * - warm 是首屏稳定后补齐的离线资源，失败允许跳过，下一次启动继续重试。
 * - fetch 阶段继续 cache-first，后台 warm 未完成时，用户访问功能也会按需补缓存。
 */
import { CACHE_STRATEGIES } from "../config";

type ManifestEntry = {
	fileName: string;
	size?: number;
	kind?: string;
};

type ChunkManifest = {
	chunks?: {
		core?: Array<ManifestEntry | string>;
		warm?: Array<ManifestEntry | string>;
	};
	assets?: {
		core?: Array<ManifestEntry | string>;
		warm?: Array<ManifestEntry | string>;
		images?: Array<ManifestEntry | string>;
		fonts?: Array<ManifestEntry | string>;
		others?: Array<ManifestEntry | string>;
	};
};

export type WarmCacheStatus = {
	inProgress: boolean;
	done: number;
	total: number;
	failed: number;
	bytes: number;
	lastUpdate?: string;
};

export type CacheStatus = {
	core: boolean;
	assets: Map<string, boolean>;
	data: Map<string, boolean>;
	pages: Map<string, boolean>;
	warm: WarmCacheStatus;
	manifestVersion?: string;
	lastUpdate?: string;
};

type WarmProgress = {
	done: number;
	total: number;
	current?: string;
	bytes: number;
	failed: number;
};

const warmStatus: WarmCacheStatus = {
	inProgress: false,
	done: 0,
	total: 0,
	failed: 0,
	bytes: 0,
};

let activeWarmCache: Promise<WarmCacheStatus> | undefined;

const toPath = (fileName: string) => (fileName.startsWith("/") ? fileName : `/${fileName}`);

const normalizeEntry = (value: ManifestEntry | string | null | undefined): ManifestEntry | null => {
	if (!value) return null;
	if (typeof value === "string") return { fileName: value };
	if (typeof value.fileName === "string") return value;
	return null;
};

const uniqueEntries = (entries: Array<ManifestEntry | string | null | undefined>): ManifestEntry[] => {
	const seen = new Set<string>();
	const result: ManifestEntry[] = [];
	for (const value of entries) {
		const entry = normalizeEntry(value);
		if (!entry) continue;
		const fileName = toPath(entry.fileName);
		if (seen.has(fileName)) continue;
		seen.add(fileName);
		result.push({ ...entry, fileName });
	}
	return result;
};

async function readManifest(): Promise<ChunkManifest | null> {
	try {
		// 读取 manifest
		// 读取失败时返回 null，让 SW 保留已有缓存策略。
		const resp = await fetch("/chunk-manifest.json", { cache: "no-store" });
		if (!resp.ok) return null;
		return await resp.json();
	} catch {
		return null;
	}
}

async function cacheEntries(entries: ManifestEntry[], cacheName: string): Promise<void> {
	const cache = await caches.open(cacheName);
	await Promise.all(
		entries.map(async (entry) => {
			try {
				const response = await fetch(entry.fileName);
				if (response.ok) await cache.put(entry.fileName, response);
			} catch {}
		}),
	);
}

export async function preCacheCore(): Promise<void> {
	const manifest = await readManifest();
	// 核心
	// 核心资源只覆盖首页和 app shell 的静态依赖，离线补齐交给 WARM_CACHE。
	const core = uniqueEntries([
		"/",
		"/manifest.json",
		"/chunk-manifest.json",
		...(manifest?.chunks?.core ?? []),
		...(manifest?.assets?.core ?? []),
	]);

	await cacheEntries(core, CACHE_STRATEGIES.CORE);
}

async function warmCacheImpl(options: {
	force?: boolean;
	concurrency?: number;
	notify?: (progress: WarmProgress) => void;
}): Promise<WarmCacheStatus> {
	const manifest = await readManifest();
	// warm 资源包含非首屏 chunk、workers、wasm/data、字体和图片，用小并发在后台补齐。
	const warm = uniqueEntries([
		...(manifest?.chunks?.warm ?? []),
		...(manifest?.assets?.warm ?? []),
		// Backward compatibility for older manifests generated before core/warm split.
		...(manifest?.assets?.images ?? []),
		...(manifest?.assets?.fonts ?? []),
		...(manifest?.assets?.others ?? []),
	]);

	warmStatus.inProgress = true;
	warmStatus.done = 0;
	warmStatus.total = warm.length;
	warmStatus.failed = 0;
	warmStatus.bytes = 0;
	warmStatus.lastUpdate = new Date().toISOString();

	const cache = await caches.open(CACHE_STRATEGIES.ASSETS);
	const concurrency = Math.max(1, options.concurrency ?? 4);
	let index = 0;

	// 资源分批
	// 用固定小并发下载 warm 资源，降低首次打开后的网络和内存峰值。
	// 进度由 SW 主动回传，设置页可展示后台缓存状态。
	const report = (current?: string) => {
		warmStatus.lastUpdate = new Date().toISOString();
		options.notify?.({
			done: warmStatus.done,
			total: warmStatus.total,
			current,
			bytes: warmStatus.bytes,
			failed: warmStatus.failed,
		});
	};

	const worker = async () => {
		while (index < warm.length) {
			const entry = warm[index++];
			if (!entry) continue;

			try {
				if (!options.force) {
					const cached = await cache.match(entry.fileName);
					if (cached) {
						warmStatus.done += 1;
						report(entry.fileName);
						continue;
					}
				}

				const response = await fetch(entry.fileName);
				if (response.ok) {
					await cache.put(entry.fileName, response.clone());
					warmStatus.bytes += entry.size ?? Number(response.headers.get("content-length") ?? 0);
				} else {
					warmStatus.failed += 1;
				}
			} catch {
				warmStatus.failed += 1;
			} finally {
				warmStatus.done += 1;
				report(entry.fileName);
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(concurrency, warm.length) }, () => worker()));
	warmStatus.inProgress = false;
	warmStatus.lastUpdate = new Date().toISOString();
	report();
	return { ...warmStatus };
}

export async function warmCacheAll(
	options: { force?: boolean; concurrency?: number; notify?: (progress: WarmProgress) => void } = {},
): Promise<WarmCacheStatus> {
	if (warmStatus.inProgress && activeWarmCache) {
		return activeWarmCache;
	}

	activeWarmCache = warmCacheImpl(options).finally(() => {
		activeWarmCache = undefined;
	});
	return activeWarmCache;
}

export async function preCacheAll(): Promise<void> {
	// 兼容旧调用：完整预缓存等价于先 core，再强制 warm。
	await preCacheCore();
	await warmCacheAll({ force: true });
}

export async function clearOldCaches(): Promise<void> {
	const names = await caches.keys();
	const keep = new Set<string>(Object.values(CACHE_STRATEGIES));
	for (const prefix of ["core-", "assets-", "data-", "pages-"]) {
		const previous = names
			.filter((name) => name.startsWith(prefix) && !keep.has(name))
			.sort()
			.at(-1);
		if (previous) keep.add(previous);
	}
	await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
}

export async function getCacheStatus(): Promise<CacheStatus> {
	const coreCache = await caches.open(CACHE_STRATEGIES.CORE);
	const assetsCache = await caches.open(CACHE_STRATEGIES.ASSETS);
	const coreKeys = await coreCache.keys();
	const assetsKeys = await assetsCache.keys();

	const status: CacheStatus = {
		core: coreKeys.length > 0,
		assets: new Map<string, boolean>(),
		data: new Map<string, boolean>(),
		pages: new Map<string, boolean>(),
		warm: { ...warmStatus },
		manifestVersion: "cached",
		lastUpdate: new Date().toISOString(),
	};
	const seen = new Set<string>();
	for (const k of assetsKeys) {
		const u = new URL(k.url);
		const pathname = u.pathname;
		if (seen.has(pathname)) continue;
		seen.add(pathname);
		const name = pathname.split("/").pop() || pathname;
		status.assets.set(name, true);
	}
	return status;
}

export async function cacheOrNetwork(event: FetchEvent, cacheName: string): Promise<Response> {
	const cached = await caches.match(event.request);
	if (cached) return cached;
	try {
		const r = await fetch(event.request);
		if (r.ok) {
			const cache = await caches.open(cacheName);
			await cache.put(event.request, r.clone());
		}
		return r;
	} catch (e) {
		const again = await caches.match(event.request);
		if (again) return again;
		throw e;
	}
}
