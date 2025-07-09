/// <reference lib="webworker" />

/**
 * 🚀 智能离线优先 Service Worker
 * 
 * 核心特性：
 * 1. 自动资源发现 - 通过manifest自动获取所有构建资源
 * 2. 智能缓存策略 - 根据资源类型和访问模式选择最优策略
 * 3. 版本感知更新 - 检测构建变化自动更新缓存
 * 4. 渐进式缓存 - 核心资源优先，其他资源按需缓存
 * 5. 离线优先 - 确保应用完全离线可用
 * 6. 开发模式友好 - 开发时不干扰热重载
 */

// 版本号 - 用于缓存版本控制
const VERSION = "2.0.0";

// === 修正开发模式判断逻辑 ===
// 仅在 Vite dev 时为 development，其余（build/本地生产/线上）均为 production
const IS_DEVELOPMENT_MODE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development');
const isDevelopmentMode = (): boolean => IS_DEVELOPMENT_MODE;

// 缓存策略配置
const CACHE_STRATEGIES = {
  CORE: "core-" + VERSION,        // 核心资源（HTML、manifest、关键JS）
  ASSETS: "assets-" + VERSION,    // 构建资源（JS、CSS、图片）
  DATA: "data-" + VERSION,        // 数据资源（API响应等）
  PAGES: "pages-" + VERSION,      // 页面缓存
} as const;

// 当前缓存的manifest内容（用于版本检测）
let currentManifestString: string | null = null;

// 消息类型定义
interface SWMessage {
  type: "CHECK_CACHE_VERSION" | "CACHE_STATUS_REQUEST" | "FORCE_UPDATE" | "CLEAR_CACHE";
  data?: any;
}

// 缓存状态类型
interface CacheStatus {
  core: boolean;
  assets: Map<string, boolean>;
  data: Map<string, boolean>;
  pages: Map<string, boolean>;
  manifestVersion?: string;
  lastUpdate?: string;
}

/**
 * 智能日志管理器
 */
class Logger {
  private static prefix = "🔧 SW";

  static info(message: string, data?: any): void {
    console.log(`${this.prefix} [INFO] ${message}`, data || "");
  }

  static warn(message: string, data?: any): void {
    console.warn(`${this.prefix} [WARN] ${message}`, data || "");
  }

  static error(message: string, error?: any): void {
    console.error(`${this.prefix} [ERROR] ${message}`, error || "");
  }

  static debug(message: string, data?: any): void {
    console.debug(`${this.prefix} [DEBUG] ${message}`, data || "");
  }

  static cache(message: string, data?: any): void {
    console.log(`${this.prefix} [CACHE] ${message}`, data || "");
  }

  static network(message: string, data?: any): void {
    console.log(`${this.prefix} [NETWORK] ${message}`, data || "");
  }

  // 简化网络日志
  static networkSmart(pathname: string, message: string, url?: string): void {
    let urlSummary = "";
    if (url) {
      urlSummary = `[url: ...${url.slice(-30)}]`;
    }
    console.log(`${this.prefix} [NETWORK] ${message} ${urlSummary}`);
  }
}

/**
 * 智能Chunk清单读取器
 */
