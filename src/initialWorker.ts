import { live } from "@electric-sql/pglite/live";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import { electricSync } from "@electric-sql/pglite-sync";
import PGWorker from "~/worker/PGlite.worker?worker";
import { setStore } from "./store";
import type { syncMessage } from "./worker/PGlite.worker";

export type AppPgWorker = Awaited<ReturnType<typeof PGliteWorker.create>>;

// 单例生命周期状态：
// - promise 防并发重复创建
// - instance 提供已初始化句柄复用
// - host 保留给 sync-control postMessage 使用
let pgWorkerHost: Worker | undefined;
let pgWorkerPromise: Promise<AppPgWorker> | undefined;
let pgWorkerInstance: AppPgWorker | undefined;

const bindSyncMessageBridge = (host: Worker) => {
	host.onmessage = (e) => {
		if (e.type === "message") {
			if (e.data.type === "sync") {
				const data = (e.data as syncMessage).data;
				setStore("database", "tableSyncState", data.tableName, true);
				// console.log(data.tableName + "已同步完毕");
			}
		}
	};
};

export const createPgWorker = async (): Promise<AppPgWorker> => {
	if (pgWorkerInstance) {
		return pgWorkerInstance;
	}
	if (!pgWorkerPromise) {
		// 首次调用负责真正初始化；后续调用都复用同一个 Promise。
		// console.log(performance.now(), "PGliteWorker初始化开始");
		const host = new PGWorker();
		pgWorkerHost = host;
		bindSyncMessageBridge(host);

		pgWorkerPromise = PGliteWorker.create(host, {
			extensions: { live, sync: electricSync({ debug: false }) },
		}).then((worker) => {
			pgWorkerInstance = worker;
			return worker;
		});
	}

	return pgWorkerPromise;
};

export const getPgWorker = () => {
	// 命令式读取：给“已知 bootstrap 完成”的场景使用。
	// 若调用方无法保证时序，应优先 await createPgWorker()。
	if (!pgWorkerInstance) {
		throw new Error("pgWorker is not initialized. Call createPgWorker() first.");
	}
	return pgWorkerInstance;
};

// 导出同步控制函数
const postSyncControl = async (action: "start" | "stop") => {
	// 防御：即使 UI 先触发 start/stop，也会先把 worker 拉起，避免消息丢失。
	await createPgWorker();
	pgWorkerHost?.postMessage({ type: "sync-control", action });
};

export const syncControl = {
	start: () => {
		void postSyncControl("start");
	},
	stop: () => {
		void postSyncControl("stop");
	},
};

// 初始化数据层服务
// const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
// export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
// export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
