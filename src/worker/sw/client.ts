/**
 * client.ts - 主线程与 Service Worker 通信与 API 封装
 *
 * 用途：
 *   - 只负责主线程与 SW 的通信（如 Comlink、postMessage）和 API 封装
 *   - 不直接操作 machine 或底层缓存，仅通过 api.ts 提供的接口
 *   - 便于前端页面/设置页等调用 SW 功能
 *
 * 用法：
 *   import * as swClient from '@/worker/sw/client';
 *
 * 依赖：
 *   - @/worker/sw/api
 *   - @/worker/sw/types
 *
 * 维护：架构师/全栈/工具开发
 */

import * as swAPI from './api';
import type { SWContext } from './types';

// 获取当前 SW 状态
export function getState(): SWContext {
  return swAPI.getState();
  }

// 订阅 SW 状态变化
export function subscribe(listener: (ctx: SWContext) => void) {
  return swAPI.subscribe(listener);
  }

// 启动定期检查
export function startPeriodicCheck() {
  swAPI.startPeriodicCheck();
  }

// 停止定期检查
export function stopPeriodicCheck() {
  swAPI.stopPeriodicCheck();
  }

// 触发一次缓存检查
export function checkCacheVersion() {
  swAPI.checkCacheVersion();
  }

// 强制更新
export function forceUpdate() {
  swAPI.forceUpdate();
  }

// 清理缓存
export function clearCache() {
  swAPI.clearCache();
}

// 设置 Service Worker 配置
export function setConfig(config: any) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_CONFIG', data: config });
  }
} 