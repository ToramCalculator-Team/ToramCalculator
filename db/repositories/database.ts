import { Kysely } from "kysely";
import type { DB } from "../generated/zod/index";

let cachedDB: Kysely<DB> | undefined;

const getDB = async (): Promise<Kysely<DB>> => {
	if (cachedDB) {
		return cachedDB;
	}

	const isServer = typeof window === "undefined";

	if (isServer) {
		// 服务端模块导入
		const pg = await import("pg");
		const dotenv = await import("dotenv");
		const expand = await import("dotenv-expand");
		expand.expand(dotenv.config());
		const Pool = pg.default?.Pool ?? pg.Pool;
		const { PostgresDialect } = await import("kysely");

		// 连接池创建
		const pool = new Pool({
			host: process.env.PG_HOST,
			user: process.env.PG_USERNAME,
			password: process.env.PG_PASSWORD,
			database: process.env.PG_DBNAME,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		// Kysely 实例创建
		cachedDB = new Kysely<DB>({
			dialect: new PostgresDialect({ pool }),
		});

		return cachedDB;
	} else {
		// 客户端模块导入
		const { PGliteDialect } = await import("./dialect/dialect");
		// 职责约束：repository 不再直接依赖顶层 await 导出的 worker，
		// 统一走 createPgWorker()，与 bootstrap 的启动编排保持同一入口。
		const { createPgWorker } = await import("~/initialWorker");
		const pgWorker = await createPgWorker();

		// Kysely 实例创建
		cachedDB = new Kysely<DB>({
			dialect: new PGliteDialect(pgWorker),
		});

		return cachedDB;
	}
};

export { getDB };