class ChunkManifestReader {
  /**
   * 读取chunk清单并打印到控制台
   */
  static async loadChunkManifest(): Promise<{
    success: boolean;
    manifest?: any;
    error?: string;
  }> {
    Logger.info("开始读取chunk清单...");

    try {
      // 直接读取 chunk-manifest.json
      const manifestResp = await fetch('/chunk-manifest.json');
      if (!manifestResp.ok) {
        Logger.warn("无法获取chunk-manifest.json");
        return { success: false, error: "无法获取chunk清单" };
      }

      const manifest = await manifestResp.json();
      
      // 打印chunk清单信息到控制台
      Logger.info("📦 Chunk清单读取成功", {
        version: manifest.version,
        buildTime: manifest.buildTime,
        totalChunks: Object.keys(manifest.bundleInfo || {}).length
      });

      // 打印详细的chunk分类信息
      Logger.info("📊 Chunk分类统计:", {
        core: manifest.chunks?.core?.length || 0,
        routes: Object.keys(manifest.chunks?.routes || {}).length,
        features: Object.keys(manifest.chunks?.features || {}).length,
        workers: manifest.chunks?.workers?.length || 0,
        vendors: manifest.chunks?.vendors?.length || 0,
        assets: {
          images: manifest.assets?.images?.length || 0,
          fonts: manifest.assets?.fonts?.length || 0,
          others: manifest.assets?.others?.length || 0
        }
      });

      // 打印核心chunks
      if (manifest.chunks?.core?.length > 0) {
        Logger.info("🔧 核心Chunks:", manifest.chunks.core.map((chunk: any) => ({
          fileName: chunk.fileName,
          size: chunk.size,
          isEntry: chunk.isEntry
        })));
      }

      // 打印路由chunks
      if (manifest.chunks?.routes) {
        Logger.info("🛣️ 路由Chunks:");
        for (const [routeName, chunks] of Object.entries(manifest.chunks.routes)) {
          Logger.info(`  ${routeName}:`, (chunks as any[]).map((chunk: any) => chunk.fileName));
        }
      }

      // 打印功能chunks
      if (manifest.chunks?.features) {
        Logger.info("⚙️ 功能Chunks:");
        for (const [featureName, chunks] of Object.entries(manifest.chunks.features)) {
          Logger.info(`  ${featureName}:`, (chunks as any[]).map((chunk: any) => chunk.fileName));
        }
      }

      // 打印Worker chunks
      if (manifest.chunks?.workers?.length > 0) {
        Logger.info("👷 Worker Chunks:", manifest.chunks.workers.map((chunk: any) => chunk.fileName));
      }

      // 打印Vendor chunks
      if (manifest.chunks?.vendors?.length > 0) {
        Logger.info("📚 Vendor Chunks:", manifest.chunks.vendors.map((chunk: any) => chunk.fileName));
      }

      // 打印资源文件
      if (manifest.assets) {
        Logger.info("🎨 资源文件:", {
          images: manifest.assets.images?.slice(0, 5) || [], // 只显示前5个
          fonts: manifest.assets.fonts?.slice(0, 5) || [],
          others: manifest.assets.others?.slice(0, 5) || []
        });
      }

      // 打印完整的bundle信息（用于调试）
      Logger.info("📋 完整Bundle信息:", manifest.bundleInfo);

      return { success: true, manifest };
    } catch (error) {
      Logger.error("读取chunk清单失败:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 检查chunk清单版本变化
   */
  static async checkChunkManifestVersion(): Promise<{
    hasChanged: boolean;
    manifest?: any;
  }> {
    try {
      const manifestResp = await fetch('/chunk-manifest.json');
      if (!manifestResp.ok) {
        return { hasChanged: false };
      }

      const manifest = await manifestResp.json();
      const manifestString = JSON.stringify(manifest);
      
      if (currentManifestString !== manifestString) {
        Logger.info("检测到chunk清单版本变化", {
          oldVersion: currentManifestString ? "已缓存" : "无缓存",
          newVersion: manifest.buildTime || "未知",
        });
        return { hasChanged: true, manifest };
      }

      return { hasChanged: false, manifest };
    } catch (error) {
      Logger.warn("检查chunk清单版本失败:", error);
      return { hasChanged: false };
    }
  }
}

/**
 * 智能缓存管理器
 */
class CacheManager {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 智能缓存所有资源
   */
  async cacheAllResources(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过缓存所有资源（开发模式）");
      return;
    }
    Logger.info("开始智能缓存所有资源...");

    try {
      // 读取chunk清单
      const { success, manifest } = await ChunkManifestReader.loadChunkManifest();
      
      if (success && manifest) {
        // 更新manifest版本
        currentManifestString = JSON.stringify(manifest);
        Logger.info("Chunk清单已加载，准备缓存资源");

        // 缓存核心资源（HTML、manifest、关键JS）
        const coreResources: string[] = [];
        if (manifest.chunks?.core) {
          coreResources.push(...manifest.chunks.core.map((chunk: any) => `/${chunk.fileName}`));
        }
        // 添加基础资源
        coreResources.push('/', '/manifest.json');

        // 强制缓存 manifest 文件
        // 只缓存 chunk-manifest.json
        try {
          const manifestPath = '/chunk-manifest.json';
          const resp = await fetch(manifestPath);
          if (resp.ok) {
            coreResources.push(manifestPath);
            Logger.info(`已加入核心缓存: ${manifestPath}`);
          } else {
            Logger.warn(`manifest文件未找到: ${manifestPath}`);
          }
        } catch (e) {
          Logger.warn(`manifest文件请求异常: /chunk-manifest.json`, e);
        }

        await this.cacheCoreResources(coreResources);

        // 缓存静态资源（图片、字体、其他资源）
        const assetResources: string[] = [];
        if (manifest.assets) {
          if (manifest.assets.images) {
            assetResources.push(...manifest.assets.images.map((asset: any) => `/${asset.fileName}`));
          }
          if (manifest.assets.fonts) {
            assetResources.push(...manifest.assets.fonts.map((asset: any) => `/${asset.fileName}`));
          }
          if (manifest.assets.others) {
            assetResources.push(...manifest.assets.others.map((asset: any) => `/${asset.fileName}`));
          }
        }
        await this.cacheAssetResources(assetResources);

        Logger.info("分层缓存完成", {
          core: coreResources.length,
          assets: assetResources.length
        });
      } else {
        Logger.warn("无法加载chunk清单，跳过缓存");
      }

      Logger.info("智能缓存完成");
    } catch (error) {
      Logger.error("智能缓存失败:", error);
      throw error;
    }
  }

  /**
   * 缓存核心资源
   */
  private async cacheCoreResources(resources: string[]): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过核心资源缓存（开发模式）");
      return;
    }
    if (resources.length === 0) {
      Logger.warn("没有发现核心资源");
      return;
    }

    Logger.info(`开始缓存 ${resources.length} 个核心资源...`);

    try {
      const cache = await caches.open(CACHE_STRATEGIES.CORE);
      const cachedResources: string[] = [];
      const failedResources: string[] = [];

      for (const resource of resources) {
        try {
          const response = await fetch(resource);
          if (response.ok) {
            await cache.put(resource, response);
            cachedResources.push(resource);
            Logger.cache(`核心资源缓存成功: ${resource}`);
          } else {
            failedResources.push(resource);
            Logger.warn(`核心资源缓存失败: ${resource}`, { status: response.status });
          }
        } catch (error) {
          failedResources.push(resource);
          Logger.error(`核心资源缓存异常: ${resource}`, error);
        }
      }

      Logger.cache("核心资源缓存完成", {
        success: cachedResources.length,
        failed: failedResources.length,
        total: resources.length,
      });
    } catch (error) {
      Logger.error("核心资源缓存失败:", error);
    }
  }

