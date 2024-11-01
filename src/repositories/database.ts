import { DB } from "~/repositories/db/types";
import { Kysely, PostgresDialect } from "kysely";
import { PGliteDialect } from "./dialect/dialect";
import { initialPGWorker } from "~/initialWorker";
import { Pool } from "pg";

// const PGdialect = new PostgresDialect({
//   pool: new Pool({
//     database: 'postgres',
//     host: 'kiaclouth.com',
//     user: 'postgres',
//     port: 5432,
//     max: 10,
//   })
// })

// export const db = new Kysely<DB>({
//   dialect: PGdialect,
// })

const initialDatabase = async () => {
  return new Kysely<DB>({
  dialect: new PGliteDialect(await initialPGWorker()),
  })
};

export const db = await initialDatabase();