/**
 * client.ts - 主线程与 SW 的薄封装
 *
 * 职责：
 * - 以 postMessage 方式向 SW 发送指令
 * - 提供最小的订阅接口，转发 SW 回传的消息
 */
type Listener = (data: any) => void;
const listeners = new Set<Listener>();

function post(type: string, data?: any) {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type, data });
  }
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    for (const l of listeners) l(event.data);
  });
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startPeriodicCheck() { post('START_PERIODIC_CHECK'); }
export function stopPeriodicCheck() { post('STOP_PERIODIC_CHECK'); }
export function checkCacheVersion() { post('CHECK_CACHE_VERSION'); }
export function forceUpdate() { post('FORCE_UPDATE'); }
export function clearCache() { post('CLEAR_CACHE'); }
export function getVersionStatus() { post('GET_VERSION_STATUS'); }
export function getCheckStatus() { post('GET_CHECK_STATUS'); }
export function setConfig(config: any) { post('SET_CONFIG', config); }

// 兼容原 getState
export function getState(): any { return undefined; } 

// 读取缓存状态（用于 UI 展示数量）
export function getCacheStatus() { post('CACHE_STATUS_REQUEST'); }