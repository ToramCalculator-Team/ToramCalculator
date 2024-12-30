import { PGliteWorker } from "@electric-sql/pglite/worker";
import { live } from "@electric-sql/pglite/live";
import PGWorker from "~/worker/PGlite.worker?worker";

console.log(performance.now(), "PGliteWorker初始化开始");
const pgWorker = await PGliteWorker.create(new PGWorker(), {
  extensions: { live }
});

console.log(performance.now(), "PGliteWorker初始化完成");

export { pgWorker };

// 初始化数据层服务
// const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
// export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
// export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
