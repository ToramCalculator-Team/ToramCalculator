import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";

import PGliteWorkerUrl from "~/worker/PGliteWorker?worker&url";
import dataWorker from "~/worker/dataWorker?sharedworker";

import { dw } from "./worker/dataWorker";

// 此文件主要用于初始化worker和提供导出

// 初始化本地数据库
export const pgWorker = await PGliteWorker.create(
  new Worker(PGliteWorkerUrl, {
    type: "module",
  })
);

// 初始化数据层服务
const DW = new dataWorker()


// 提供导出
export const DS = Comlink.wrap<typeof dw>(DW.port);
export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