  /**
   * 缓存构建资源
   */
  private async cacheAssetResources(resources: string[]): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过构建资源缓存（开发模式）");
      return;
    }
    if (resources.length === 0) {
      Logger.warn("没有发现构建资源");
      return;
    }

    Logger.info(`开始缓存 ${resources.length} 个构建资源...`);

    try {
      const cache = await caches.open(CACHE_STRATEGIES.ASSETS);
      const cachedResources: string[] = [];
      const failedResources: string[] = [];

      // 分批缓存，避免一次性请求过多
      const batchSize = 10;
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (resource) => {
            try {
              const response = await fetch(resource);
          if (response.ok) {
                await cache.put(resource, response);
                cachedResources.push(resource);
                Logger.debug(`构建资源缓存成功: ${resource}`);
          } else {
                failedResources.push(resource);
                Logger.warn(`构建资源缓存失败: ${resource}`, { status: response.status });
          }
        } catch (error) {
              failedResources.push(resource);
              Logger.error(`构建资源缓存异常: ${resource}`, error);
            }
          })
        );

        // 批次间短暂延迟，避免阻塞
        if (i + batchSize < resources.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      Logger.cache("构建资源缓存完成", {
        success: cachedResources.length,
        failed: failedResources.length,
        total: resources.length,
      });
    } catch (error) {
      Logger.error("构建资源缓存失败:", error);
    }
  }

  /**
   * 检查并更新缓存
   */
  async checkAndUpdateCache(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过缓存版本检查（开发模式）");
      return;
    }
    Logger.info("检查缓存版本...");

    const { hasChanged, manifest } = await ChunkManifestReader.checkChunkManifestVersion();
    
    if (hasChanged) {
      Logger.info("检测到版本变化，开始更新缓存...");

      // 更新当前manifest版本
      if (manifest) {
        currentManifestString = JSON.stringify(manifest);
        Logger.info("Manifest版本已更新", {
          buildTime: manifest.buildTime,
          version: manifest.version
        });
      }
      
      // 清理旧缓存
      await this.clearOldCaches();
      
      // 重新缓存所有资源
      await this.cacheAllResources();
      
      Logger.info("缓存更新完成");
    } else {
      Logger.info("缓存版本一致，无需更新");
    }
  }

  /**
   * 清理旧缓存
   */
  public async clearOldCaches(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过清理旧缓存（开发模式）");
      return;
    }
    try {

      // 清理旧版本缓存
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter((name) => !Object.values(CACHE_STRATEGIES).includes(name as any));

      if (oldCaches.length > 0) {
        Logger.info(`清理 ${oldCaches.length} 个旧版本缓存:`, oldCaches);
        await Promise.all(oldCaches.map((name) => caches.delete(name)));
      }

      // 基于manifest清理过期资源
      if (currentManifestString) {
        const manifest = JSON.parse(currentManifestString);
        const validResources = new Set<string>();

        // 收集所有有效的资源路径
        if (manifest.chunks?.core) {
          manifest.chunks.core.forEach((chunk: any) => validResources.add(`/${chunk.fileName}`));
        }
        if (manifest.chunks?.routes) {
          Object.values(manifest.chunks.routes).forEach((chunks: any) => {
            chunks.forEach((chunk: any) => validResources.add(`/${chunk.fileName}`));
          });
        }
        if (manifest.chunks?.features) {
          Object.values(manifest.chunks.features).forEach((chunks: any) => {
            chunks.forEach((chunk: any) => validResources.add(`/${chunk.fileName}`));
          });
        }
        if (manifest.chunks?.vendors) {
          manifest.chunks.vendors.forEach((chunk: any) => validResources.add(`/${chunk.fileName}`));
        }
        if (manifest.chunks?.workers) {
          manifest.chunks.workers.forEach((chunk: any) => validResources.add(`/${chunk.fileName}`));
        }
        if (manifest.assets) {
          if (manifest.assets.images) {
            manifest.assets.images.forEach((asset: any) => validResources.add(`/${asset.fileName}`));
          }
          if (manifest.assets.fonts) {
            manifest.assets.fonts.forEach((asset: any) => validResources.add(`/${asset.fileName}`));
          }
          if (manifest.assets.others) {
            manifest.assets.others.forEach((asset: any) => validResources.add(`/${asset.fileName}`));
          }
        }

        // 清理不在manifest中的缓存资源
        for (const cacheName of Object.values(CACHE_STRATEGIES)) {
          const cache = await caches.open(cacheName as string);
          const keys = await cache.keys();
          
          for (const request of keys) {
            const url = new URL(request.url);
            const pathname = url.pathname;
            
            if (!validResources.has(pathname) && !this.isSpecialResource(pathname)) {
              await cache.delete(request);
              Logger.debug(`清理过期资源: ${pathname}`);
            }
          }
        }

        Logger.info("基于manifest的缓存清理完成", {
          validResources: validResources.size
        });
      }
    } catch (error) {
      Logger.error("清理旧缓存失败:", error);
    }
  }

  /**
   * 判断是否为特殊资源（不在manifest中但需要保留）
   */
  private isSpecialResource(pathname: string): boolean {
    const specialPatterns = [
      '/',
      '/manifest.json',
      '/icons/',
      '/favicon.ico'
    ];
    return specialPatterns.some(pattern => pathname.includes(pattern));
  }

  /**
   * 获取缓存状态
   */
  async getCacheStatus(): Promise<CacheStatus> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过缓存状态获取（开发模式）");
      return {
        core: false,
        assets: new Map<string, boolean>(),
        data: new Map<string, boolean>(),
        pages: new Map<string, boolean>(),
        manifestVersion: "开发模式",
        lastUpdate: new Date().toISOString(),
      };
    }
    Logger.debug("获取缓存状态...");

    const status: CacheStatus = {
      core: false,
      assets: new Map<string, boolean>(),
      data: new Map<string, boolean>(),
      pages: new Map<string, boolean>(),
      manifestVersion: currentManifestString ? "已缓存" : "无缓存",
      lastUpdate: new Date().toISOString(),
    };

    try {
      // 检查核心缓存
      const coreCache = await caches.open(CACHE_STRATEGIES.CORE);
      const coreKeys = await coreCache.keys();
      status.core = coreKeys.length > 0;

      // 检查资源缓存
      const assetCache = await caches.open(CACHE_STRATEGIES.ASSETS);
      const assetKeys = await assetCache.keys();
      for (const key of assetKeys) {
        const assetName = key.url.split("/").pop() || key.url;
        status.assets.set(assetName, true);
      }

      Logger.info("缓存状态获取完成", status);
      return status;
    } catch (error) {
      Logger.error("获取缓存状态失败:", error);
      return status;
    }
  }
}

