// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { mount, StartClient } from "@solidjs/start/client";
import { ClickScrollPlugin, OverlayScrollbars } from "overlayscrollbars";
import { ResourcesLoader } from "./components/effects/resourcesLoder";
import { getActStore, initialStore, setStore, store } from "./store";

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

// 替换服务端提供的html模板内的缺省值内容
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
if (resourceList) {
	const totalResources = 64;
	let loadedResources = 0;
	const observer = new PerformanceObserver((list) => {
		list.getEntries().forEach((entry) => {
			const assetName = entry.name.replace("https://app.kiaclouth.com/_build/assets/", "");
			resourceList.innerHTML = `⏳ ${Math.floor((loadedResources * 100) / totalResources)}% ：${assetName}`;
			loadedResources++;
		});
	});
	observer.observe({ type: "resource", buffered: true });
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
