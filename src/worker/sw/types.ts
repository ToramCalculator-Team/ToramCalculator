/**
 * types.ts - Service Worker 相关类型定义
 *
 * 用途：
 *   - 集中管理所有与SW相关的类型声明，便于复用和维护
 *   - 包括消息类型、缓存状态、上下文、配置等
 *
 * 用法：
 *   import { SWMessage, CacheStatus, SWContext, ... } from '@/worker/sw/types';
 *
 * 依赖：无
 *
 * 维护：架构师/全栈/工具开发
 */

// 消息类型定义
export interface SWMessage {
  type:
    | 'CHECK_CACHE_VERSION'
    | 'CACHE_STATUS_REQUEST'
    | 'FORCE_UPDATE'
    | 'CLEAR_CACHE'
    | 'START_PERIODIC_CHECK'
    | 'STOP_PERIODIC_CHECK'
    | 'IMMEDIATE_CHECK'
    | 'GET_CHECK_STATUS'
    | 'SET_CONFIG';
  data?: any;
}

// 缓存状态类型
export interface CacheStatus {
  core: boolean;
  assets: Map<string, boolean>;
  data: Map<string, boolean>;
  pages: Map<string, boolean>;
  manifestVersion?: string;
  lastUpdate?: string;
}

// Service Worker 状态机上下文
export interface SWContext {
  cacheStatus: CacheStatus;
  periodicCheck: {
    isRunning: boolean;
    lastCheckTime: number;
    consecutiveFailures: number;
    currentInterval: number;
    nextCheckTime: number;
  };
  error: string | null;
  isUpdating: boolean;
  isChecking: boolean;
} 