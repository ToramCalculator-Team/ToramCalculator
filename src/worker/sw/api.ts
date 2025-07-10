/**
 * api.ts - Service Worker 状态与操作 API
 *
 * 用途：
 *   - 只暴露状态机的状态与操作（如 start/stop check, force update, clear cache 等）
 *   - 不直接操作底层缓存/网络，仅通过 machine 进行状态流转
 *   - 便于主线程通过 Comlink/XState 远程调用
 *
 * 用法：
 *   import * as swAPI from '@/worker/sw/api';
 *
 * 依赖：
 *   - @/worker/sw/machine
 *   - @/worker/sw/types
 *
 * 维护：架构师/全栈/工具开发
 */

import { swMachine } from './machine';
import type { SWContext } from './types';
import { createActor } from 'xstate';

// 单例 actor
const swActor = createActor(swMachine);
swActor.start();
  
// API: 获取当前状态
export function getState(): SWContext {
  return swActor.getSnapshot().context;
}

// API: 订阅状态变化
export function subscribe(listener: (ctx: SWContext) => void) {
  return swActor.subscribe((state) => listener(state.context));
}

// API: 启动定期检查
export function startPeriodicCheck() {
  swActor.send({ type: 'START_PERIODIC_CHECK' });
  }

// API: 停止定期检查
export function stopPeriodicCheck() {
  swActor.send({ type: 'STOP_PERIODIC_CHECK' });
  }

// API: 触发一次缓存检查
export function checkCacheVersion() {
  swActor.send({ type: 'CHECK_CACHE_VERSION' });
  }

// API: 强制更新
export function forceUpdate() {
  swActor.send({ type: 'FORCE_UPDATE' });
  }

// API: 清理缓存
export function clearCache() {
  swActor.send({ type: 'CLEAR_CACHE' });
} 