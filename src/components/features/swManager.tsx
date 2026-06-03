import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons/index";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import * as swClient from "~/worker/sw/client";
import type { SWContext } from "~/worker/sw/types";

// 默认安全的 SWContext，避免 undefined 访问
const defaultSWContext: SWContext = {
	cacheStatus: {
		core: false,
		assets: new Map(),
		data: new Map(),
		pages: new Map(),
		warm: {
			inProgress: false,
			done: 0,
			total: 0,
			failed: 0,
			bytes: 0,
		},
		manifestVersion: "",
		lastUpdate: "",
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
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

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

	// 配置变更处理（精简：启停直接走指令；间隔通过 setConfig 下发）
	const handleSwConfigChange = (key: keyof typeof store.sw, value: any) => {
		setStore("sw", key, value);
		if (key === "periodicCheckEnabled") {
			if (value) swClient.startPeriodicCheck();
			else swClient.stopPeriodicCheck();
		} else if (key === "periodicCheckInterval") {
			swClient.setConfig({ periodicCheckInterval: value });
			swClient.getCheckStatus();
		} else if (key === "cacheStrategy") {
			swClient.setConfig({ cacheStrategy: value });
		}
	};

	onMount(async () => {
		try {
			setIsLoading(true);

			const available = "serviceWorker" in navigator;
			setIsAvailable(available);

			if (available) {
				// 订阅 SW 消息流（返回取消订阅函数）
				const unsubscribe = swClient.subscribe((msg: any) => {
					if (!msg || !msg.type) return;
					switch (msg.type) {
						case "CHECK_STATUS": {
							setState((prev) => ({
								...prev,
								periodicCheck: {
									...prev.periodicCheck,
									isRunning: !!msg.data?.isRunning,
									lastCheckTime: msg.data?.lastCheckTime ?? prev.periodicCheck.lastCheckTime,
									currentInterval: msg.data?.currentInterval ?? prev.periodicCheck.currentInterval,
									nextCheckTime: msg.data?.nextCheckTime ?? prev.periodicCheck.nextCheckTime,
									consecutiveFailures: prev.periodicCheck.consecutiveFailures,
								},
							}));
							break;
						}
						case "VERSION_STATUS":
						case "RELEASE_STATUS": {
							setState((prev) => ({
								...prev,
								cacheStatus: {
									...prev.cacheStatus,
									manifestVersion: msg.data?.version ?? prev.cacheStatus.manifestVersion,
									lastUpdate: new Date().toISOString(),
								},
							}));
							break;
						}
						case "CACHE_UPDATED":
						case "UPDATE_READY":
						case "FORCE_UPDATE_COMPLETED":
						case "CACHE_CLEARED":
						case "PERIODIC_CHECK_COMPLETED":
						case "PERIODIC_CHECK_FAILED": {
							swClient.getVersionStatus();
							swClient.getCheckStatus();
							swClient.getCacheStatus();
							break;
						}
						case "UPDATE_FAILED": {
							setError(msg.data?.message ?? "Update failed");
							break;
						}
						case "PERIODIC_CHECK_STARTED":
						case "PERIODIC_CHECK_STOPPED": {
							swClient.getCheckStatus();
							swClient.getCacheStatus();
							break;
						}
						case "WARM_CACHE_PROGRESS": {
							setState((prev) => ({
								...prev,
								cacheStatus: {
									...prev.cacheStatus,
									warm: {
										...prev.cacheStatus.warm,
										inProgress: true,
										done: msg.data?.done ?? prev.cacheStatus.warm.done,
										total: msg.data?.total ?? prev.cacheStatus.warm.total,
										failed: msg.data?.failed ?? prev.cacheStatus.warm.failed,
										bytes: msg.data?.bytes ?? prev.cacheStatus.warm.bytes,
										lastUpdate: new Date().toISOString(),
									},
								},
							}));
							break;
						}
						case "WARM_CACHE_COMPLETED":
						case "WARM_CACHE_FAILED": {
							setState((prev) => ({
								...prev,
								cacheStatus: {
									...prev.cacheStatus,
									warm: {
										...prev.cacheStatus.warm,
										inProgress: false,
										total: msg.data?.total ?? prev.cacheStatus.warm.total,
										failed: msg.data?.failed ?? prev.cacheStatus.warm.failed,
										bytes: msg.data?.bytes ?? prev.cacheStatus.warm.bytes,
										lastUpdate: new Date().toISOString(),
									},
								},
							}));
							swClient.getCacheStatus();
							break;
						}
						case "CACHE_STATUS": {
							setState((prev) => ({
								...prev,
								cacheStatus: {
									...prev.cacheStatus,
									core: !!msg.data?.core,
									assets: msg.data?.assets ? new Map(msg.data.assets) : prev.cacheStatus.assets,
									data: prev.cacheStatus.data,
									pages: prev.cacheStatus.pages,
									warm: msg.data?.warm ?? prev.cacheStatus.warm,
								},
							}));
							break;
						}
						default:
							break;
					}
				});
				onCleanup(unsubscribe);

				// 主动拉取当前状态
				swClient.getVersionStatus();
				swClient.getCheckStatus();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
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
			setError(err instanceof Error ? err.message : "Failed to check cache version");
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
			setError(err instanceof Error ? err.message : "Failed to force update");
		} finally {
			setIsLoading(false);
		}
	};

	const handleWarmCache = () => {
		try {
			setIsLoading(true);
			setError(null);
			swClient.warmCache({ mode: "all", force: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to warm cache");
		} finally {
			setIsLoading(false);
		}
	};

	const handleClearCache = () => {
		if (!confirm("Are you sure you want to clear all cache? This will remove all offline data.")) {
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			swClient.clearCache();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to clear cache");
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
			setError(err instanceof Error ? err.message : "Failed to start periodic check");
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
			setError(err instanceof Error ? err.message : "Failed to stop periodic check");
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
				<h3 class="flex items-center gap-2 text-lg font-semibold">
					<Icons.Outline.CloudUpload />
					Service Worker 管理
				</h3>
				<p class="text-sm text-gray-600">管理离线缓存和自动更新功能</p>
			</div>

			{/* 状态显示 */}
			<div class="StatusSection rounded-lg border p-4">
				<h4 class="mb-3 font-medium">当前状态</h4>

				<Show when={!isAvailable()}>
					<div class="text-sm text-red-500">Service Worker 不可用</div>
				</Show>

				<Show when={isAvailable() && state() && state().periodicCheck}>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="font-medium">状态:</span>
							<span class="ml-2">{state().isUpdating ? "更新中" : state().isChecking ? "检查中" : "空闲"}</span>
						</div>
						<div>
							<span class="font-medium">核心缓存:</span>
							<span class="ml-2">{state().cacheStatus.core ? "✅" : "❌"}</span>
						</div>
						<div>
							<span class="font-medium">定期检查:</span>
							<span class="ml-2">{state().periodicCheck.isRunning ? "🔄 运行中" : "⏹️ 已停止"}</span>
						</div>
						<div>
							<span class="font-medium">最后检查:</span>
							<span class="ml-2">
								{state().periodicCheck.lastCheckTime
									? new Date(state().periodicCheck.lastCheckTime).toLocaleString()
									: "从未"}
							</span>
						</div>
					</div>
				</Show>
			</div>

			{/* 错误显示 */}
			<Show when={error()}>
				<div class="ErrorSection rounded-lg border border-red-200 bg-red-50 p-4">
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
				<Button onClick={handleCheckCacheVersion} disabled={!isAvailable() || isLoading()}>
					🔄 检查更新
				</Button>

				<Button onClick={handleForceUpdate} disabled={!isAvailable() || isLoading()}>
					⬇️ 强制更新
				</Button>

				<Button onClick={handleWarmCache} disabled={!isAvailable() || isLoading()}>
					完整离线缓存
				</Button>

				<Button onClick={handleClearCache} disabled={!isAvailable() || isLoading()} level="secondary">
					🗑️ 清理缓存
				</Button>
			</div>

			{/* 定期检查控制 */}
			<div class="PeriodicCheckSection rounded-lg border p-4">
				<h4 class="mb-3 font-medium">定期检查</h4>

				<div class="flex items-center justify-between">
					<div class="text-sm">
						<p>自动检查缓存更新</p>
						<p class="text-gray-600">
							当前间隔:{" "}
							{state()?.periodicCheck.currentInterval
								? `${Math.round(state().periodicCheck.currentInterval / 1000 / 60)}分钟`
								: "30分钟"}
						</p>
					</div>

					<div class="flex gap-2">
						<Show when={!state()?.periodicCheck.isRunning}>
							<Button onClick={handleStartPeriodicCheck} disabled={!isAvailable() || isLoading()} size="sm">
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
				<div class="CacheDetailsSection rounded-lg border p-4">
					<h4 class="mb-3 font-medium">缓存详情</h4>

					<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
						<div>
							<span class="font-medium">核心资源:</span>
							<span class="ml-2">{state().cacheStatus.core ? "已缓存" : "未缓存"}</span>
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
							<span class="ml-2">{state().cacheStatus.manifestVersion || "未知"}</span>
						</div>
						<div class="md:col-span-2">
							<span class="font-medium">最后更新:</span>
							<span class="ml-2">
								{state().cacheStatus.lastUpdate ? new Date(state().cacheStatus.lastUpdate!).toLocaleString() : "从未"}
							</span>
						</div>
					</div>
				</div>
			</Show>

			{/* 新增 SW 配置面板 */}
			<div class="WarmCacheSection rounded-lg border p-4">
				<h4 class="mb-3 font-medium">后台资源缓存</h4>
				<div class="text-sm">
					{state().cacheStatus.warm.inProgress
						? `缓存中：${state().cacheStatus.warm.done}/${state().cacheStatus.warm.total}`
						: state().cacheStatus.warm.total > 0
							? `已处理 ${state().cacheStatus.warm.done}/${state().cacheStatus.warm.total}，失败 ${state().cacheStatus.warm.failed}`
							: "未开始"}
				</div>
			</div>

			<div class="SwConfigSection rounded-lg border p-4">
				<h4 class="mb-3 font-medium">Service Worker 配置</h4>
				<div class="flex flex-col gap-2">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							checked={state().periodicCheck.isRunning}
							onInput={(e) => handleSwConfigChange("periodicCheckEnabled", e.currentTarget.checked)}
						/>
						启用定期检查
					</label>
					<label class="flex items-center gap-2">
						检查间隔：
						<input
							type="number"
							min={60000}
							step={60000}
							value={state().periodicCheck.currentInterval || localSwConfig().periodicCheckInterval}
							onInput={(e) => handleSwConfigChange("periodicCheckInterval", Number(e.currentTarget.value))}
						/>{" "}
						毫秒
					</label>
					<label class="flex items-center gap-2">
						缓存策略：
						<select
							value={localSwConfig().cacheStrategy}
							onInput={(e) => handleSwConfigChange("cacheStrategy", e.currentTarget.value)}
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
