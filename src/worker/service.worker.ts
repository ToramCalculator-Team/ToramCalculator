/// <reference lib="webworker" />

/**
 * 功能概述：
 * 1. 缓存管理：静态资源缓存优先，动态内容网络优先
 * 2. 页面组件预缓存：根据路由自动预缓存相关组件
 * 3. 离线支持：网络不可用时自动回退到缓存
 * 4. 消息通信：与客户端双向通信，实时状态同步
 * 5. 缓存状态管理：实时跟踪和管理缓存状态
 * 6. 开发模式支持：开发环境下不拦截请求，保持热重载能力
 *
 * 工作流程：
 * 第一次访问 → 服务器SSR → 注册SW → 缓存静态资源 → 预缓存页面组件
 * 后续访问 → SW拦截请求 → 检查缓存 → 返回缓存或网络请求
 *
 * 缓存策略：
 * - 静态资源：缓存优先，网络回退
 * - 动态内容：网络优先，缓存回退
 * - 页面组件：智能预缓存，按需加载
 * - 开发模式：不拦截请求，直接网络请求
 */

// 版本号
const VERSION = "1.0.0";

// 开发模式判断 - 在Service Worker启动时确定，避免重复计算
let IS_DEVELOPMENT_MODE: boolean;

const determineDevelopmentMode = (): boolean => {
  // 检查是否为开发环境
  // 在Service Worker中，我们可以通过检查location.hostname来判断
  // return location.hostname === "localhost" || location.hostname === "127.0.0.1";
  return false;
};

const isDevelopmentMode = (): boolean => {
  return IS_DEVELOPMENT_MODE;
};

// 缓存策略配置
const CACHE_STRATEGIES = {
  STATIC: "static-" + VERSION, // 静态资源缓存（CSS、JS、图片等）
  DYNAMIC: "dynamic-" + VERSION, // 动态内容缓存（API响应等）
  COMPONENTS: "components-" + VERSION, // 页面组件缓存
  PAGES: "pages-" + VERSION, // 页面HTML缓存
  DATA: "data-" + VERSION, // 数据缓存
} as const;

// 路由缓存映射 - 定义每个路由需要的组件和数据
const ROUTE_CACHE_MAP = {
  "/": {
    components: ["Home", "Navigation", "Footer"],
    data: ["mob", "skill", "crystal", "npc", "zone"],
    priority: "high",
  },
  "/evaluate": {
    components: ["Evaluate", "CharacterForm", "ComboBuilder"],
    data: ["character", "combo", "simulator"],
    priority: "high",
  },
  "/search": {
    components: ["Search", "ItemList", "FilterPanel"],
    data: ["item", "weapon", "armor", "material"],
    priority: "medium",
  },
} as const;

// 消息类型定义
interface SWMessage {
  type: "START_PAGE_CACHING" | "PRELOAD_ROUTE_RESOURCES" | "ROUTE_CHANGED" | "CACHE_STATUS_REQUEST";
  data: any;
}

// 缓存状态类型
interface CacheStatus {
  static: boolean;
  components: Map<string, boolean>;
  pages: Map<string, boolean>;
  data: Map<string, boolean>;
}

