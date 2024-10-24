import { DB } from "~/repositories/db/types";
import { Kysely } from "kysely";
import { PGliteDialect } from "./dialect/dialect";
import { initialPGWorker } from "~/initialWorker";

const initialDatabase = async () => {
  return new Kysely<DB>({
  dialect: new PGliteDialect(await initialPGWorker()),
  })
};

export const db = await initialDatabase();