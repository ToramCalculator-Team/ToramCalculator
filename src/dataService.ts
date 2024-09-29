import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";

import PGliteWorkerUrl from "~/worker/PGliteWorker?worker&url";
import dataWorker from "~/worker/dataWorker?sharedworker";

import { dw } from "./worker/dataWorker";

// console.log("dataService loaded");

// 初始化本地数据库
export const pgWorker = await PGliteWorker.create(
  new Worker(PGliteWorkerUrl, {
    type: "module",
  })
);

console.log(await pgWorker.exec("select * from public.user"));

// 初始化数据层服务
const DW = new dataWorker()
export const DS = Comlink.wrap<typeof dw>(DW.port);
export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
