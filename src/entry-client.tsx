// @refresh reload
import "~/styles/app.css";
import "~/lib/babylon/registerBuiltinShaders";
import "overlayscrollbars/overlayscrollbars.css";
import { mount, StartClient } from "@solidjs/start/client";
import { ClickScrollPlugin, OverlayScrollbars } from "overlayscrollbars";
import { ResourcesLoader } from "./components/effects/resourcesLoder";
import { LogLevel, setGlobalLogLevel } from "./lib/Logger";
import { getActStore, initialStore, setStore, store } from "./store";


// =========================
// 生成环境下将日志降级到仅报错
// =========================
if (!import.meta.env.DEV) {
	setGlobalLogLevel(LogLevel.ERROR);
}

// =========================
// 查询本地存储中的store，并设置页面状态
// =========================
const hasStore = !!localStorage.getItem("store");
if (hasStore) {
	// 说明不是初次加载，根据本地配置，修改页面状态
	setStore(getActStore());
} else {
	// 初次加载时使用默认配置
	setStore(initialStore);
	// 添加资源加载动画
	mount(() => <ResourcesLoader />, document.body);
}

// =========================
// 替换服务端提供的html模板内的缺省值内容
// =========================
const html = document.documentElement;
if (html) {
	// 设置主题模式和版本
	html.dataset.themeMode = store.settings.userInterface.theme;
	html.dataset.themeVersion = store.settings.userInterface.themeVersion;
	// 设置语言
	html.lang = store.settings.userInterface.language;
	// 设置是否启用动画
	html.classList.toggle("transitionNone", !store.settings.userInterface.isAnimationEnabled);
}

// =========================
// 资源加载进度显示
// =========================
const resourceList = document.getElementById("resource-list");
const startupProgressBar = document.getElementById("startup-progress-bar");
if (resourceList) {
	const FIRST_SCREEN_READY_EVENT = "app:first-screen-ready";

	type StartupManifestEntry = {
		fileName: string;
		size: number;
		kind?: string;
	};

	type StartupManifest = {
		startup?: StartupManifestEntry[];
		chunks?: {
			core?: StartupManifestEntry[];
		};
		assets?: {
			core?: StartupManifestEntry[];
		};
	};

	const isProduction = Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);
	const progressBar = startupProgressBar instanceof HTMLElement ? startupProgressBar : null;

	const setProgressBarWidth = (percent: number) => {
		if (!progressBar) return;
		progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
	};

	const formatBytes = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	};

	const formatSeconds = (seconds: number) => {
		if (!Number.isFinite(seconds) || seconds <= 0) return "正在计算";
		if (seconds < 1) return "少于 1 秒";
		if (seconds < 60) return `约 ${Math.ceil(seconds)} 秒`;
		return `约 ${Math.ceil(seconds / 60)} 分钟`;
	};

	const normalizeResourcePath = (value: string) => {
		try {
			const url = new URL(value, window.location.href);
			if (url.origin !== window.location.origin) return "";
			return url.pathname;
		} catch {
			return value.startsWith("/") ? value : `/${value}`;
		}
	};

	const toResourcePath = (fileName: string) => (fileName.startsWith("/") ? fileName : `/${fileName}`);

	const uniqueManifestEntries = (entries: StartupManifestEntry[]) => {
		const seen = new Set<string>();
		const result: StartupManifestEntry[] = [];
		for (const entry of entries) {
			if (!entry.fileName) continue;
			const fileName = toResourcePath(entry.fileName);
			if (seen.has(fileName)) continue;
			seen.add(fileName);
			result.push({ ...entry, fileName, size: Math.max(0, entry.size || 0) });
		}
		return result;
	};

	const createDevelopmentResourceCounter = () => {
		let loadedResources = 0;
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				loadedResources++;
				const assetUrl = new URL(entry.name, window.location.href);
				const assetName = assetUrl.pathname.split("/").pop() || assetUrl.pathname;
				// 开发模式存在 HMR 与按需模块，资源总数没有稳定分母，因此只显示真实加载事件。
				resourceList.textContent = `开发模式按需加载 ${loadedResources}：${assetName}`;
			}
		});
		observer.observe({ type: "resource", buffered: true });
		window.addEventListener("load", () => observer.disconnect(), { once: true });
	};

	const createProductionStartupProgress = async () => {
		const startedAt = performance.now();
		const trackedByPath = new Map<string, StartupManifestEntry>();
		const loadedPaths = new Set<string>();
		let trackedEntries: StartupManifestEntry[] = [];
		let totalBytes = 0;
		let loadedBytes = 0;
		let currentAsset = "";

		const update = (complete = false) => {
			const percent = complete
				? 100
				: totalBytes > 0
					? Math.min(95, Math.floor((loadedBytes / totalBytes) * 95))
					: 0;
			setProgressBarWidth(percent);

			if (complete) {
				resourceList.textContent = "首屏加载 100% · 即将显示";
				return;
			}

			const remainingBytes = Math.max(totalBytes - loadedBytes, 0);
			const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
			const bytesPerSecond = loadedBytes / elapsedSeconds;
			const eta =
				remainingBytes === 0
					? "首屏渲染中"
					: bytesPerSecond > 1024 && elapsedSeconds > 0.5
						? formatSeconds(remainingBytes / bytesPerSecond)
						: `剩余 ${formatBytes(remainingBytes)}`;

			const current = currentAsset ? ` · ${currentAsset}` : "";
			resourceList.textContent = `首屏加载 ${percent}% · ${loadedPaths.size}/${trackedEntries.length} · ${eta}${current}`;
		};

		const markLoaded = (entry: PerformanceEntry) => {
			const resourcePath = normalizeResourcePath(entry.name);
			const manifestEntry = trackedByPath.get(resourcePath);
			if (!manifestEntry || loadedPaths.has(resourcePath)) return;

			loadedPaths.add(resourcePath);
			loadedBytes += manifestEntry.size;
			currentAsset = resourcePath.split("/").pop() || resourcePath;
			update();
		};

		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				markLoaded(entry);
			}
		});

		window.addEventListener(
			FIRST_SCREEN_READY_EVENT,
			() => {
				update(true);
				observer.disconnect();
			},
			{ once: true },
		);

		try {
			observer.observe({ type: "resource", buffered: true });
			resourceList.textContent = "首屏加载 0% · 正在读取资源清单";

			const response = await fetch("/chunk-manifest.json", { cache: "no-cache" });
			const manifest: StartupManifest = response.ok ? await response.json() : {};
			// startup 是生产首屏进度的分母；旧 manifest 没有 startup 时回退到 core。
			trackedEntries = uniqueManifestEntries([
				...(manifest.startup ?? []),
				...(!manifest.startup ? (manifest.chunks?.core ?? []) : []),
				...(!manifest.startup ? (manifest.assets?.core ?? []) : []),
			]);

			for (const entry of trackedEntries) {
				trackedByPath.set(entry.fileName, entry);
				totalBytes += entry.size;
			}

			for (const entry of performance.getEntriesByType("resource")) {
				markLoaded(entry);
			}

			update();
		} catch {
			observer.disconnect();
			resourceList.textContent = "首屏加载中";
		}
	};

	if (isProduction) {
		void createProductionStartupProgress();
	} else {
		createDevelopmentResourceCounter();
	}
}

// =========================
// 挂载 SolidStart 应用入口
// =========================
OverlayScrollbars.plugin(ClickScrollPlugin);
const root = document.getElementById("app");
if (root) {
	mount(() => <StartClient />, root);
} else {
	console.error("无法找到根元素");
}
