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

    console.log("SW: fetch", event.request.url);
  });
})(self as any);

// const versionedCache = 'static-' + VERSION;
// const dynamicCache = 'dynamic';
// const expectedCaches = [versionedCache, dynamicCache];

// self.addEventListener('install', (event) => {
//   event.waitUntil(
//     (async function () {
//       const promises = [];
//       promises.push(cacheBasics(versionedCache));

//       // If the user has already interacted with the app, update the codecs too.
//       if (await get('user-interacted')) {
//         promises.push(cacheAdditionalProcessors(versionedCache));
//       }

//       await Promise.all(promises);
//     })(),
//   );
// });

// self.addEventListener('activate', (event) => {
//   self.clients.claim();

//   event.waitUntil(
//     (async function () {
//       // Remove old caches.
//       const promises = (await caches.keys()).map((cacheName) => {
//         if (!expectedCaches.includes(cacheName))
//           return caches.delete(cacheName);
//       });

//       await Promise.all<any>(promises);
//     })(),
//   );
// });

// self.addEventListener('fetch', (event) => {
//   const url = new URL(event.request.url);

//   // Don't care about other-origin URLs
//   if (url.origin !== location.origin) return;

//   if (url.pathname === '/editor') {
//     event.respondWith(Response.redirect('/'));
//     return;
//   }

//   if (
//     url.pathname === '/' &&
//     url.searchParams.has('share-target') &&
//     event.request.method === 'POST'
//   ) {
//     // serveShareTarget(event);
//     return;
//   }

//   // We only care about GET from here on in.
//   if (event.request.method !== 'GET') return;

//   if (shouldCacheDynamically(url.pathname)) {
//     cacheOrNetworkAndCache(event, dynamicCache);
//     cleanupCache(event, dynamicCache, ASSETS);
//     return;
//   }

//   cacheOrNetwork(event);
// });

// self.addEventListener('message', (event) => {
//   switch (event.data) {
//     case 'cache-all':
//       event.waitUntil(cacheAdditionalProcessors(versionedCache));
//       break;
//     case 'skip-waiting':
//       self.skipWaiting();
//       break;
//   }
// });