/**
 * 智能请求拦截器
 */
class RequestInterceptor {
  private cacheManager = CacheManager.getInstance();

  /**
   * 处理 fetch 请求
   */
  async handleFetch(event: FetchEvent): Promise<void> {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // 开发模式下不拦截请求
    if (isDevelopmentMode()) {
      return;
    }

    // 只处理同源GET请求
    if (url.origin !== location.origin || event.request.method !== "GET") {
      return;
    }

    // manifest 文件缓存优先
    if (pathname === "/chunk-manifest.json") {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_STRATEGIES.CORE);
          const cached = await cache.match(event.request);
          if (cached) {
            Logger.cache(`离线命中 manifest: ${pathname}`);
            return cached;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              await cache.put(event.request, networkResponse.clone());
              Logger.cache(`网络缓存 manifest: ${pathname}`);
            }
            return networkResponse;
          } catch (error) {
            Logger.warn(`manifest 离线且无缓存: ${pathname}`);
            return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        })()
      );
      return;
    }

    // 主文档缓存优先
    if (pathname === "/" || pathname === "/index.html") {
      event.respondWith(
        caches.match(event.request).then(async (response) => {
          if (response) {
            Logger.cache(`离线命中主文档: ${pathname}`);
            return response;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              const cache = await caches.open(CACHE_STRATEGIES.CORE);
              await cache.put(event.request, networkResponse.clone());
              Logger.cache(`网络缓存主文档: ${pathname}`);
            }
            return networkResponse;
          } catch (error) {
            Logger.warn(`主文档离线且无缓存: ${pathname}`);
            return new Response('<!DOCTYPE html><title>离线</title><h1>离线不可用</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } });
          }
        })
      );
      return;
    }

    // 检查是否为manifest中的chunk，如果是则动态缓存
    await this.checkAndCacheManifestChunk(event, pathname);

    // 根据资源类型选择缓存策略
    let strategy = "网络优先";
    let cacheResult = "";

    if (this.isCoreResource(pathname)) {
      strategy = "核心资源缓存优先";
      cacheResult = await this.cacheOrNetwork(event, CACHE_STRATEGIES.CORE);
    } else if (this.isAssetResource(pathname)) {
      strategy = "构建资源缓存优先";
      cacheResult = await this.cacheOrNetwork(event, CACHE_STRATEGIES.ASSETS);
    } else if (this.isPageResource(pathname)) {
      strategy = "页面缓存优先";
      cacheResult = await this.cacheOrNetwork(event, CACHE_STRATEGIES.PAGES);
    } else {
      // 其他资源使用网络优先
      event.respondWith(fetch(event.request));
    }

    // 只在缓存命中时记录请求处理
    if (cacheResult && cacheResult.includes("缓存命中")) {
    const shortPath = this.getShortPath(pathname);
    Logger.networkSmart(
      pathname,
        `${event.request.method} ${shortPath} -> ${strategy} (${cacheResult})`,
      event.request.url,
    );
    }
  }

  /**
   * 检查并缓存manifest中的chunk
   */
  private async checkAndCacheManifestChunk(event: FetchEvent, pathname: string): Promise<void> {
    if (!currentManifestString) {
      return;
    }

    try {
      const manifest = JSON.parse(currentManifestString);
      let chunkInfo: any = null;
      let chunkType = '';

      // 检查是否为route chunk
      if (manifest.chunks?.routes) {
        for (const [routeName, chunks] of Object.entries(manifest.chunks.routes)) {
          const found = (chunks as any[]).find((chunk: any) => `/${chunk.fileName}` === pathname);
          if (found) {
            chunkInfo = found;
            chunkType = `route:${routeName}`;
            break;
          }
        }
      }

      // 检查是否为feature chunk
      if (!chunkInfo && manifest.chunks?.features) {
        for (const [featureName, chunks] of Object.entries(manifest.chunks.features)) {
          const found = (chunks as any[]).find((chunk: any) => `/${chunk.fileName}` === pathname);
          if (found) {
            chunkInfo = found;
            chunkType = `feature:${featureName}`;
            break;
          }
        }
      }

      // 检查是否为vendor chunk
      if (!chunkInfo && manifest.chunks?.vendors) {
        const found = manifest.chunks.vendors.find((chunk: any) => `/${chunk.fileName}` === pathname);
        if (found) {
          chunkInfo = found;
          chunkType = 'vendor';
        }
      }

      // 检查是否为worker chunk
      if (!chunkInfo && manifest.chunks?.workers) {
        const found = manifest.chunks.workers.find((chunk: any) => `/${chunk.fileName}` === pathname);
        if (found) {
          chunkInfo = found;
          chunkType = 'worker';
        }
      }

      // 如果是manifest中的chunk，动态缓存
      if (chunkInfo) {
        Logger.debug(`发现manifest chunk: ${chunkType} - ${chunkInfo.fileName}`);
        
        // 检查是否已缓存
        const cache = await caches.open(CACHE_STRATEGIES.ASSETS);
        const cachedResponse = await cache.match(event.request);
        
        if (!cachedResponse) {
          // 动态缓存chunk
          try {
            const response = await fetch(event.request);
            if (response.ok) {
              await cache.put(event.request, response.clone());
              Logger.cache(`动态缓存 ${chunkType} chunk: ${chunkInfo.fileName}`);
            }
          } catch (error) {
            Logger.warn(`动态缓存 ${chunkType} chunk失败: ${chunkInfo.fileName}`, error);
          }
        }
      }
    } catch (error) {
      Logger.warn("检查manifest chunk失败:", error);
    }
  }

  /**
   * 判断是否为核心资源
   */
  private isCoreResource(pathname: string): boolean {
    const corePatterns = [
      "/",
      "/manifest.json",
      "/icons/",
    ];
    return corePatterns.some((pattern) => pathname.includes(pattern));
  }

  /**
   * 判断是否为构建资源
   */
  private isAssetResource(pathname: string): boolean {
    const assetPatterns = [
      "/_build/assets/",
      ".js",
      ".css",
      ".ico",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".woff",
      ".woff2",
      ".ttf",
    ];
    return assetPatterns.some((pattern) => pathname.includes(pattern));
  }

  /**
   * 判断是否为页面资源
   */
  private isPageResource(pathname: string): boolean {
    // 页面路由：不包含文件扩展名且不是API路径
    return !pathname.includes('.') && !pathname.startsWith('/api/') && pathname !== '/';
  }

  /**
   * 获取简化的路径显示
   */
  private getShortPath(pathname: string): string {
    if (pathname.startsWith("/_build/")) {
      pathname = pathname.substring(8);
    }
    if (pathname.includes("node_modules/")) {
      const parts = pathname.split("node_modules/");
      if (parts.length > 1) {
        const packagePath = parts[1];
        const packageMatch = packagePath.match(/^([^/]+)\/(.+)$/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          const fileName = packageMatch[2].split("/").pop() || "";
          return `📦 ${packageName}/${fileName}`;
        }
      }
    }
    if (pathname.startsWith("src/")) {
      return `📁 ${pathname}`;
    }
    if (pathname.startsWith("db/")) {
      return `🗄️ ${pathname}`;
    }
    return pathname;
  }

  /**
   * 缓存优先策略
   */
  private async cacheOrNetwork(event: FetchEvent, cacheStrategy: string): Promise<string> {
    if (isDevelopmentMode()) {
      return "开发模式跳过缓存";
    }
    let cacheResult = "";

    event.respondWith(
      caches.match(event.request).then(async (response) => {
        if (response) {
          cacheResult = "缓存命中";
          return response;
        }

        cacheResult = "缓存未命中，从网络获取";

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            const cache = await caches.open(cacheStrategy);
            await cache.put(event.request, networkResponse.clone());
            cacheResult = "已缓存网络响应";
          }
          return networkResponse;
        } catch (error) {
          Logger.warn("网络请求失败，尝试从缓存获取", { url: event.request.url, error });
          
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            cacheResult = "从缓存获取成功";
            return cachedResponse;
          }
          
          Logger.error("网络和缓存都不可用", { url: event.request.url });
          throw error;
        }
      }),
    );

    return cacheResult;
  }
}

