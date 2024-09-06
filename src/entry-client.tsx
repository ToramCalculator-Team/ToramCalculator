// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";

import PGliteWorkerUrl from "~/worker/PGliteWorker?worker&url";
import serviceWorkerUrl from "~/worker/serviceWorker?worker&url";
import dataWorker from "~/worker/dataWorker?sharedworker";

import { dw } from "./worker/dataWorker";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

// 初始化本地数据库
export const pg = await PGliteWorker.create(
  new Worker(PGliteWorkerUrl, {
    type: "module",
  }),
);

// 初始化数据层服务
const worker = new dataWorker;
/**
 * SharedWorkers communicate via the `postMessage` function in their `port` property.
 * Therefore you must use the SharedWorker's `port` property when calling `Comlink.wrap`.
 */

const dataworker = Comlink.wrap<typeof dw>(worker.port);
const proxiedPg = Comlink.proxy(pg);  // 使用 proxy 包装
console.log(await dataworker.counter);
console.log(await dataworker.getMonsterList(proxiedPg));

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
