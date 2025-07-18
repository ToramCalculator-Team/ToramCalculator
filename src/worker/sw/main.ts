/**
 * main.ts - Service Worker 主入口
 *
 * 用途：
 *   - 负责 Service Worker 的生命周期管理、事件监听、缓存/网络/消息等底层实现
 *   - 不直接依赖 Comlink/XState，仅通过注入/事件与状态机、API 解耦
 *   - 依赖统一 logger/config/types，保证结构清晰、可维护、可扩展
 *
 * 用法：
 *   由浏览器自动注册为 service worker，主线程通过 postMessage/Comlink 与其通信
 *
 * 依赖：
 *   - @/utils/logger
 *   - @/worker/sw/config
 *   - @/worker/sw/types
 *
 * 维护：架构师/全栈/工具开发
 */


import { VERSION, PERIODIC_CHECK_CONFIG, CACHE_STRATEGIES } from './config';
import type { SWMessage, CacheStatus } from './types';

// === 修正开发模式判断逻辑 ===
// 仅在 Vite dev 时为 development，其余（build/本地生产/线上）均为 production
const IS_DEVELOPMENT_MODE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'development');
const isDevelopmentMode = (): boolean => IS_DEVELOPMENT_MODE;



// 定期检查相关状态
let periodicCheckTimer: ReturnType<typeof setTimeout> | null = null;
let lastCheckTime: number = 0;
let consecutiveFailures: number = 0;
let currentCheckInterval: number = PERIODIC_CHECK_CONFIG.INTERVAL;

/**
 * 智能Chunk清单读取器
 * 
 * 职责：
 *   - 读取和解析 chunk-manifest.json 文件
 *   - 提供详细的 chunk 分类统计信息
 *   - 检测 manifest 版本变化
 * 
 * 设计原则：
 *   - 单一职责：只负责 manifest 读取和解析
 *   - 错误处理：完善的错误捕获和日志记录
 *   - 调试友好：提供详细的分类统计信息
 */