/**
 * 消息处理器
 */
class MessageHandler {
  private cacheManager = CacheManager.getInstance();

  /**
   * 处理来自客户端的消息
   */
  async handleMessage(event: ExtendableMessageEvent): Promise<void> {
    const message: SWMessage = event.data;

    Logger.info("收到客户端消息:", message);

    switch (message.type) {
      case "CHECK_CACHE_VERSION":
        Logger.info("检查缓存版本指令");
        event.waitUntil(this.handleCheckCacheVersion());
        break;

      case "CACHE_STATUS_REQUEST":
        Logger.info("缓存状态请求");
        event.waitUntil(this.handleCacheStatusRequest(event));
        break;

      case "FORCE_UPDATE":
        Logger.info("强制更新缓存指令");
        event.waitUntil(this.handleForceUpdate());
        break;

      case "CLEAR_CACHE":
        Logger.info("清理缓存指令");
        event.waitUntil(this.handleClearCache());
        break;

      default:
        Logger.warn("未知消息类型:", message.type);
    }
  }

  /**
   * 处理缓存版本检查
   */
  private async handleCheckCacheVersion(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过缓存版本检查（开发模式）");
      return;
    }
    try {
      await this.cacheManager.checkAndUpdateCache();
      this.notifyClients("CACHE_UPDATED", { timestamp: new Date().toISOString() });
    } catch (error) {
      Logger.error("缓存版本检查失败:", error);
    }
  }

  /**
   * 处理缓存状态请求
   */
  private async handleCacheStatusRequest(event: ExtendableMessageEvent): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过缓存状态请求（开发模式）");
      return;
    }
    try {
      const status = await this.cacheManager.getCacheStatus();
      this.notifyClient(event.source, "CACHE_STATUS", status);
    } catch (error) {
      Logger.error("获取缓存状态失败:", error);
    }
  }

  /**
   * 处理强制更新
   */
  private async handleForceUpdate(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过强制更新（开发模式）");
      return;
    }
    try {
      await this.cacheManager.cacheAllResources();
      this.notifyClients("FORCE_UPDATE_COMPLETED", { timestamp: new Date().toISOString() });
    } catch (error) {
      Logger.error("强制更新失败:", error);
    }
  }

  /**
   * 处理清理缓存
   */
  private async handleClearCache(): Promise<void> {
    if (isDevelopmentMode()) {
      Logger.info("[DEV] 跳过清理缓存（开发模式）");
      return;
    }
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      currentManifestString = null;
      this.notifyClients("CACHE_CLEARED", { timestamp: new Date().toISOString() });
    } catch (error) {
      Logger.error("清理缓存失败:", error);
    }
  }

  /**
   * 通知所有客户端
   */
  private notifyClients(type: string, data: any): void {
    (self as any).clients
      .matchAll()
      .then((clients: readonly Client[]) => {
        clients.forEach((client: Client) => {
          if (client && "postMessage" in client) {
            (client as any).postMessage({ type, data });
          }
        });
      })
      .catch((error: any) => {
        Logger.error("通知客户端失败:", error);
      });
  }

  /**
   * 通知特定客户端
   */
  private notifyClient(client: any, type: string, data: any): void {
    if (client && "postMessage" in client) {
      client.postMessage({ type, data });
    }
  }
}

