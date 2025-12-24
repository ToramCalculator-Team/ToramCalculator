/**
 * core/cache.ts - 缓存管理
 *
 * 职责：
 * - 基于 manifest 预缓存核心与静态资源
 * - 清理旧版本缓存
 * - 提供 cache-first 策略与缓存状态
 */
import { CACHE_STRATEGIES } from '../config';

export type CacheStatus = {
  core: boolean;
  assets: Map<string, boolean>;
  data: Map<string, boolean>;
  pages: Map<string, boolean>;
  manifestVersion?: string;
  lastUpdate?: string;
};

export async function preCacheAll(): Promise<void> {
  // 读取 manifest
  const resp = await fetch('/chunk-manifest.json');
  if (!resp.ok) return;
  const manifest = await resp.json();

  const core: string[] = ['/','/manifest.json','/chunk-manifest.json'];
  const normalizeEntry = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v.fileName === 'string') return v.fileName;
    return null;
  };

  if (manifest?.chunks?.core) {
    core.push(
      ...manifest.chunks.core
        .map((c: any) => normalizeEntry(c))
        .filter((x: any): x is string => typeof x === 'string')
        .map((fileName: string) => `/${fileName}`),
    );
  }

  const assets: string[] = [];
  if (manifest?.assets?.images) {
    assets.push(
      ...manifest.assets.images
        .map((a: any) => normalizeEntry(a))
        .filter((x: any): x is string => typeof x === 'string')
        .map((fileName: string) => `/${fileName}`),
    );
  }
  if (manifest?.assets?.fonts) {
    assets.push(
      ...manifest.assets.fonts
        .map((a: any) => normalizeEntry(a))
        .filter((x: any): x is string => typeof x === 'string')
        .map((fileName: string) => `/${fileName}`),
    );
  }
  if (manifest?.assets?.others) {
    assets.push(
      ...manifest.assets.others
        .map((a: any) => normalizeEntry(a))
        .filter((x: any): x is string => typeof x === 'string')
        .map((fileName: string) => `/${fileName}`),
    );
  }

  // 核心
  const coreCache = await caches.open(CACHE_STRATEGIES.CORE);
  await Promise.all(core.map(async (u) => {
    try {
      const r = await fetch(u);
      if (r.ok) await coreCache.put(u, r);
    } catch {}
  }));

  // 资源分批
  const assetsCache = await caches.open(CACHE_STRATEGIES.ASSETS);
  const batch = 10;
  for (let i=0;i<assets.length;i+=batch) {
    const part = assets.slice(i,i+batch);
    await Promise.all(part.map(async (u) => {
      try {
        const r = await fetch(u);
        if (r.ok) await assetsCache.put(u, r);
      } catch {}
    }));
  }
}

export async function clearOldCaches(): Promise<void> {
  const names = await caches.keys();
  const keep = new Set(Object.values(CACHE_STRATEGIES));
  await Promise.all(names.filter(n => !keep.has(n as any)).map(n => caches.delete(n)));
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
    manifestVersion: 'cached',
    lastUpdate: new Date().toISOString()
  };
  const seen = new Set<string>();
  for (const k of assetsKeys) {
    const u = new URL(k.url);
    const pathname = u.pathname;
    if (seen.has(pathname)) continue;
    seen.add(pathname);
    const name = pathname.split('/').pop() || pathname;
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