class ChunkManifestReader {
  /**
   * 读取chunk清单并打印到控制台
   * 
   * @returns Promise<{success: boolean, manifest?: any, error?: string}>
   *   - success: 是否成功读取
   *   - manifest: 解析后的清单对象（成功时）
   *   - error: 错误信息（失败时）
   * 
   * @example
   *   const { success, manifest, error } = await ChunkManifestReader.loadChunkManifest();
   *   if (success) {
   *     console.log('Manifest loaded:', manifest);
   *   } else {
   *     console.error('Failed to load manifest:', error);
   *   }
   */
  static async loadChunkManifest(): Promise<{
    success: boolean;
    manifest?: any;
    error?: string;
  }> {
    console.log("开始读取chunk清单...");

    try {
      // 直接读取 chunk-manifest.json
      const manifestResp = await fetch('/chunk-manifest.json');
      if (!manifestResp.ok) {
        console.warn("无法获取chunk-manifest.json");
        return { success: false, error: "无法获取chunk清单" };
      }

      const manifest = await manifestResp.json();
      
      // 打印chunk清单信息到控制台
      console.log("📦 Chunk清单读取成功", {
        version: manifest.version,
        buildTime: manifest.buildTime,
        totalChunks: Object.keys(manifest.bundleInfo || {}).length
      });

      // 打印详细的chunk分类信息
      console.log("📊 Chunk分类统计:", {
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
        console.log("🔧 核心Chunks:", manifest.chunks.core.map((chunk: any) => ({
          fileName: chunk.fileName,
          size: chunk.size,
          isEntry: chunk.isEntry
        })));
      }

      // 打印路由chunks
      if (manifest.chunks?.routes) {
        console.log("🛣️ 路由Chunks:");
        for (const [routeName, chunks] of Object.entries(manifest.chunks.routes)) {
          console.log(`  ${routeName}:`, (chunks as any[]).map((chunk: any) => chunk.fileName));
        }
      }

      // 打印功能chunks
      if (manifest.chunks?.features) {
        console.log("⚙️ 功能Chunks:");
        for (const [featureName, chunks] of Object.entries(manifest.chunks.features)) {
          console.log(`  ${featureName}:`, (chunks as any[]).map((chunk: any) => chunk.fileName));
        }
      }

      // 打印Worker chunks
      if (manifest.chunks?.workers?.length > 0) {
        console.log("👷 Worker Chunks:", manifest.chunks.workers.map((chunk: any) => chunk.fileName));
      }

      // 打印Vendor chunks
      if (manifest.chunks?.vendors?.length > 0) {
        console.log("📚 Vendor Chunks:", manifest.chunks.vendors.map((chunk: any) => chunk.fileName));
      }

      // 打印资源文件
      if (manifest.assets) {
        console.log("🎨 资源文件:", {
          images: manifest.assets.images?.slice(0, 5) || [], // 只显示前5个
          fonts: manifest.assets.fonts?.slice(0, 5) || [],
          others: manifest.assets.others?.slice(0, 5) || []
        });
      }

      // 打印完整的bundle信息（用于调试）
      console.log("📋 完整Bundle信息:", manifest.bundleInfo);

      return { success: true, manifest };
    } catch (error) {
      console.error("读取chunk清单失败:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 检查chunk清单版本变化
   * 
   * @returns Promise<{hasChanged: boolean, manifest?: any}>
   *   - hasChanged: 是否检测到版本变化
   *   - manifest: 新的清单对象（有变化时）
   * 
   * @description
   *   通过比较当前缓存的 manifest 内容与服务器上的内容来判断版本变化
   *   使用 JSON.stringify 进行深度比较，确保检测准确性
   * 
   * @example
   *   const { hasChanged, manifest } = await ChunkManifestReader.checkChunkManifestVersion();
   *   if (hasChanged) {
   *     console.log('New manifest detected:', manifest);
   *     // 触发缓存更新逻辑
   *   }
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
      
      // 当前缓存的manifest内容（用于版本检测）
      let currentManifestString: string | null = null;
      try {
        const manifestResp = await fetch('/chunk-manifest.json');
        if (manifestResp.ok) {
          const manifest = await manifestResp.json();
          currentManifestString = JSON.stringify(manifest);
        }
      } catch (e) {
        console.warn("无法获取当前manifest缓存，将重新加载", e);
      }
      
      if (currentManifestString !== manifestString) {
        console.log("检测到chunk清单版本变化", {
          oldVersion: currentManifestString ? "已缓存" : "无缓存",
          newVersion: manifest.buildTime || "未知",
        });
        return { hasChanged: true, manifest };
      }

      return { hasChanged: false, manifest };
    } catch (error) {
      console.warn("检查chunk清单版本失败:", error);
      return { hasChanged: false };
    }
  }
}

/**
 * 智能缓存管理器
 * 
 * 职责：
 *   - 管理分层缓存策略（核心、资源、页面、数据）
 *   - 基于 manifest 进行智能缓存
 *   - 提供缓存状态查询和清理功能
 * 
 * 设计原则：
 *   - 单例模式：确保全局唯一实例
 *   - 分层缓存：不同资源使用不同缓存策略
 *   - 开发模式友好：开发环境下跳过缓存操作
 *   - 错误恢复：完善的错误处理和日志记录
 */
export class CacheManager {
  private static instance: CacheManager;

  /**
   * 获取缓存管理器单例实例
   * 
   * @returns CacheManager 单例实例
   * 
   * @description
   *   使用单例模式确保全局只有一个缓存管理器实例
   *   避免重复初始化和资源浪费
   */
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 智能缓存所有资源
   * 
   * @returns Promise<void>
   * 
   * @description
   *   基于 chunk-manifest.json 智能缓存所有资源
   *   包括核心资源、构建资源、manifest 文件等
   *   开发模式下会跳过缓存操作
   * 
   * @example
   *   const cacheManager = CacheManager.getInstance();
   *   await cacheManager.cacheAllResources();
   */
  async cacheAllResources(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过缓存所有资源（开发模式）");
      return;
    }
    console.log("开始智能缓存所有资源...");

    try {
      // 读取chunk清单
      const { success, manifest } = await ChunkManifestReader.loadChunkManifest();
      
      if (success && manifest) {
        // 更新manifest版本
        let currentManifestString: string | null = null;
        try {
          const manifestResp = await fetch('/chunk-manifest.json');
          if (manifestResp.ok) {
            const manifest = await manifestResp.json();
        currentManifestString = JSON.stringify(manifest);
          }
        } catch (e) {
          console.warn("无法获取当前manifest缓存，将重新加载", e);
        }

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
            console.log(`已加入核心缓存: ${manifestPath}`);
          } else {
            console.warn(`manifest文件未找到: ${manifestPath}`);
          }
        } catch (e) {
          console.warn(`manifest文件请求异常: /chunk-manifest.json`, e);
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

        console.log("分层缓存完成", {
          core: coreResources.length,
          assets: assetResources.length
        });
      } else {
        console.warn("无法加载chunk清单，跳过缓存");
      }

      console.log("智能缓存完成");
    } catch (error) {
      console.error("智能缓存失败:", error);
      throw error;
    }
  }

