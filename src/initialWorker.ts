import { PGliteWorker } from "@electric-sql/pglite/worker";
import { live } from "@electric-sql/pglite/live";
import PGWorker from "~/worker/PGlite.worker?worker";
import { setStore, store } from "./store";
import { type syncMessage } from "./worker/PGlite.worker";
import { electricSync } from "@electric-sql/pglite-sync";

// console.log(performance.now(), "PGliteWorker初始化开始");
const pg_worker = new PGWorker();

// 同步状态接受
pg_worker.onmessage = (e) => {
  if (e.type === "message") {
    if (e.data.type === "sync") {
      const data = (e.data as syncMessage).data;
      setStore("database", "tableSyncState", data.tableName, true);
      // console.log(data.tableName + "已同步完毕");
    }
  }
};

const pgWorker = await PGliteWorker.create(pg_worker, {
  extensions: { live, sync: electricSync({ debug: false }) },
});

// console.log(performance.now(), "PGliteWorker初始化完成");

// 导出同步控制函数
export const syncControl = {
  start: () => pg_worker.postMessage({ type: "sync-control", action: "start" }),
  stop: () => pg_worker.postMessage({ type: "sync-control", action: "stop" })
};

export { pgWorker };

// 初始化数据层服务
// const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
// export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
// export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
