/**
 * core/version.ts - 版本检查器
 *
 * 职责：
 * - 拉取 chunk-manifest.json 并与上次记录对比
 * - 判定是否有新版本（buildTime/version/内容）
 * - 提供状态摘要与更新存档能力
 *
 * 说明：
 * - 使用 CacheStorage 存放一次简单的版本元数据，避免额外存储依赖
 */
export type VersionStatus = {
	isUpToDate: boolean;
	version?: string;
	buildTime?: number;
	releaseId?: string;
	assetVersion?: string;
	swVersion?: string;
};

type ReleaseManifest = {
	releaseId: string;
	assetVersion: string;
	swVersion: string;
	storeSchemaVersion: number;
	dbSchemaVersion: number;
	minCompatibleStoreSchemaVersion: number;
	minCompatibleDbSchemaVersion: number;
	generatedAt: string;
};

const metaEnv =
	typeof import.meta !== "undefined" ? (import.meta as ImportMeta & { env?: { MODE?: string } }).env : undefined;
const IS_DEV = metaEnv?.MODE === "development";

const RELEASE_URL = "/api/release";
const VERSION_CACHE = "version-meta";
const VERSION_KEY = "sw-version-meta";

async function fetchRelease(): Promise<ReleaseManifest | null> {
	// 开发模式下不请求 release API，避免 dev server 热更新期间把版本门禁视作生产更新。
	if (IS_DEV) return null;
	try {
		const resp = await fetch(`${RELEASE_URL}?t=${Date.now()}`, {
			cache: "no-store",
			headers: {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
			},
		});
		if (!resp.ok) return null;
		return await resp.json();
	} catch {
		return null;
	}
}

async function getStoredMeta(): Promise<Partial<ReleaseManifest> | null> {
	try {
		const cache = await caches.open(VERSION_CACHE);
		const res = await cache.match(VERSION_KEY);
		if (!res) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function putStoredMeta(meta: Partial<ReleaseManifest>): Promise<void> {
	const cache = await caches.open(VERSION_CACHE);
	await cache.put(VERSION_KEY, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
}

export async function checkVersionChange(): Promise<{ hasChanged: boolean }> {
	const release = await fetchRelease();
	if (!release) return { hasChanged: false };

	// 版本元数据只保留资源和 SW 边界；store/DB 迁移由页面和 PGlite Worker 执行。
	const current = {
		releaseId: release.releaseId,
		assetVersion: release.assetVersion,
		swVersion: release.swVersion,
		generatedAt: release.generatedAt,
	};
	const stored = await getStoredMeta();

	if (!stored) {
		await putStoredMeta(current);
		return { hasChanged: true };
	}

	const sameRelease =
		stored.releaseId === current.releaseId &&
		stored.assetVersion === current.assetVersion &&
		stored.swVersion === current.swVersion;
	if (sameRelease) return { hasChanged: false };

	await putStoredMeta(current);
	return { hasChanged: true };
}

export async function getVersionStatus(): Promise<VersionStatus> {
	const release = await fetchRelease();
	const stored = await getStoredMeta();
	if (!release) {
		return {
			isUpToDate: !!stored,
			version: stored?.releaseId,
			releaseId: stored?.releaseId,
			assetVersion: stored?.assetVersion,
			swVersion: stored?.swVersion,
		};
	}
	const same =
		stored &&
		stored.releaseId === release.releaseId &&
		stored.assetVersion === release.assetVersion &&
		stored.swVersion === release.swVersion;
	return {
		isUpToDate: !!same,
		version: release.releaseId,
		releaseId: release.releaseId,
		assetVersion: release.assetVersion,
		swVersion: release.swVersion,
	};
}

export async function updateStoredVersion(): Promise<void> {
	const release = await fetchRelease();
	if (release) {
		await putStoredMeta({
			releaseId: release.releaseId,
			assetVersion: release.assetVersion,
			swVersion: release.swVersion,
			generatedAt: release.generatedAt,
		});
	}
}