  /**
   * 缓存核心资源
   * 
   * @param resources - 要缓存的核心资源路径数组
   * @returns Promise<void>
   * 
   * @description
   *   缓存应用的核心资源，包括 HTML、manifest、关键 JS 文件等
   *   这些资源对应用启动至关重要，需要优先缓存
   *   开发模式下会跳过缓存操作
   * 
   * @example
   *   await cacheManager.cacheCoreResources(['/', '/manifest.json', '/app.js']);
   */
  private async cacheCoreResources(resources: string[]): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过核心资源缓存（开发模式）");
      return;
    }
    if (resources.length === 0) {
      console.warn("没有发现核心资源");
      return;
    }

    console.log(`开始缓存 ${resources.length} 个核心资源...`);

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
            console.log(`核心资源缓存成功: ${resource}`);
          } else {
            failedResources.push(resource);
            console.warn(`核心资源缓存失败: ${resource}`, { status: response.status });
          }
        } catch (error) {
          failedResources.push(resource);
          console.error(`核心资源缓存异常: ${resource}`, error);
        }
      }

      console.log("核心资源缓存完成", {
        success: cachedResources.length,
        failed: failedResources.length,
        total: resources.length,
      });
    } catch (error) {
      console.error("核心资源缓存失败:", error);
    }
  }

  /**
   * 缓存构建资源
   * 
   * @param resources - 要缓存的构建资源路径数组
   * @returns Promise<void>
   * 
   * @description
   *   缓存应用的构建资源，包括图片、字体、其他静态资源等
   *   使用分批处理避免一次性请求过多，提高性能
   *   开发模式下会跳过缓存操作
   * 
   * @example
   *   await cacheManager.cacheAssetResources(['/images/logo.png', '/fonts/roboto.woff2']);
   */
  private async cacheAssetResources(resources: string[]): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过构建资源缓存（开发模式）");
      return;
    }
    if (resources.length === 0) {
      console.warn("没有发现构建资源");
      return;
    }

    console.log(`开始缓存 ${resources.length} 个构建资源...`);

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
                console.log(`构建资源缓存成功: ${resource}`);
          } else {
                failedResources.push(resource);
                console.warn(`构建资源缓存失败: ${resource}`, { status: response.status });
          }
        } catch (error) {
              failedResources.push(resource);
              console.error(`构建资源缓存异常: ${resource}`, error);
            }
          })
        );

        // 批次间短暂延迟，避免阻塞
        if (i + batchSize < resources.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log("构建资源缓存完成", {
        success: cachedResources.length,
        failed: failedResources.length,
        total: resources.length,
      });
    } catch (error) {
      console.error("构建资源缓存失败:", error);
    }
  }

  /**
   * 检查并更新缓存
   * 
   * @returns Promise<void>
   * 
   * @description
   *   检查 chunk-manifest.json 版本变化，如果检测到变化则更新缓存
   *   通过比较 manifest 内容来判断版本变化，确保检测准确性
   *   开发模式下会跳过检查操作
   * 
   * @example
   *   await cacheManager.checkAndUpdateCache();
   */
  async checkAndUpdateCache(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过缓存版本检查（开发模式）");
      return;
    }
    console.log("检查缓存版本...");

    const { hasChanged, manifest } = await ChunkManifestReader.checkChunkManifestVersion();
    
    if (hasChanged) {
      console.log("检测到版本变化，开始更新缓存...");

      // 更新当前manifest版本
      let currentManifestString: string | null = null;
      try {
        const manifestResp = await fetch('/chunk-manifest.json');
        if (manifestResp.ok) {
          const manifest = await manifestResp.json();
        currentManifestString = JSON.stringify(manifest);
        }
      } catch (e) {
        console.warn("无法获取当前manifest缓存，将重新加载", e);
      }
      
      // 清理旧缓存
      await this.clearOldCaches();
      
      // 重新缓存所有资源
      await this.cacheAllResources();
      
      console.log("缓存更新完成");
    } else {
      console.log("缓存版本一致，无需更新");
    }
  }

  /**
   * 清理旧缓存
   */
  public async clearOldCaches(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过清理旧缓存（开发模式）");
      return;
    }
    try {

      // 清理旧版本缓存
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter((name) => !Object.values(CACHE_STRATEGIES).includes(name as any));

      if (oldCaches.length > 0) {
        console.log(`清理 ${oldCaches.length} 个旧版本缓存:`, oldCaches);
        await Promise.all(oldCaches.map((name) => caches.delete(name)));
      }

      // 基于manifest清理过期资源
      let currentManifestString: string | null = null;
      try {
        const manifestResp = await fetch('/chunk-manifest.json');
        if (manifestResp.ok) {
          const manifest = await manifestResp.json();
          currentManifestString = JSON.stringify(manifest);
        }
      } catch (e) {
        console.warn("无法获取当前manifest缓存，将重新加载", e);
      }

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
              console.log(`清理过期资源: ${pathname}`);
            }
          }
        }

        console.log("基于manifest的缓存清理完成", {
          validResources: validResources.size
        });
      }
    } catch (error) {
      console.error("清理旧缓存失败:", error);
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
      console.log("[DEV] 跳过缓存状态获取（开发模式）");
      return {
        core: false,
        assets: new Map<string, boolean>(),
        data: new Map<string, boolean>(),
        pages: new Map<string, boolean>(),
        manifestVersion: "开发模式",
        lastUpdate: new Date().toISOString(),
      };
    }
    console.log("获取缓存状态...");

    const status: CacheStatus = {
      core: false,
      assets: new Map<string, boolean>(),
      data: new Map<string, boolean>(),
      pages: new Map<string, boolean>(),
      manifestVersion: "已缓存", // 假设当前manifest是有效的
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

      console.log("缓存状态获取完成", status);
      return status;
    } catch (error) {
      console.error("获取缓存状态失败:", error);
      return status;
    }
  }
}

