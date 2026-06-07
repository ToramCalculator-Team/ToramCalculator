import { live } from "@electric-sql/pglite/live";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import { electricSync } from "@electric-sql/pglite-sync";
import PGWorker from "~/worker/PGlite.worker?worker";
import { setStore } from "../../store";
import type { syncMessage } from "../../worker/PGlite.worker";

export type AppPgWorker = Awaited<ReturnType<typeof PGliteWorker.create>>;

// 单例生命周期状态：
// - promise 防并发重复创建
// - instance 提供已初始化句柄复用
// - host 保留给 sync-control postMessage 使用
let pgWorkerHost: Worker | undefined;
let pgWorkerPromise: Promise<AppPgWorker> | undefined;
let pgWorkerInstance: AppPgWorker | undefined;

/**
 * 设计目标：把 worker 内部的同步进度桥接到前端全局 store，供页面按表级 ready 做门控。
 * 函数职责：监听 PGlite worker 消息，只在表 initial sync 成功时更新 tableSyncState。
 */
const bindSyncMessageBridge = (host: Worker) => {
	host.onmessage = (e) => {
		if (e.type === "message") {
			if (e.data.type === "sync") {
				// 类型说明：Worker 消息入口由浏览器提供，运行时已用 type 字段收窄为同步进度消息。
				const data = (e.data as syncMessage).data;
				// 设计目的：后台同步会显式报告 fail；只有 initial sync 成功的表才能进入页面 ready 门控。
				if (data.state === "success") {
					setStore("database", "tableSyncState", data.tableName, true);
				}
				// console.log(data.tableName + "已同步完毕");
			}
		}
	};
};

/**
 * 设计目标：统一 PGlite worker 生命周期入口，让调用方拿到“schema ready 且可查询”的单例句柄。
 * 函数职责：创建/复用 worker Promise，绑定同步消息桥，并缓存初始化后的 PGliteWorker 实例。
 */
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

/**
 * 设计目标：为已知 bootstrap 完成的路径提供同步读取入口，避免重复 await。
 * 函数职责：返回已缓存的 worker 实例；若尚未初始化则明确抛错提示调用顺序问题。
 */
export const getPgWorker = () => {
	// 命令式读取：给“已知 bootstrap 完成”的场景使用。
	// 若调用方无法保证时序，应优先 await createPgWorker()。
	if (!pgWorkerInstance) {
		throw new Error("pgWorker is not initialized. Call createPgWorker() first.");
	}
	return pgWorkerInstance;
};

// 导出同步控制函数
/**
 * 设计目标：让写入同步控制命令复用同一个 worker 启动入口，避免消息发给尚未创建的 host。
 * 函数职责：确保 worker 已创建，然后把 start/stop 控制消息发送给 PGlite worker。
 */
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
