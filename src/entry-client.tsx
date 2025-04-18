// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";

// console.log("entry-client");

// 资源加载进度
const resourceList = document.getElementById("resource-list")!;
if (resourceList) {
  let totalResources = 32;
  let loadedResources = 0;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      resourceList.innerHTML = `⏳ ${Math.floor((loadedResources * 100) / totalResources)}% ：${entry.name.replace("https://app.kiaclouth.com/_build/assets/", "")}`;

      // 模拟进度（实际需根据资源总数调整）
      loadedResources++;
      // console.log(`已加载资源数：${loadedResources}`);
      // totalResources++;
      // console.log(`已加载资源数：${totalResources}`);1
    });
  });
  observer.observe({ type: "resource", buffered: true });
}

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
