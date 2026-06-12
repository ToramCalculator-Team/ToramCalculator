import dotenv from "dotenv";
import { expand } from "dotenv-expand";
import { Pool } from "pg";

// 同步延迟探针（生产模式，服务端常驻心跳）。
//
// 作用：服务端每 HEARTBEAT_INTERVAL_MS 向 sync_heartbeat 单行 upsert 一次 emitted_at（PG 时钟）。
// 客户端经 Electric 同步收到该行后，用本地时钟与 emitted_at 求差，得到“读路径端到端延迟”，
// 常驻显示在首页左下角。
//
// 注册方式：本文件默认导出即 Nitro plugin —— Nitro plugin 本质就是 `(nitroApp) => void`，
// 在服务端进程启动时执行一次（非 per-request）。dev（vite dev）不会执行 Nitro plugin，
// 生产持续探测由它承载；开发模式的延迟测量走设置页的按需往返测量。
//
// 自包含设计：本 plugin 通过 nitroV2Plugin({ plugins }) 单独注册，走 Nitro 自己的打包路径，
// 不经过 vite.config 的 resolve.alias。因此不能复用 @db/repositories/database（其依赖链牵连
// 客户端 ~/lib 别名，Nitro 无法解析）。这里直接用 pg.Pool + 原生 SQL 做单行 upsert，
// 仅依赖 pg 这一个 npm 包，彻底切断对应用别名链的依赖。

const HEARTBEAT_ID = "singleton";
const HEARTBEAT_INTERVAL_MS = 3_000;

let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let pool: Pool | undefined;
let seq = 0n;

/**
 * 设计目标：复用单个连接池，避免每次心跳新建连接。
 * 函数职责：惰性创建并缓存 pg.Pool，连接参数取自服务端环境变量（与应用其余服务端连接一致）。
 * 注意：`node .output/server/index.mjs` 不会自动加载 .env，需显式 dotenv + dotenv-expand
 * （.env 内 PG_HOST=${VITE_SERVER_HOST} 用了变量展开，必须 expand）。
 */
const getPool = async (): Promise<Pool> => {
	if (!pool) {
		expand(dotenv.config());
		pool = new Pool({
			host: process.env.PG_HOST,
			user: process.env.PG_USERNAME,
			password: process.env.PG_PASSWORD,
			database: process.env.PG_DBNAME,
			max: 2,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 2_000,
		});
	}
	return pool;
};

/**
 * 设计目标：用一条 upsert 持续刷新固定单行心跳，让 Electric 把更新推送到所有客户端。
 * 函数职责：写入当前 seq 与 PG now()；写入失败只告警，不影响主流程。
 */
const writeHeartbeat = async (): Promise<void> => {
	try {
		seq += 1n;
		const db = await getPool();
		await db.query(
			`INSERT INTO sync_heartbeat (id, seq, emitted_at)
			 VALUES ($1, $2, now())
			 ON CONFLICT (id) DO UPDATE SET seq = EXCLUDED.seq, emitted_at = now()`,
			[HEARTBEAT_ID, seq.toString()],
		);
	} catch (error) {
		console.warn("[syncHeartbeat] 心跳写入失败:", error);
	}
};

/**
 * Nitro plugin 入口：服务端进程启动时执行一次。
 * 单例守卫保证一个进程只起一个定时器；立即写一次再周期写入。
 */
export default function syncHeartbeatPlugin() {
	if (heartbeatTimer) {
		return;
	}
	void writeHeartbeat();
	heartbeatTimer = setInterval(() => void writeHeartbeat(), HEARTBEAT_INTERVAL_MS);
	console.log("[syncHeartbeat] 同步延迟探针已启动");
}
