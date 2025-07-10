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

// 版本号 - 用于缓存版本控制
export const VERSION = "2.1.0";

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
} as const; 