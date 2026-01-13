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
};

const IS_DEV =
	typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env.MODE === "development";

const MANIFEST_URL = "/chunk-manifest.json";
const VERSION_CACHE = "version-meta";
const VERSION_KEY = "sw-version-meta";

async function fetchManifest(): Promise<any | null> {
	// 开发模式下不请求 chunk-manifest.json，避免 dev server 打印 404/not found
	if (IS_DEV) return null;
	try {
		const resp = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, {
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

async function getStoredMeta(): Promise<any | null> {
	try {
		const cache = await caches.open(VERSION_CACHE);
		const res = await cache.match(VERSION_KEY);
		if (!res) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function putStoredMeta(meta: any): Promise<void> {
	const cache = await caches.open(VERSION_CACHE);
	await cache.put(VERSION_KEY, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
}

export async function checkVersionChange(): Promise<{ hasChanged: boolean }> {
	const manifest = await fetchManifest();
	if (!manifest) return { hasChanged: false };

	// KISS：只比较 version/buildTime（避免把全量 manifest 存进 CacheStorage，减少内存与序列化开销）
	const current = { version: manifest.version, buildTime: manifest.buildTime };
	const stored = await getStoredMeta();

	if (!stored) {
		await putStoredMeta(current);
		return { hasChanged: true };
	}

	const sameBuild = stored.buildTime === current.buildTime;
	const sameVersion = stored.version === current.version;
	if (sameBuild && sameVersion) return { hasChanged: false };

	await putStoredMeta(current);
	return { hasChanged: true };
}

export async function getVersionStatus(): Promise<VersionStatus> {
	const manifest = await fetchManifest();
	const stored = await getStoredMeta();
	if (!manifest) {
		return { isUpToDate: !!stored, version: stored?.version, buildTime: stored?.buildTime };
	}
	const same = stored && stored.buildTime === manifest.buildTime && stored.version === manifest.version;
	return { isUpToDate: !!same, version: manifest.version, buildTime: manifest.buildTime };
}

export async function updateStoredVersion(): Promise<void> {
	const manifest = await fetchManifest();
	if (manifest) {
		await putStoredMeta({ version: manifest.version, buildTime: manifest.buildTime });
	}
}