/**
 * 日志管理器 - 统一的日志记录
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

  // 简化：只输出主日志+短URL摘要
  static networkSmart(pathname: string, message: string, url?: string): void {
    let urlSummary = "";
    if (url) {
      // 只显示URL最后30位
      urlSummary = `[url: ...${url.slice(-30)}]`;
    }
    console.log(`${this.prefix} [NETWORK] ${message} ${urlSummary}`);
    // 如需调试完整URL，可临时打开：
    // console.debug('Full URL:', url);
  }
}

/**
 * 缓存管理器 - 负责所有缓存操作
 *
 * 主要功能：
 * - 静态资源缓存：CSS、JS、图片等
 * - 页面组件缓存：按路由预缓存组件
 * - 缓存状态检查：实时监控缓存状态
 * - 缓存清理：清理过期缓存
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
   * 缓存静态资源
   * 在SW安装时执行，缓存应用的基础静态资源
   */
  async cacheStaticAssets(): Promise<void> {
    Logger.info("开始缓存静态资源...");

    try {
      const cache = await caches.open(CACHE_STRATEGIES.STATIC);
      const staticAssets = [
        "/",
        "/manifest.json",
        "/icons/48.ico",
        // 可以添加更多静态资源
      ];

      Logger.debug("准备缓存的静态资源列表:", staticAssets);

      await cache.addAll(staticAssets);
      Logger.cache("静态资源缓存完成", { count: staticAssets.length });
    } catch (error) {
      Logger.error("静态资源缓存失败:", error);
      throw error;
    }
  }

  /**
   * 缓存页面HTML
   * 缓存主要页面的HTML内容，确保离线时页面刷新可用
   */
  async cachePageHTML(): Promise<void> {
    Logger.info("开始缓存页面HTML...");

    try {
      const cache = await caches.open(CACHE_STRATEGIES.PAGES);
      const pagesToCache = [
        "/",
        "/evaluate",
        "/search",
        "/character",
        "/profile",
        // 可以添加更多页面
      ];

      Logger.debug("准备缓存的页面列表:", pagesToCache);

      for (const page of pagesToCache) {
        try {
          const response = await fetch(page);
          if (response.ok) {
            await cache.put(page, response);
            Logger.cache(`页面缓存成功: ${page}`);
          } else {
            Logger.warn(`页面缓存失败: ${page}`, { status: response.status });
          }
        } catch (error) {
          Logger.error(`页面缓存异常: ${page}`, error);
        }
      }

      Logger.cache("页面HTML缓存完成", { count: pagesToCache.length });
    } catch (error) {
      Logger.error("页面HTML缓存失败:", error);
    }
  }

  /**
   * 缓存页面组件
   * 根据路由配置，预缓存该页面需要的组件
   */
  async cachePageComponents(route: string): Promise<void> {
    Logger.info(`开始缓存页面组件: ${route}`);

    const routeConfig = ROUTE_CACHE_MAP[route as keyof typeof ROUTE_CACHE_MAP];
    if (!routeConfig) {
      Logger.warn(`未找到路由配置: ${route}`);
      return;
    }

    Logger.debug("路由配置:", routeConfig);

    try {
      const cache = await caches.open(CACHE_STRATEGIES.COMPONENTS);
      const cachedComponents: string[] = [];
      const failedComponents: string[] = [];

      for (const component of routeConfig.components) {
        try {
          const componentUrl = `/components/${component}.js`;
          Logger.debug(`尝试缓存组件: ${componentUrl}`);

          const response = await fetch(componentUrl);
          if (response.ok) {
            await cache.put(componentUrl, response);
            cachedComponents.push(component);
            Logger.cache(`组件缓存成功: ${component}`);
          } else {
            failedComponents.push(component);
            Logger.warn(`组件缓存失败: ${component}`, { status: response.status });
          }
        } catch (error) {
          failedComponents.push(component);
          Logger.error(`组件缓存异常: ${component}`, error);
        }
      }

      Logger.cache("页面组件缓存完成", {
        route,
        success: cachedComponents,
        failed: failedComponents,
        total: routeConfig.components.length,
      });
    } catch (error) {
      Logger.error(`页面组件缓存失败: ${route}`, error);
    }
  }

  /**
   * 预缓存相关路由
   * 根据当前路由，预缓存用户可能访问的相关路由
   */
  async preloadRelatedRoutes(currentRoute: string): Promise<void> {
    Logger.info(`开始预缓存相关路由: ${currentRoute}`);

    const relatedRoutes = {
      "/": ["/evaluate", "/search"],
      "/evaluate": ["/", "/search"],
      "/search": ["/", "/evaluate"],
    };

    const routes = relatedRoutes[currentRoute as keyof typeof relatedRoutes] || [];
    Logger.debug("相关路由列表:", routes);

    for (const route of routes) {
      Logger.debug(`预缓存相关路由: ${route}`);
      await this.cachePageComponents(route);
    }

    Logger.cache("相关路由预缓存完成", { currentRoute, relatedRoutes: routes });
  }

  /**
   * 检查缓存状态
   * 返回当前所有缓存的详细状态信息
   */
  async getCacheStatus(): Promise<CacheStatus> {
    Logger.debug("开始检查缓存状态...");

    const status: CacheStatus = {
      static: false,
      components: new Map<string, boolean>(),
      pages: new Map<string, boolean>(),
      data: new Map<string, boolean>(),
    };

    try {
      // 检查静态缓存
      const staticCache = await caches.open(CACHE_STRATEGIES.STATIC);
      const staticKeys = await staticCache.keys();
      status.static = staticKeys.length > 0;
      Logger.debug("静态缓存状态:", { hasCache: status.static, count: staticKeys.length });

      // 检查组件缓存
      const componentCache = await caches.open(CACHE_STRATEGIES.COMPONENTS);
      const componentKeys = await componentCache.keys();
      for (const key of componentKeys) {
        const componentName = key.url.split("/").pop()?.replace(".js", "") || "";
        status.components.set(componentName, true);
      }
      Logger.debug("组件缓存状态:", {
        count: status.components.size,
        components: Array.from(status.components.keys()),
      });

      // 检查页面缓存
      const pageCache = await caches.open(CACHE_STRATEGIES.PAGES);
      const pageKeys = await pageCache.keys();
      for (const key of pageKeys) {
        const pageName = key.url.split("/").pop() || key.url;
        status.pages.set(pageName, true);
      }
      Logger.debug("页面缓存状态:", {
        count: status.pages.size,
        pages: Array.from(status.pages.keys()),
      });

      Logger.info("缓存状态检查完成", status);
      return status;
    } catch (error) {
      Logger.error("缓存状态检查失败:", error);
      return status;
    }
  }
}

