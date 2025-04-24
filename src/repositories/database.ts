import { Kysely } from "kysely";
import { DB } from "../../db/kysely/kyesely";

let cachedDB: Kysely<DB> | undefined;

const getDB = async (): Promise<Kysely<DB>> => {
  if (cachedDB) return cachedDB;

  const isServer = typeof window === "undefined";

  if (isServer) {
    const pg = await import("pg");
    const dotenv = await import("dotenv");
    const expand = await import("dotenv-expand");
    expand.expand(dotenv.config()); // Fixed: Using expand.expand() instead of expand.default()
    const Pool = pg.default?.Pool ?? pg.Pool;
    const { PostgresDialect } = await import("kysely");
    const pool = new Pool({
      host: process.env.PG_HOST,
      user: process.env.PG_USERNAME,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DBNAME,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    cachedDB = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
    });

    return cachedDB;
  } else {
    const { PGliteDialect } = await import("~/repositories/dialect/dialect");
    const { pgWorker } = await import("~/initialWorker");

    cachedDB = new Kysely<DB>({
      dialect: new PGliteDialect(pgWorker),
      log(event) {
        if (event.level === "error") {
            console.error("Query failed : ", {
              durationMs: event.queryDurationMillis,
              error: event.error,
              sql: event.query.sql,
            });
        } else { // `'query'`
          console.log("Query executed : ", {
            durationMs: event.queryDurationMillis,
            sql: event.query.sql,
            parameters: event.query.parameters
          });
        }
      }
    });

    return cachedDB;
  }
};

export { getDB };