// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";

// =========================
// 资源加载进度显示
// =========================
const resourceList = document.getElementById("resource-list")!;
if (resourceList) {
  let totalResources = 32;
  let loadedResources = 0;
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      resourceList.innerHTML = `⏳ ${Math.floor((loadedResources * 100) / totalResources)}% ：${entry.name.replace("https://app.kiaclouth.com/_build/assets/", "")}`;
      loadedResources++;
    });
  });
  observer.observe({ type: "resource", buffered: true });
}

// =========================
// 缓存版本检查（仅生产环境下启用）
// =========================
async function checkCacheVersion() {
  // 仅在生产环境下执行缓存检查
  if (import.meta.env.MODE !== 'production') {
    console.info('[DEV] 跳过缓存版本检查（开发模式）');
    return;
  }
  try {
    // 获取最新的 chunk manifest
    const manifestResp = await fetch('/chunk-manifest.json');
    if (!manifestResp.ok) {
      console.warn('无法获取chunk manifest，使用离线缓存');
      return;
    }
    const manifest = await manifestResp.json();
    // 通知 Service Worker 检查缓存版本
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_CACHE_VERSION',
        data: { manifest }
      });
      console.log('已通知Service Worker检查缓存版本:', manifest.buildTime);
    }
  } catch (error) {
    console.warn('缓存版本检查失败，使用离线缓存:', error);
  }
}

// =========================
// Service Worker 注册与缓存检查
// =========================
if ("serviceWorker" in navigator) {
  // 根据环境选择不同的 Service Worker 路径
  const isProduction = import.meta.env.MODE === 'production';
  const swUrl = isProduction ? '/service.worker.js' : serviceWorkerUrl;
  
  console.log(`🔧 Service Worker 注册路径: ${swUrl} (${isProduction ? '生产环境' : '开发环境'})`);
  
  navigator.serviceWorker.register(swUrl, {
    type: "module",
  }).then((registration) => {
    console.log('✅ Service Worker 注册成功:', registration);
    
    // Service Worker 注册成功后，生产环境下检查缓存版本
    if (isProduction) {
      if (registration.active) {
        checkCacheVersion();
      } else {
        // 等待 Service Worker 激活后再检查
        registration.addEventListener('activate', () => {
          setTimeout(checkCacheVersion, 1000); // 延迟1秒确保SW完全激活
        });
      }
    } else {
      console.info('[DEV] 开发环境下跳过缓存版本检查');
    }
  }).catch((error) => {
    console.warn('Service Worker注册失败:', error);
  });
}

// =========================
// 挂载 SolidStart 应用入口
// =========================
OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
