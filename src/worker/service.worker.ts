/// <reference lib="webworker" />

import { defaultSelectMonster } from "~/repositories/monster";

(async (worker: ServiceWorkerGlobalScope) => {

  worker.addEventListener("install", (event) => {
    event.waitUntil(worker.skipWaiting());
  });

  worker.addEventListener("activate", (event) => {
    console.log("SW: activate", defaultSelectMonster);
  });
  
  // worker.addEventListener("fetch", (event) => {
  //   console.log('SW: fetch', event.request.url);
  // });
})(self as any);