/**
 * 请求拦截器 - 处理所有网络请求
 *
 * 主要功能：
 * - 智能路由：根据请求类型选择缓存策略
 * - 缓存优先：静态资源优先从缓存返回
 * - 网络优先：动态内容优先从网络获取
 * - 离线支持：网络失败时自动回退到缓存
 */
class RequestInterceptor {
  private cacheManager = CacheManager.getInstance();

  /**
   * 处理 fetch 请求
   * 根据请求类型应用不同的缓存策略
   */
  async handleFetch(event: FetchEvent): Promise<void> {
    const url = new URL(event.request.url);
    const pathname = url.pathname;

    // 开发模式下不拦截请求，保持热重载能力
    if (isDevelopmentMode()) {
      Logger.debug(pathname, "开发模式：跳过请求拦截，保持热重载能力");
      return;
    }

    // 非同源资源不处理
    if (url.origin !== location.origin) {
      return;
    }

    // 只处理 GET 请求
    if (event.request.method !== "GET") {
      Logger.debug(pathname, "跳过非GET请求");
      return;
    }

    // 根据路径选择缓存策略
    let strategy = "网络优先";
    let cacheResult = "";

    if (this.shouldCacheStatically(pathname)) {
      strategy = "静态缓存";
      cacheResult = await this.cacheOrNetwork(event);
    } else if (this.shouldCacheDynamically(pathname)) {
      // 对于页面路由，使用缓存优先策略以确保离线可用
      strategy = "页面缓存优先";
      cacheResult = await this.cacheOrNetwork(event);
    } else {
      // 网络优先
      event.respondWith(fetch(event.request));
    }

    // 简化日志输出：简写 + 详情对象
    const shortPath = this.getShortPath(pathname);
    Logger.networkSmart(
      pathname,
      `${event.request.method} ${shortPath} -> ${strategy}${cacheResult ? ` (${cacheResult})` : ""}`,
      event.request.url,
    );
  }

  /**
   * 获取简化的路径显示
   */
  private getShortPath(pathname: string): string {
    // 移除 /_build/ 前缀
    if (pathname.startsWith("/_build/")) {
      pathname = pathname.substring(8);
    }

    // 简化 node_modules 路径
    if (pathname.includes("node_modules/")) {
      const parts = pathname.split("node_modules/");
      if (parts.length > 1) {
        const packagePath = parts[1];
        // 提取包名和文件名
        const packageMatch = packagePath.match(/^([^/]+)\/(.+)$/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          const fileName = packageMatch[2].split("/").pop() || "";
          return `📦 ${packageName}/${fileName}`;
        }
      }
    }

    // 简化其他路径
    if (pathname.startsWith("src/")) {
      return `📁 ${pathname}`;
    }

    if (pathname.startsWith("db/")) {
      return `🗄️ ${pathname}`;
    }

    return pathname;
  }

  /**
   * 判断是否应该使用静态缓存策略
   * 静态资源：CSS、JS、图片、图标等
   */
  private shouldCacheStatically(pathname: string): boolean {
    const staticPatterns = [
      "/",
      "/manifest.json",
      "/icons/",
      "/_build/assets/",
      ".css",
      ".js",
      ".ico",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
    ];

    return staticPatterns.some((pattern) => pathname.includes(pattern));
  }

  /**
   * 判断是否应该使用动态缓存策略
   * 动态内容：API响应、页面内容等
   */
  private shouldCacheDynamically(pathname: string): boolean {
    // 检查是否为已知路由
    if (Object.keys(ROUTE_CACHE_MAP).includes(pathname)) {
      return true;
    }
    
    // 检查是否为页面路由（不包含文件扩展名且不是API路径）
    if (!pathname.includes('.') && !pathname.startsWith('/api/')) {
      return true;
    }
    
    return false;
  }

