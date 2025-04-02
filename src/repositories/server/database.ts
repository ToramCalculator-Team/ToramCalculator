import { DB } from "~/../db/serverDB/kysely/kyesely";
import { Kysely, PostgresDialect } from "kysely";
import pkg from "pg";  // ✅ 兼容 CommonJS 的方式导入 pg
import { config } from "dotenv";
import { expand } from "dotenv-expand";

expand(config()); // 👈 让 .env 变量可以相互引用

const { Pool } = pkg;
const poolConfig: pkg.PoolConfig = {
  host: process.env.PG_HOST,
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DBNAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

const pool = new Pool(poolConfig);
const PGdialect = new PostgresDialect({
  pool,
});

const initialDatabase = async () => {
  return new Kysely<DB>({
    dialect: PGdialect,
  });
};

export const db = await initialDatabase();