/**
 * 定期检查管理器
 */
class PeriodicCheckManager {
  private cacheManager = CacheManager.getInstance();
  private isRunning = false;

  /**
   * 启动定期检查
   */
  startPeriodicCheck(): void {
    if (!PERIODIC_CHECK_CONFIG.ENABLED) {
      console.log("定期检查已禁用");
      return;
    }

    if (isDevelopmentMode()) {
      console.log("[DEV] 开发模式：跳过定期检查");
      return;
    }

    if (this.isRunning) {
      console.warn("定期检查已在运行中");
      return;
    }

    this.isRunning = true;
    console.log("🔄 启动定期缓存检查", {
      interval: `${currentCheckInterval / 1000 / 60}分钟`,
      config: PERIODIC_CHECK_CONFIG
    });

    this.scheduleNextCheck();
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck(): void {
    if (periodicCheckTimer) {
      clearTimeout(periodicCheckTimer);
      periodicCheckTimer = null;
    }
    this.isRunning = false;
    console.log("⏹️ 停止定期缓存检查");
  }

  /**
   * 安排下一次检查
   */
  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    // 计算下次检查时间
    const timeSinceLastCheck = Date.now() - lastCheckTime;
    const delay = Math.max(0, currentCheckInterval - timeSinceLastCheck);

    console.log(`📅 安排下次检查: ${delay / 1000}秒后`);

    periodicCheckTimer = setTimeout(async () => {
      await this.performCheck();
      this.scheduleNextCheck(); // 安排下一次检查
    }, delay);
  }

