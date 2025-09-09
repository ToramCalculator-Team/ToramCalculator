/**
 * config.ts - Service Worker 相关配置项
 *
 * 用途：
 *   - 集中管理所有与SW相关的可配置参数
 *   - 包括缓存策略、定期检查参数、版本号等
 *
 * 用法：
 *   import { VERSION, PERIODIC_CHECK_CONFIG, CACHE_STRATEGIES } from '@/worker/sw/config';
 *
 * 依赖：无
 *
 * 维护：架构师/全栈/工具开发
 */

// 版本号与构建时间戳（由 esbuild define 注入，开发模式有回退）
export const VERSION = (typeof __SW_VERSION__ !== 'undefined' ? __SW_VERSION__ : "dev");
export const BUILD_TIMESTAMP = (typeof __SW_BUILD_TS__ !== 'undefined' ? __SW_BUILD_TS__ : Date.now());

// 定期检查配置
export const PERIODIC_CHECK_CONFIG = {
  ENABLED: true,                    // 是否启用定期检查
  INTERVAL: 30 * 60 * 1000,        // 检查间隔：30分钟
  MIN_INTERVAL: 5 * 60 * 1000,     // 最小间隔：5分钟
  MAX_INTERVAL: 24 * 60 * 60 * 1000, // 最大间隔：24小时
  BACKOFF_MULTIPLIER: 1.5,         // 失败后延迟倍数
  MAX_BACKOFF: 2 * 60 * 60 * 1000, // 最大延迟：2小时
};

// 缓存策略配置
export const CACHE_STRATEGIES = {
  CORE: "core-" + VERSION,        // 核心资源（HTML、manifest、关键JS）
  ASSETS: "assets-" + VERSION,    // 构建资源（JS、CSS、图片）
  DATA: "data-" + VERSION,        // 数据资源（API响应等）
  PAGES: "pages-" + VERSION,      // 页面缓存
  VERSION_META: "version-meta",   // 版本元数据缓存（不包含版本号，用于跨版本比较）
} as const;

// 版本检查配置
export const VERSION_CHECK_CONFIG = {
  MANIFEST_URL: '/chunk-manifest.json',
  VERSION_META_KEY: 'sw-version-meta',
  CACHE_KEY_PREFIX: 'toram-sw-',
  // 检查哪些字段的变化来判断是否需要更新
  CHECK_FIELDS: ['version', 'buildTime', 'bundleInfo'] as const,
} as const; 