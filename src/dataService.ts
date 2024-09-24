import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";

import PGliteWorkerUrl from "~/worker/PGliteWorker?worker&url";
import dataWorker from "~/worker/dataWorker?sharedworker";

import { dw } from "./worker/dataWorker";

// console.log("dataService loaded");

// 初始化本地数据库
export const pg = await PGliteWorker.create(
  new Worker(PGliteWorkerUrl, {
    type: "module",
  })
);

// 初始化数据层服务
const DW = new dataWorker()
export const DS = Comlink.wrap<typeof dw>(DW.port);
export const proxiedPg = Comlink.proxy(pg); // 使用 proxy 包装