  /**
   * 执行检查
   */
  private async performCheck(): Promise<void> {
    if (!this.isRunning) return;

    console.log("🔍 执行定期缓存检查...");
    lastCheckTime = Date.now();

    try {
      await this.cacheManager.checkAndUpdateCache();
      
      // 检查成功，重置失败计数和间隔
      if (consecutiveFailures > 0) {
        console.log("✅ 定期检查成功，重置失败计数", {
          previousFailures: consecutiveFailures,
          previousInterval: `${currentCheckInterval / 1000 / 60}分钟`
        });
      }
      
      consecutiveFailures = 0;
      currentCheckInterval = PERIODIC_CHECK_CONFIG.INTERVAL;
      
      // 通知客户端检查完成
      this.notifyClients("PERIODIC_CHECK_COMPLETED", {
        timestamp: new Date().toISOString(),
        success: true,
        nextCheck: new Date(Date.now() + currentCheckInterval).toISOString()
      });

    } catch (error) {
      consecutiveFailures++;
      console.error("❌ 定期检查失败", {
        consecutiveFailures,
        error: String(error)
      });

      // 应用退避策略
      this.applyBackoffStrategy();

      // 通知客户端检查失败
      this.notifyClients("PERIODIC_CHECK_FAILED", {
        timestamp: new Date().toISOString(),
        error: String(error),
        consecutiveFailures,
        nextCheck: new Date(Date.now() + currentCheckInterval).toISOString()
      });
    }
  }

  /**
   * 应用退避策略
   */
  private applyBackoffStrategy(): void {
    const newInterval = Math.min(
      currentCheckInterval * PERIODIC_CHECK_CONFIG.BACKOFF_MULTIPLIER,
      PERIODIC_CHECK_CONFIG.MAX_BACKOFF
    );

    // 确保间隔在合理范围内
    currentCheckInterval = Math.max(
      PERIODIC_CHECK_CONFIG.MIN_INTERVAL,
      Math.min(newInterval, PERIODIC_CHECK_CONFIG.MAX_INTERVAL)
    );

    console.warn("⏰ 应用退避策略", {
      consecutiveFailures,
      newInterval: `${currentCheckInterval / 1000 / 60}分钟`,
      maxBackoff: `${PERIODIC_CHECK_CONFIG.MAX_BACKOFF / 1000 / 60}分钟`
    });
  }

  /**
   * 立即执行一次检查
   */
  async performImmediateCheck(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 开发模式：跳过立即检查");
      return;
    }

    console.log("⚡ 执行立即缓存检查...");
    await this.performCheck();
  }

  /**
   * 获取检查状态
   */
  getCheckStatus(): {
    isRunning: boolean;
    lastCheckTime: number;
    consecutiveFailures: number;
    currentInterval: number;
    nextCheckTime: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCheckTime,
      consecutiveFailures,
      currentInterval: currentCheckInterval,
      nextCheckTime: lastCheckTime + currentCheckInterval
    };
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
        console.error("通知客户端失败:", error);
      });
  }
}

/**
 * 智能请求拦截器
 */
class RequestInterceptor {
  private cacheManager = CacheManager.getInstance();

  /**
   * 处理 fetch 请求（已废弃，现在统一在主事件监听器中处理）
   */
  async handleFetch(event: FetchEvent): Promise<Response> {
    // 这个方法已经不再使用，所有fetch处理都统一在主事件监听器中
    // 保留方法签名以避免编译错误
    return fetch(event.request);
  }