  /**
   * 缓存优先策略
   * 先检查缓存，缓存命中则返回，否则从网络获取并缓存
   */
  private async cacheOrNetwork(event: FetchEvent): Promise<string> {
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
            // 根据请求类型选择缓存策略
            const url = new URL(event.request.url);
            const pathname = url.pathname;
            
            let cacheStrategy = CACHE_STRATEGIES.STATIC;
            if (this.shouldCacheDynamically(pathname)) {
              cacheStrategy = CACHE_STRATEGIES.PAGES;
            }
            
            const cache = await caches.open(cacheStrategy);
            await cache.put(event.request, networkResponse.clone());
            cacheResult = "已缓存网络响应";
          }
          return networkResponse;
        } catch (error) {
          Logger.warn("网络请求失败，尝试从缓存获取", { url: event.request.url, error });
          
          // 网络失败时尝试从缓存获取
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

  /**
   * 网络优先策略
   * 优先从网络获取，成功则缓存，失败则回退到缓存
   */
  private async cacheOrNetworkAndCache(event: FetchEvent): Promise<string> {
    let cacheResult = "";

    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_STRATEGIES.DYNAMIC);
            await cache.put(event.request, response.clone());
            cacheResult = "已缓存网络响应";
          }
          return response;
        })
        .catch(async (error) => {
          Logger.warn("网络请求失败，尝试从缓存获取", { url: event.request.url, error });

          // 网络失败时尝试从缓存获取
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            cacheResult = "从缓存获取成功";
            return cachedResponse;
          }

          Logger.error("网络和缓存都不可用", { url: event.request.url });
          throw new Error("网络和缓存都不可用");
        }),
    );

    return cacheResult;
  }
}

