import { createEffect, createSignal, onCleanup, onMount, createMemo, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { CheckBox } from "~/components/controls/checkBox";
import { Toggle } from "~/components/controls/toggle";
import * as swClient from "~/worker/sw/client";
import { getDictionary } from "~/locales/i18n";
import { store, setStore } from "~/store";
import Icons from "~/components/icons/index";
import type { SWContext } from "~/worker/sw/types";

// 默认安全的 SWContext，避免 undefined 访问
const defaultSWContext: SWContext = {
  cacheStatus: {
    core: false,
    assets: new Map(),
    data: new Map(),
    pages: new Map(),
    manifestVersion: '',
    lastUpdate: '',
  },
  periodicCheck: {
    isRunning: false,
    lastCheckTime: 0,
    consecutiveFailures: 0,
    currentInterval: 0,
    nextCheckTime: 0,
  },
  error: null,
  isUpdating: false,
  isChecking: false,
};

export const ServiceWorkerManager = () => {
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  
  const [isAvailable, setIsAvailable] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [state, setState] = createSignal<SWContext>(defaultSWContext); // 默认值兜底
  const [error, setError] = createSignal<string | null>(null);

  // 新增：本地 sw 配置响应式副本
  const [localSwConfig, setLocalSwConfig] = createSignal({ ...store.sw });

  // 监听 store.sw 变化，自动同步到本地副本
  createEffect(() => {
    setLocalSwConfig({ ...store.sw });
  });

  // 配置变更处理
  const handleSwConfigChange = (key: keyof typeof store.sw, value: any) => {
    setStore('sw', key, value);
    // 可选：通过 swClient 通知 SW 配置变更（需确保 setConfig 存在）
    if (typeof (swClient as any).setConfig === 'function') {
      (swClient as any).setConfig({ ...store.sw, [key]: value });
    }
  };

  onMount(async () => {
    try {
      setIsLoading(true);
      
      // 检查Service Worker是否可用
      const available = 'serviceWorker' in navigator;
      setIsAvailable(available);
      
      if (available) {
        // 获取初始状态
        const initialState = swClient.getState();
        setState(initialState ?? defaultSWContext); // 明确兜底
        
        // 订阅状态变化
        const subscription = swClient.subscribe((newState: SWContext) => {
          setState(newState ?? defaultSWContext);
        });
        
        // 保存取消订阅函数
        onCleanup(() => subscription.unsubscribe());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  });

  const handleCheckCacheVersion = () => {
    try {
      setIsLoading(true);
      setError(null);
      swClient.checkCacheVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check cache version');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceUpdate = () => {
    try {
      setIsLoading(true);
      setError(null);
      swClient.forceUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force update');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm('Are you sure you want to clear all cache? This will remove all offline data.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      swClient.clearCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPeriodicCheck = () => {
    try {
      setIsLoading(true);
      setError(null);
      swClient.startPeriodicCheck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start periodic check');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopPeriodicCheck = () => {
    try {
      setIsLoading(true);
      setError(null);
      swClient.stopPeriodicCheck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop periodic check');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearError = () => {
    setError(null);
  };

  return (
    <div class="ServiceWorkerManager flex flex-col gap-4">
      <div class="Header">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <Icons.Outline.CloudUpload />
          Service Worker 管理
        </h3>
        <p class="text-sm text-gray-600">
          管理离线缓存和自动更新功能
        </p>
      </div>

      {/* 状态显示 */}
      <div class="StatusSection border rounded-lg p-4">
        <h4 class="font-medium mb-3">当前状态</h4>
        
        <Show when={!isAvailable()}>
          <div class="text-red-500 text-sm">
            Service Worker 不可用
          </div>
        </Show>
        
        <Show when={isAvailable() && state() && state().periodicCheck}>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">状态:</span>
              <span class="ml-2">{state().isUpdating ? '更新中' : state().isChecking ? '检查中' : '空闲'}</span>
            </div>
            <div>
              <span class="font-medium">核心缓存:</span>
              <span class="ml-2">{state().cacheStatus.core ? '✅' : '❌'}</span>
            </div>
            <div>
              <span class="font-medium">定期检查:</span>
              <span class="ml-2">{state().periodicCheck.isRunning ? '🔄 运行中' : '⏹️ 已停止'}</span>
            </div>
            <div>
              <span class="font-medium">最后检查:</span>
              <span class="ml-2">
                {state().periodicCheck.lastCheckTime
                  ? new Date(state().periodicCheck.lastCheckTime).toLocaleString()
                  : '从未'
                }
              </span>
            </div>
          </div>
        </Show>
      </div>

      {/* 错误显示 */}
      <Show when={error()}>
        <div class="ErrorSection border border-red-200 rounded-lg p-4 bg-red-50">
          <div class="flex items-center justify-between">
            <div class="text-red-700">
              <strong>错误:</strong> {error()}
            </div>
            <Button size="sm" onClick={handleClearError}>
              <Icons.Outline.Close />
            </Button>
          </div>
        </div>
      </Show>

      {/* 操作按钮 */}
      <div class="ActionsSection flex flex-wrap gap-2">
        <Button 
          onClick={handleCheckCacheVersion}
          disabled={!isAvailable() || isLoading()}
        >
          🔄 检查更新
        </Button>
        
        <Button 
          onClick={handleForceUpdate}
          disabled={!isAvailable() || isLoading()}
        >
          ⬇️ 强制更新
        </Button>
        
        <Button 
          onClick={handleClearCache}
          disabled={!isAvailable() || isLoading()}
          level="secondary"
        >
          🗑️ 清理缓存
        </Button>
      </div>

      {/* 定期检查控制 */}
      <div class="PeriodicCheckSection border rounded-lg p-4">
        <h4 class="font-medium mb-3">定期检查</h4>
        
        <div class="flex items-center justify-between">
          <div class="text-sm">
            <p>自动检查缓存更新</p>
            <p class="text-gray-600">
              当前间隔: {state()?.periodicCheck.currentInterval 
                ? `${Math.round(state().periodicCheck.currentInterval / 1000 / 60)}分钟`
                : '30分钟'
              }
            </p>
          </div>
          
                     <div class="flex gap-2">
             <Show when={!state()?.periodicCheck.isRunning}>
               <Button 
                 onClick={handleStartPeriodicCheck}
                 disabled={!isAvailable() || isLoading()}
                 size="sm"
               >
                 ▶️ 启动
               </Button>
             </Show>
             
             <Show when={state()?.periodicCheck.isRunning}>
               <Button 
                 onClick={handleStopPeriodicCheck}
                 disabled={!isAvailable() || isLoading()}
                 size="sm"
                 level="secondary"
               >
                 ⏸️ 停止
               </Button>
             </Show>
           </div>
        </div>
      </div>

      {/* 缓存状态详情 */}
      <Show when={state() && state().cacheStatus}>
        <div class="CacheDetailsSection border rounded-lg p-4">
          <h4 class="font-medium mb-3">缓存详情</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">核心资源:</span>
              <span class="ml-2">{state().cacheStatus.core ? '已缓存' : '未缓存'}</span>
            </div>
            <div>
              <span class="font-medium">资源文件:</span>
              <span class="ml-2">{state().cacheStatus.assets?.size ?? 0} 个</span>
            </div>
            <div>
              <span class="font-medium">数据缓存:</span>
              <span class="ml-2">{state().cacheStatus.data?.size ?? 0} 个</span>
            </div>
            <div>
              <span class="font-medium">页面缓存:</span>
              <span class="ml-2">{state().cacheStatus.pages?.size ?? 0} 个</span>
            </div>
            <div class="md:col-span-2">
              <span class="font-medium">Manifest版本:</span>
              <span class="ml-2">{state().cacheStatus.manifestVersion || '未知'}</span>
            </div>
            <div class="md:col-span-2">
              <span class="font-medium">最后更新:</span>
              <span class="ml-2">
                {state().cacheStatus.lastUpdate
                  ? new Date(state().cacheStatus.lastUpdate!).toLocaleString()
                  : '从未'
                }
              </span>
            </div>
          </div>
        </div>
      </Show>

      {/* 新增 SW 配置面板 */}
      <div class="SwConfigSection border rounded-lg p-4">
        <h4 class="font-medium mb-3">Service Worker 配置</h4>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2">
            <input type="checkbox"
              checked={localSwConfig().periodicCheckEnabled}
              onInput={e => handleSwConfigChange('periodicCheckEnabled', e.currentTarget.checked)}
            />
            启用定期检查
          </label>
          <label class="flex items-center gap-2">
            检查间隔：
            <input type="number" min={60000} step={60000}
              value={localSwConfig().periodicCheckInterval}
              onInput={e => handleSwConfigChange('periodicCheckInterval', Number(e.currentTarget.value))}
            /> 毫秒
          </label>
          <label class="flex items-center gap-2">
            缓存策略：
            <select
              value={localSwConfig().cacheStrategy}
              onInput={e => handleSwConfigChange('cacheStrategy', e.currentTarget.value)}
            >
              <option value="all">全部资源</option>
              <option value="core-only">仅核心</option>
              <option value="assets-only">仅静态资源</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}; 