import { DB } from "~/../db/clientDB/kysely/kyesely";
import { Kysely, PostgresDialect } from "kysely";
import { PGliteDialect } from "./dialect/dialect";
import { pgWorker } from "~/initialWorker";
// import { Pool } from "pg";

// const PGdialect = new PostgresDialect({
//   pool: new Pool({
//     database: 'postgres',
//     host: 'localhost',
//     user: 'postgres',
//     port: 5432,
//     max: 10,
//   })
// })

// debugger
const initialDatabase = async () => {
  return new Kysely<DB>({
    dialect: new PGliteDialect(pgWorker),
    // log(event) {
    //   if (event.level === "query") {
    //     console.log(event.query.sql); // SQL 查询
    //     console.log(event.query.parameters); // 绑定参数
    //   }
    // },
  });
};

export const db = await initialDatabase();
