import { PGliteWorker } from "@electric-sql/pglite/worker";
import { live } from "@electric-sql/pglite/live";

import PGWorker from "~/worker/PGlite.worker?worker";

// 初始化本地数据库
export const initialPGWorker = () => {
  console.log("initialWorker", performance.now());
  console.log(self.constructor.name);
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    const storage = localStorage.getItem("store");
    return PGliteWorker.create(new PGWorker(), {
      extensions: {
        live,
      },
      meta: {
        dataDir: "idb://toramCalculatorDB",
        storage: storage,
      },
    });
  }
};

// 初始化数据层服务
// const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
// export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
// export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