  /**
   * 检查并缓存manifest中的chunk
   */
  public async checkAndCacheManifestChunk(event: FetchEvent, pathname: string): Promise<void> {
    let currentManifestString: string | null = null;
    try {
      const manifestResp = await fetch('/chunk-manifest.json');
      if (manifestResp.ok) {
        const manifest = await manifestResp.json();
        currentManifestString = JSON.stringify(manifest);
      }
    } catch (e) {
      console.warn("无法获取当前manifest缓存，将重新加载", e);
    }

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
        console.log(`发现manifest chunk: ${chunkType} - ${chunkInfo.fileName}`);
        
        // 检查是否已缓存
        const cache = await caches.open(CACHE_STRATEGIES.ASSETS);
        const cachedResponse = await cache.match(event.request);
        
        if (!cachedResponse) {
          // 动态缓存chunk
          try {
            const response = await fetch(event.request);
            if (response.ok) {
              await cache.put(event.request, response.clone());
              console.log(`动态缓存 ${chunkType} chunk: ${chunkInfo.fileName}`);
            }
          } catch (error) {
            console.warn(`动态缓存 ${chunkType} chunk失败: ${chunkInfo.fileName}`, error);
          }
        }
      }
    } catch (error) {
      console.warn("检查manifest chunk失败:", error);
    }
  }

  /**
   * 判断是否为核心资源
   */
  public isCoreResource(pathname: string): boolean {
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
  public isAssetResource(pathname: string): boolean {
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
  public isPageResource(pathname: string): boolean {
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
  public async cacheOrNetwork(event: FetchEvent, cacheStrategy: string): Promise<Response> {
    if (isDevelopmentMode()) {
      return fetch(event.request);
    }

    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }

    try {
      const networkResponse = await fetch(event.request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheStrategy);
        await cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      console.warn("网络请求失败，尝试从缓存获取", { url: event.request.url, error });
      
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      console.error("网络和缓存都不可用", { url: event.request.url });
      throw error;
    }
  }
}

/**
 * 消息处理器
 */
class MessageHandler {
  private cacheManager = CacheManager.getInstance();
  private periodicCheckManager = new PeriodicCheckManager();

  /**
   * 处理来自客户端的消息
   */
  async handleMessage(event: ExtendableMessageEvent): Promise<void> {
    const message: SWMessage = event.data;

    console.log("收到客户端消息:", message);

    switch (message.type) {
      case "CHECK_CACHE_VERSION":
        console.log("检查缓存版本指令");
        event.waitUntil(this.handleCheckCacheVersion());
        break;

      case "CACHE_STATUS_REQUEST":
        console.log("缓存状态请求");
        event.waitUntil(this.handleCacheStatusRequest(event));
        break;

      case "FORCE_UPDATE":
        console.log("强制更新缓存指令");
        event.waitUntil(this.handleForceUpdate());
        break;

      case "CLEAR_CACHE":
        console.log("清理缓存指令");
        event.waitUntil(this.handleClearCache());
        break;

      case "START_PERIODIC_CHECK":
        console.log("启动定期检查指令");
        event.waitUntil(this.handleStartPeriodicCheck());
        break;

      case "STOP_PERIODIC_CHECK":
        console.log("停止定期检查指令");
        event.waitUntil(this.handleStopPeriodicCheck());
        break;

      case "IMMEDIATE_CHECK":
        console.log("立即检查指令");
        event.waitUntil(this.handleImmediateCheck());
        break;

      case "GET_CHECK_STATUS":
        console.log("获取检查状态指令");
        event.waitUntil(this.handleGetCheckStatus(event));
        break;

      case "SET_CONFIG":
        console.log("收到主线程配置变更指令", message.data);
        this.handleSetConfig(message.data);
        break;

      default:
        console.warn("未知消息类型:", message.type);
    }
  }

  /**
   * 处理缓存版本检查
   */
  private async handleCheckCacheVersion(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过缓存版本检查（开发模式）");
      return;
    }
    try {
      await this.cacheManager.checkAndUpdateCache();
      this.notifyClients("CACHE_UPDATED", { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("缓存版本检查失败:", error);
    }
  }

  /**
   * 处理缓存状态请求
   */
  private async handleCacheStatusRequest(event: ExtendableMessageEvent): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过缓存状态请求（开发模式）");
      return;
    }
    try {
      const status = await this.cacheManager.getCacheStatus();
      this.notifyClient(event.source, "CACHE_STATUS", status);
    } catch (error) {
      console.error("获取缓存状态失败:", error);
    }
  }

  /**
   * 处理强制更新
   */
  private async handleForceUpdate(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过强制更新（开发模式）");
      return;
    }
    try {
      await this.cacheManager.cacheAllResources();
      this.notifyClients("FORCE_UPDATE_COMPLETED", { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("强制更新失败:", error);
    }
  }

  /**
   * 处理清理缓存
   */
  private async handleClearCache(): Promise<void> {
    if (isDevelopmentMode()) {
      console.log("[DEV] 跳过清理缓存（开发模式）");
      return;
    }
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      let currentManifestString: string | null = null;
      try {
        const manifestResp = await fetch('/chunk-manifest.json');
        if (manifestResp.ok) {
          const manifest = await manifestResp.json();
          currentManifestString = JSON.stringify(manifest);
        }
      } catch (e) {
        console.warn("无法获取当前manifest缓存，将重新加载", e);
      }
      this.notifyClients("CACHE_CLEARED", { timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("清理缓存失败:", error);
    }
  }

  /**
   * 处理主线程下发的 SW 配置变更
   */
  private handleSetConfig(config: any): void {
    try {
      if (typeof config !== 'object' || !config) return;
      // 动态应用配置
      if (typeof config.periodicCheckEnabled === 'boolean') {
        PERIODIC_CHECK_CONFIG.ENABLED = config.periodicCheckEnabled;
        console.log("[SW][CONFIG] 已应用定期检查开关:", config.periodicCheckEnabled);
      }
      if (typeof config.periodicCheckInterval === 'number') {
        PERIODIC_CHECK_CONFIG.INTERVAL = config.periodicCheckInterval;
        console.log("[SW][CONFIG] 已应用定期检查间隔:", config.periodicCheckInterval);
      }
      if (typeof config.cacheStrategy === 'string') {
        // 这里只做日志，实际策略应用需在缓存逻辑中实现
        console.log("[SW][CONFIG] 已应用缓存策略:", config.cacheStrategy);
      }
      // 可扩展更多配置项
    } catch (err) {
      console.error("[SW][CONFIG] 应用配置失败:", err);
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
        console.error("通知客户端失败:", error);
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

  /**
   * 处理启动定期检查
   */
  private async handleStartPeriodicCheck(): Promise<void> {
    try {
      this.periodicCheckManager.startPeriodicCheck();
      this.notifyClients("PERIODIC_CHECK_STARTED", { 
        timestamp: new Date().toISOString(),
        status: this.periodicCheckManager.getCheckStatus()
      });
    } catch (error) {
      console.error("启动定期检查失败:", error);
    }
  }

  /**
   * 处理停止定期检查
   */
  private async handleStopPeriodicCheck(): Promise<void> {
    try {
      this.periodicCheckManager.stopPeriodicCheck();
      this.notifyClients("PERIODIC_CHECK_STOPPED", { 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error("停止定期检查失败:", error);
    }
  }

  /**
   * 处理立即检查
   */
  private async handleImmediateCheck(): Promise<void> {
    try {
      await this.periodicCheckManager.performImmediateCheck();
    } catch (error) {
      console.error("立即检查失败:", error);
    }
  }

  /**
   * 处理获取检查状态
   */
  private async handleGetCheckStatus(event: ExtendableMessageEvent): Promise<void> {
    try {
      const status = this.periodicCheckManager.getCheckStatus();
      this.notifyClient(event.source, "CHECK_STATUS", status);
    } catch (error) {
      console.error("获取检查状态失败:", error);
    }
  }
}

/**
 * 🚀 Service Worker 主逻辑
 */
(async (worker: ServiceWorkerGlobalScope) => {
  console.log("🚀 智能离线优先 Service Worker 启动");
  
  // 确定运行模式
  // IS_DEVELOPMENT_MODE = determineDevelopmentMode(); // This line is removed as per the new_code
  console.log(`🔧 运行模式: ${IS_DEVELOPMENT_MODE ? "开发模式" : "生产模式"}`);

  const cacheManager = CacheManager.getInstance();
  const requestInterceptor = new RequestInterceptor();
  const messageHandler = new MessageHandler();
  const periodicCheckManager = new PeriodicCheckManager();

  /**
   * 处理其他资源类型的缓存策略
   */
  async function handleOtherResources(event: FetchEvent, pathname: string): Promise<Response> {
    // 检查是否为manifest中的chunk，如果是则动态缓存
    await requestInterceptor.checkAndCacheManifestChunk(event, pathname);

    // 根据资源类型选择缓存策略
    if (requestInterceptor.isCoreResource(pathname)) {
      return await requestInterceptor.cacheOrNetwork(event, CACHE_STRATEGIES.CORE);
    } else if (requestInterceptor.isAssetResource(pathname)) {
      return await requestInterceptor.cacheOrNetwork(event, CACHE_STRATEGIES.ASSETS);
    } else if (requestInterceptor.isPageResource(pathname)) {
      return await requestInterceptor.cacheOrNetwork(event, CACHE_STRATEGIES.PAGES);
    } else {
      // 其他资源使用网络优先
      return fetch(event.request);
    }
  }

  // 安装事件 - 智能缓存资源
  worker.addEventListener("install", (event) => {
    console.log("📦 Service Worker 安装中...");
    event.waitUntil(
      (async () => {
        try {
          if (isDevelopmentMode()) {
            console.log("🔧 开发模式：跳过资源缓存，保持热重载能力");
            await worker.skipWaiting();
            console.log("✅ Service Worker 安装完成（开发模式）");
            return;
          }

          // 智能缓存所有资源
          await cacheManager.cacheAllResources();
          await worker.skipWaiting();
          console.log("✅ Service Worker 安装完成");
        } catch (error) {
          console.error("❌ Service Worker 安装失败:", error);
        }
      })(),
    );
  });

  // 激活事件 - 清理旧缓存，接管客户端
  worker.addEventListener("activate", (event) => {
    console.log("🔄 Service Worker 激活中...");
    event.waitUntil(
      (async () => {
        try {
          if (isDevelopmentMode()) {
            console.log("🔧 开发模式：跳过缓存清理");
            await worker.clients.claim();
            console.log("✅ Service Worker 激活完成（开发模式）");
            return;
          }

          // 清理旧缓存
          await cacheManager.clearOldCaches();
          await worker.clients.claim();
          console.log("✅ Service Worker 激活完成，已接管所有客户端");

          // 启动定期检查
          periodicCheckManager.startPeriodicCheck();
        } catch (error) {
          console.error("❌ Service Worker 激活失败:", error);
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

    // 统一处理所有请求，避免多次调用respondWith
    event.respondWith(
      (async () => {
        const pathname = url.pathname;

        // manifest 文件缓存优先
        if (pathname === "/chunk-manifest.json") {
          const cache = await caches.open(CACHE_STRATEGIES.CORE);
          const cached = await cache.match(event.request);
          if (cached) {
            console.log(`离线命中 manifest: ${pathname}`);
            return cached;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              await cache.put(event.request, networkResponse.clone());
              console.log(`网络缓存 manifest: ${pathname}`);
            }
            return networkResponse;
          } catch (error) {
            console.warn(`manifest 离线且无缓存: ${pathname}`);
            return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        }

        // 主文档缓存优先
        if (pathname === "/" || pathname === "/index.html") {
          const cached = await caches.match(event.request);
          if (cached) {
            console.log(`离线命中主文档: ${pathname}`);
            return cached;
          }
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              const cache = await caches.open(CACHE_STRATEGIES.CORE);
              await cache.put(event.request, networkResponse.clone());
              console.log(`网络缓存主文档: ${pathname}`);
            }
            return networkResponse;
          } catch (error) {
            console.warn(`主文档离线且无缓存: ${pathname}`);
            return new Response('<!DOCTYPE html><title>离线</title><h1>离线不可用</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } });
          }
        }

        // 页面路由兜底（App Shell）
        if (!pathname.includes('.') && !pathname.startsWith('/api/') && pathname !== '/') {
          const cached = await caches.match('/');
          if (cached) {
            console.log(`App Shell 离线命中: /`);
            return cached;
          } else {
            console.warn(`App Shell 离线未命中: /`);
            return fetch(event.request);
          }
        }

        // 其他资源类型使用缓存策略
        return await handleOtherResources(event, pathname);
      })()
    );
  });

  // 消息处理 - 与客户端通信
  worker.addEventListener("message", (event) => {
    messageHandler.handleMessage(event);
  });

  // 错误处理
  worker.addEventListener("error", (event) => {
    console.error("❌ Service Worker 错误:", event.error);
  });

  // 未处理的 Promise 拒绝
  worker.addEventListener("unhandledrejection", (event) => {
    console.error("❌ 未处理的 Promise 拒绝:", event.reason);
  });

  console.log("🎉 智能离线优先 Service Worker 初始化完成，等待事件...");
})(self as any);