/**
 * 🚀 Service Worker 主逻辑
 */
(async (worker: ServiceWorkerGlobalScope) => {
  Logger.info("🚀 智能离线优先 Service Worker 启动");
  
  // 确定运行模式
  // IS_DEVELOPMENT_MODE = determineDevelopmentMode(); // This line is removed as per the new_code
  Logger.info(`🔧 运行模式: ${IS_DEVELOPMENT_MODE ? "开发模式" : "生产模式"}`);

  const cacheManager = CacheManager.getInstance();
  const requestInterceptor = new RequestInterceptor();
  const messageHandler = new MessageHandler();

  // 安装事件 - 智能缓存资源
  worker.addEventListener("install", (event) => {
    Logger.info("📦 Service Worker 安装中...");
    event.waitUntil(
      (async () => {
        try {
          if (isDevelopmentMode()) {
            Logger.info("🔧 开发模式：跳过资源缓存，保持热重载能力");
            await worker.skipWaiting();
            Logger.info("✅ Service Worker 安装完成（开发模式）");
            return;
          }

          // 智能缓存所有资源
          await cacheManager.cacheAllResources();
          await worker.skipWaiting();
          Logger.info("✅ Service Worker 安装完成");
        } catch (error) {
          Logger.error("❌ Service Worker 安装失败:", error);
        }
      })(),
    );
  });

  // 激活事件 - 清理旧缓存，接管客户端
  worker.addEventListener("activate", (event) => {
    Logger.info("🔄 Service Worker 激活中...");
    event.waitUntil(
      (async () => {
        try {
          if (isDevelopmentMode()) {
            Logger.info("🔧 开发模式：跳过缓存清理");
            await worker.clients.claim();
            Logger.info("✅ Service Worker 激活完成（开发模式）");
            return;
          }

          // 清理旧缓存
          await cacheManager.clearOldCaches();
          await worker.clients.claim();
          Logger.info("✅ Service Worker 激活完成，已接管所有客户端");
        } catch (error) {
          Logger.error("❌ Service Worker 激活失败:", error);
        }
      })(),
    );
  });

  // 请求拦截 - 智能缓存策略
  worker.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    if (isDevelopmentMode()) {
      // 开发模式下不拦截请求，也不打印日志
      return;
    }

    // 只处理同源GET请求
    if (url.origin !== location.origin || event.request.method !== "GET") {
      return;
    }

    // manifest 文件缓存优先
    if (url.pathname === "/chunk-manifest.json") {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_STRATEGIES.CORE);
          const cached = await cache.match(event.request);
          if (cached) {
            Logger.cache(`离线命中 manifest: ${url.pathname}`);
            return cached;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              await cache.put(event.request, networkResponse.clone());
              Logger.cache(`网络缓存 manifest: ${url.pathname}`);
            }
            return networkResponse;
          } catch (error) {
            Logger.warn(`manifest 离线且无缓存: ${url.pathname}`);
            return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        })()
      );
      return;
    }

    // 主文档缓存优先
    if (url.pathname === "/" || url.pathname === "/index.html") {
      event.respondWith(
        caches.match(event.request).then(async (response) => {
          if (response) {
            Logger.cache(`离线命中主文档: ${url.pathname}`);
            return response;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              const cache = await caches.open(CACHE_STRATEGIES.CORE);
              await cache.put(event.request, networkResponse.clone());
              Logger.cache(`网络缓存主文档: ${url.pathname}`);
            }
            return networkResponse;
          } catch (error) {
            Logger.warn(`主文档离线且无缓存: ${url.pathname}`);
            return new Response('<!DOCTYPE html><title>离线</title><h1>离线不可用</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } });
          }
        })
      );
      return;
    }

    // 页面路由兜底（App Shell）
    if (!url.pathname.includes('.') && !url.pathname.startsWith('/api/') && url.pathname !== '/') {
      event.respondWith(
        caches.match('/').then((response) => {
          if (response) {
            Logger.cache(`App Shell 离线命中: /`);
            return response;
          } else {
            Logger.warn(`App Shell 离线未命中: /`);
            return fetch(event.request);
          }
        })
      );
      return;
    }

    // 其他资源类型走原有逻辑
    requestInterceptor.handleFetch(event);
  });

  // 消息处理 - 与客户端通信
  worker.addEventListener("message", (event) => {
    messageHandler.handleMessage(event);
  });

  // 错误处理
  worker.addEventListener("error", (event) => {
    Logger.error("❌ Service Worker 错误:", event.error);
  });

  // 未处理的 Promise 拒绝
  worker.addEventListener("unhandledrejection", (event) => {
    Logger.error("❌ 未处理的 Promise 拒绝:", event.reason);
  });

  Logger.info("🎉 智能离线优先 Service Worker 初始化完成，等待事件...");
})(self as any);