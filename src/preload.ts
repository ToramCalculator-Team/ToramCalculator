// 在路由组件可见之前需要做的全局设置

import { Store } from "./store";

const storeStr = localStorage.getItem("store");
if (!storeStr) {
  document.documentElement.classList.add("light");
  document.documentElement.lang = "zh-CN";
} else {
  const storeCache = JSON.parse(storeStr) as unknown as Store;
  const root = document.documentElement;

  // Theme
  const theme = storeCache.settings.userInterface.theme ?? "light";
  root.classList.add(theme);

  // Animations
  const isAnimationEnabled = storeCache.settings.userInterface.isAnimationEnabled ?? true;
  if (!isAnimationEnabled) root.classList.add("transitionNone");

  // Language
  const language = storeCache.settings.userInterface.language ?? "zh-CN";
  root.lang = language;

  // Loading
  const loader = document.getElementById("loader");
  if (loader) {
    storeCache.pages.resourcesLoaded && loader.remove();
  }
}
