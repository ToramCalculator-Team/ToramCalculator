import { sql } from "kysely";
import { getDB } from "@db/repositories/database";

// 同步延迟探针（生产模式，服务端常驻心跳）。
//
// 作用：服务端每 HEARTBEAT_INTERVAL_MS 向 sync_heartbeat 单行 upsert 一次 emitted_at（PG 时钟）。
// 客户端经 Electric 同步收到该行后，用本地时钟与 emitted_at 求差，得到“读路径端到端延迟”，
// 常驻显示在首页左下角。
//
// 注册方式：本文件默认导出即 Nitro plugin —— Nitro plugin 本质就是 `(nitroApp) => void`，
// 在服务端进程启动时执行一次（非 per-request）。定时器/单例/seq 等生命周期状态与启动入口
// 合并在同一文件，无需额外封装层。dev（vite dev）不会执行 Nitro plugin，生产持续探测由它承载；
// 开发模式的延迟测量走设置页的按需往返测量。

const HEARTBEAT_ID = "singleton";
const HEARTBEAT_INTERVAL_MS = 3_000;

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let seq = 0n;

/**
 * 设计目标：用一条 upsert 持续刷新固定单行心跳，让 Electric 把更新推送到所有客户端。
 * 函数职责：写入当前 seq 与 PG now()；写入失败只告警，不影响主流程。
 */
const writeHeartbeat = async (): Promise<void> => {
	try {
		const db = await getDB();
		seq += 1n;
		const nextSeq = seq.toString();
		await db
			.insertInto("sync_heartbeat")
			.values({
				id: HEARTBEAT_ID,
				// seq 列为 BIGINT，zod 类型映射为 string；统一传字符串避免 BigInt 序列化问题。
				seq: nextSeq,
				emitted_at: sql<string>`now()` as never,
			})
			.onConflict((oc) =>
				oc.column("id").doUpdateSet({
					seq: nextSeq,
					emitted_at: sql<string>`now()` as never,
				}),
			)
			.execute();
	} catch (error) {
		console.warn("[syncHeartbeat] 心跳写入失败:", error);
	}
};

/**
 * Nitro plugin 入口：服务端进程启动时执行一次。
 * 单例守卫保证一个进程只起一个定时器；立即写一次再周期写入。
 */
export default function syncHeartbeatPlugin() {
	if (typeof window !== "undefined" || heartbeatTimer) {
		return;
	}
	void writeHeartbeat();
	heartbeatTimer = setInterval(() => void writeHeartbeat(), HEARTBEAT_INTERVAL_MS);
	console.log("[syncHeartbeat] 同步延迟探针已启动");
}