/**
 * 消息处理器 - 处理与客户端的通信
 *
 * 主要功能：
 * - 接收客户端指令：开始缓存、预加载资源等
 * - 发送状态更新：缓存状态、离线状态等
 * - 双向通信：实时同步状态信息
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
      case "START_PAGE_CACHING":
        Logger.info("开始页面缓存指令");
        event.waitUntil(this.handleStartPageCaching(message.data));
        break;

      case "PRELOAD_ROUTE_RESOURCES":
        Logger.info("预加载路由资源指令");
        event.waitUntil(this.handlePreloadRouteResources(message.data));
        break;

      case "ROUTE_CHANGED":
        Logger.info("路由变化通知");
        event.waitUntil(this.handleRouteChanged(message.data));
        break;

      case "CACHE_STATUS_REQUEST":
        Logger.info("缓存状态请求");
        event.waitUntil(this.handleCacheStatusRequest(event));
        break;

      default:
        Logger.warn("未知消息类型:", message.type);
    }
  }

  /**
   * 处理开始页面缓存指令
   */
  private async handleStartPageCaching(data: { currentRoute: string }): Promise<void> {
    Logger.info("开始页面缓存流程", data);

    try {
      // 缓存当前页面组件
      await this.cacheManager.cachePageComponents(data.currentRoute);

      // 预缓存相关路由
      await this.cacheManager.preloadRelatedRoutes(data.currentRoute);

      // 通知客户端缓存状态
      this.notifyClients("ROUTE_CACHED", { route: data.currentRoute });
      Logger.info("页面缓存流程完成", data);
    } catch (error) {
      Logger.error("页面缓存流程失败:", error);
    }
  }

  /**
   * 处理预加载路由资源指令
   */
  private async handlePreloadRouteResources(data: { route: string; priority?: string }): Promise<void> {
    Logger.info("预加载路由资源", data);

    if (data.priority === "high") {
      await this.cacheManager.cachePageComponents(data.route);
    }
  }

  /**
   * 处理路由变化通知
   */
  private async handleRouteChanged(data: { route: string }): Promise<void> {
    Logger.info("路由变化处理", data);

    // 可以在这里添加路由特定的缓存策略
    await this.cacheManager.preloadRelatedRoutes(data.route);
  }

  /**
   * 处理缓存状态请求
   */
  private async handleCacheStatusRequest(event: ExtendableMessageEvent): Promise<void> {
    Logger.info("处理缓存状态请求");

    try {
      const status = await this.cacheManager.getCacheStatus();
      this.notifyClient(event.source, "CACHE_STATUS", status);
      Logger.info("缓存状态已发送给客户端");
    } catch (error) {
      Logger.error("获取缓存状态失败:", error);
    }
  }

  /**
   * 通知所有客户端
   */
  private notifyClients(type: string, data: any): void {
    Logger.debug("通知所有客户端:", { type, data });

    (self as any).clients
      .matchAll()
      .then((clients: readonly Client[]) => {
        Logger.debug(`找到 ${clients.length} 个客户端`);

        clients.forEach((client: Client, index: number) => {
          if (client && "postMessage" in client) {
            (client as any).postMessage({ type, data });
            Logger.debug(`消息已发送给客户端 ${index + 1}`);
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
      Logger.debug("消息已发送给特定客户端:", { type, data });
    } else {
      Logger.warn("客户端不支持消息发送");
    }
  }
}

/**
 * 🚀 Service Worker 主逻辑
 *
 * 生命周期事件：
 * - install: 安装时缓存静态资源
 * - activate: 激活时清理旧缓存，接管客户端
 * - fetch: 拦截网络请求，应用缓存策略
 * - message: 处理客户端消息
 * - error: 错误处理
 * - unhandledrejection: Promise 拒绝处理
 */
(async (worker: ServiceWorkerGlobalScope) => {
  Logger.info("🚀 增强版 Service Worker 启动");
  
  // 在启动时确定运行模式，避免重复计算
  IS_DEVELOPMENT_MODE = determineDevelopmentMode();
  Logger.info(`🔧 运行模式: ${IS_DEVELOPMENT_MODE ? "开发模式" : "生产模式"}`);

  const cacheManager = CacheManager.getInstance();
  const requestInterceptor = new RequestInterceptor();
  const messageHandler = new MessageHandler();

  // 安装事件 - 缓存静态资源
  worker.addEventListener("install", (event) => {
    Logger.info("📦 Service Worker 安装中...");
    event.waitUntil(
      (async () => {
        try {
          // 开发模式下跳过缓存，保持热重载能力
          if (isDevelopmentMode()) {
            Logger.info("🔧 开发模式：跳过静态资源缓存，保持热重载能力");
            await worker.skipWaiting();
            Logger.info("✅ Service Worker 安装完成（开发模式）");
            return;
          }

          // 缓存静态资源
          await cacheManager.cacheStaticAssets();
          // 缓存页面HTML
          await cacheManager.cachePageHTML();
          // 跳过等待，立即激活
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
          // 开发模式下跳过缓存清理，保持热重载能力
          if (isDevelopmentMode()) {
            Logger.info("🔧 开发模式：跳过缓存清理，保持热重载能力");
            // 立即接管所有客户端
            await worker.clients.claim();
            Logger.info("✅ Service Worker 激活完成（开发模式）");
            return;
          }

          // 清理旧缓存
          const cacheNames = await caches.keys();
          const oldCaches = cacheNames.filter((name) => !Object.values(CACHE_STRATEGIES).includes(name as any));

          if (oldCaches.length > 0) {
            Logger.info(`清理 ${oldCaches.length} 个旧缓存:`, oldCaches);
            await Promise.all(oldCaches.map((name) => caches.delete(name)));
          }

          // 立即接管所有客户端
          await worker.clients.claim();
          Logger.info("✅ Service Worker 激活完成，已接管所有客户端");
        } catch (error) {
          Logger.error("❌ Service Worker 激活失败:", error);
        }
      })(),
    );
  });

  // 请求拦截 - 应用缓存策略
  worker.addEventListener("fetch", (event) => {
    // 开发模式下不拦截请求，保持热重载能力
    if (isDevelopmentMode()) {
      return;
    }
    requestInterceptor.handleFetch(event);
  });

  // 消息处理 - 与客户端通信
  worker.addEventListener("message", (event) => {
    messageHandler.handleMessage(event);
  });

  // 添加调试消息处理
  worker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "DEBUG_CACHE_STATUS") {
      event.waitUntil(
        (async () => {
          try {
            const cacheNames = await caches.keys();
            const cacheStatus: Record<string, string[]> = {};
            
            for (const cacheName of cacheNames) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              cacheStatus[cacheName] = keys.map(req => req.url);
            }
            
            Logger.info("缓存状态调试信息:", cacheStatus);
            // 直接通知客户端，不通过MessageHandler
            (self as any).clients.matchAll().then((clients: readonly Client[]) => {
              clients.forEach((client: Client) => {
                if (client && "postMessage" in client) {
                  (client as any).postMessage({ 
                    type: "DEBUG_CACHE_STATUS", 
                    data: cacheStatus 
                  });
                }
              });
            });
          } catch (error) {
            Logger.error("获取缓存状态失败:", error);
          }
        })()
      );
    }
  });

  // 错误处理
  worker.addEventListener("error", (event) => {
    Logger.error("❌ Service Worker 错误:", event.error);
  });

  // 未处理的 Promise 拒绝
  worker.addEventListener("unhandledrejection", (event) => {
    Logger.error("❌ 未处理的 Promise 拒绝:", event.reason);
  });

  Logger.info("🎉 Service Worker 初始化完成，等待事件...");
})(self as any);
