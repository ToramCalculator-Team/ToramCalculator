/// <reference lib="webworker" />

(async (worker: ServiceWorkerGlobalScope) => {
  worker.addEventListener("install", (event) => {
    console.log("SW: install");
    event.waitUntil(worker.skipWaiting());
  });

  worker.addEventListener("activate", (event) => {
    console.log("SW: activate");
  });

  worker.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
  
    // 非同源资源不处理
    if (url.origin !== location.origin) return;
  
    // 现在开始只处理GET请求
    if (event.request.method !== 'GET') return;

    // console.log("SW: fetch", event.request.url);
  });
})(self as any);