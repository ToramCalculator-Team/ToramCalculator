import { PGliteWorker } from "@electric-sql/pglite/worker";
import { live } from "@electric-sql/pglite/live";
import * as Comlink from "comlink";

import PGWorker from "~/worker/PGlite.worker?worker";
import dataWorker from "~/worker/data.worker?sharedworker";

import { DataWorkerApi } from "./worker/data.worker";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

// 初始化本地数据库
export const pgWorker = await PGliteWorker.create(
  new PGWorker(), {
    extensions: {
      live,
    },
    meta: {
      dataDir: "idb://toramCalculatorDB",
    },
  },
);

// 初始化数据层服务
const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
