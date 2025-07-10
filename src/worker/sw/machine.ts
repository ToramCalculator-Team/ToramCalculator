/**
 * machine.ts - Service Worker 状态机定义
 *
 * 用途：
 *   - 只负责声明 Service Worker 的状态流转与上下文结构
 *   - 所有副作用（如缓存操作、定期检查等）通过 actor/invoke 注入，便于 mock 和测试
 *   - 不直接依赖底层实现，仅依赖 types
 *
 * 用法：
 *   import { swMachine, SWContext } from '@/worker/sw/machine';
 *
 * 依赖：
 *   - @/worker/sw/types
 *
 * 维护：架构师/全栈/工具开发
 */

import { createMachine, assign, fromPromise } from 'xstate';
import type { SWContext } from './types';
import { Logger } from '~/utils/logger';
import { CacheManager } from './main';
import { PERIODIC_CHECK_CONFIG } from './config';

export const swMachine = createMachine({
  id: 'serviceWorker',
  initial: 'idle',
  context: {
    cacheStatus: {
      core: false,
      assets: new Map(),
      data: new Map(),
      pages: new Map(),
      manifestVersion: undefined,
      lastUpdate: undefined,
    },
    periodicCheck: {
      isRunning: false,
      lastCheckTime: 0,
      consecutiveFailures: 0,
      currentInterval: 30 * 60 * 1000, // 30分钟
      nextCheckTime: 0,
    },
    error: null,
    isUpdating: false,
    isChecking: false,
  } as SWContext,
  
  states: {
    idle: {
      on: {
        START_PERIODIC_CHECK: {
          target: 'periodicCheck.running',
          actions: assign({
            periodicCheck: ({ context }) => ({
              ...context.periodicCheck,
              isRunning: true,
            }),
          }),
        },
        CHECK_CACHE_VERSION: {
          target: 'checking',
          actions: [
            () => { Logger.info('[SW][MACHINE] 收到 CHECK_CACHE_VERSION 事件'); },
            assign({
              isChecking: true,
              error: null,
            }),
          ],
        },
        FORCE_UPDATE: {
          target: 'updating',
          actions: [
            () => { Logger.info('[SW][MACHINE] 收到 FORCE_UPDATE 事件'); },
            assign({
              isUpdating: true,
              error: null,
            }),
          ],
        },
        CLEAR_CACHE: {
          target: 'clearing',
        },
      },
    },
    
    checking: {
      invoke: {
        src: 'checkCacheVersion',
        onDone: {
          target: 'idle',
          actions: assign({
            isChecking: false,
            cacheStatus: ({ event }) => event.output.cacheStatus,
            periodicCheck: ({ context }) => ({
              ...context.periodicCheck,
              lastCheckTime: Date.now(),
              consecutiveFailures: 0,
            }),
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            isChecking: false,
            error: ({ event }) => (event.error as Error).message,
            periodicCheck: ({ context }) => ({
              ...context.periodicCheck,
              consecutiveFailures: context.periodicCheck.consecutiveFailures + 1,
            }),
          }),
        },
      },
    },
    
    updating: {
      invoke: {
        src: 'forceUpdate',
        onDone: {
          target: 'idle',
          actions: assign({
            isUpdating: false,
            cacheStatus: ({ event }) => event.output.cacheStatus,
            periodicCheck: ({ context }) => ({
              ...context.periodicCheck,
              lastCheckTime: Date.now(),
            }),
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            isUpdating: false,
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    
    clearing: {
      invoke: {
        src: 'clearCache',
        onDone: {
          target: 'idle',
          actions: assign({
            cacheStatus: {
              core: false,
              assets: new Map(),
              data: new Map(),
              pages: new Map(),
              manifestVersion: undefined,
              lastUpdate: undefined,
            },
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    
    periodicCheck: {
      initial: 'running',
      states: {
        running: {
          invoke: {
            src: 'periodicCheck',
            onDone: {
              target: 'running',
              actions: assign({
                cacheStatus: ({ event }) => event.output.cacheStatus,
                periodicCheck: ({ context }) => ({
                  ...context.periodicCheck,
                  lastCheckTime: Date.now(),
                  consecutiveFailures: 0,
                }),
              }),
            },
            onError: {
              target: 'running',
              actions: assign({
                error: ({ event }) => (event.error as Error).message,
                periodicCheck: ({ context }) => ({
                  ...context.periodicCheck,
                  consecutiveFailures: context.periodicCheck.consecutiveFailures + 1,
                }),
              }),
            },
          },
          on: {
            STOP_PERIODIC_CHECK: {
              target: 'stopped',
              actions: assign({
                periodicCheck: ({ context }) => ({
                  ...context.periodicCheck,
                  isRunning: false,
                }),
              }),
            },
          },
        },
        stopped: {
          on: {
            START_PERIODIC_CHECK: {
              target: 'running',
              actions: assign({
                periodicCheck: ({ context }) => ({
                  ...context.periodicCheck,
                  isRunning: true,
                }),
              }),
            },
          },
        },
      },
    },
  },
}, {
  actors: {
    checkCacheVersion: fromPromise(async () => {
      Logger.info('[SW][ACTOR] 执行 checkCacheVersion (checkAndUpdateCache)');
      const cacheManager = CacheManager.getInstance();
      await cacheManager.checkAndUpdateCache();
      return { cacheStatus: await cacheManager.getCacheStatus() };
    }),
    forceUpdate: fromPromise(async () => {
      Logger.info('[SW][ACTOR] 执行 forceUpdate (cacheAllResources)');
      const cacheManager = CacheManager.getInstance();
      await cacheManager.cacheAllResources();
      return { cacheStatus: await cacheManager.getCacheStatus() };
    }),
    clearCache: fromPromise(async () => {
      Logger.info('[SW][ACTOR] 执行 clearCache');
      const cacheManager = CacheManager.getInstance();
      await cacheManager.clearOldCaches();
      return { cacheStatus: await cacheManager.getCacheStatus() };
    }),
    periodicCheck: fromPromise(async () => {
      Logger.info('[SW][ACTOR] 执行 periodicCheck (checkAndUpdateCache)');
      const cacheManager = CacheManager.getInstance();
      await cacheManager.checkAndUpdateCache();
      return { cacheStatus: await cacheManager.getCacheStatus() };
    }),
  },
}); 