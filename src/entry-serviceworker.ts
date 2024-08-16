/// <reference lib="webworker" />

(async (worker: ServiceWorkerGlobalScope) => {

  worker.addEventListener("install", (event) => {
    event.waitUntil(worker.skipWaiting());
  });
  // worker.addEventListener("fetch", (event) => {
  //   console.log('SW: fetch', event.request.url);
  // });
})(self as any);
