/**
 * core/periodic.ts - 定期版本检查
 *
 * 职责：
 * - 以固定间隔触发一次外部传入的检查逻辑
 * - 暴露简单的状态与控制接口
 */
import { PERIODIC_CHECK_CONFIG } from '../config';

let timer: ReturnType<typeof setTimeout> | null = null;
let lastCheck = 0;
let running = false;

export function startPeriodicCheck(checkOnce: () => Promise<void>): void {
  if (running) return;
  running = true;
  const tick = async () => {
    if (!running) return;
    lastCheck = Date.now();
    try { await checkOnce(); } finally {
      timer = setTimeout(tick, PERIODIC_CHECK_CONFIG.INTERVAL);
    }
  };
  timer = setTimeout(tick, PERIODIC_CHECK_CONFIG.INTERVAL);
}

export function stopPeriodicCheck(): void {
  running = false;
  if (timer) { clearTimeout(timer); timer = null; }
}

export function getCheckStatus() {
  return {
    isRunning: running,
    lastCheckTime: lastCheck,
    currentInterval: PERIODIC_CHECK_CONFIG.INTERVAL,
    nextCheckTime: lastCheck ? lastCheck + PERIODIC_CHECK_CONFIG.INTERVAL : 0
  };
}
