import { DB } from "~/repositories/db/types";
import { Kysely } from "kysely";
import { PGliteDialect } from "./dialect/dialect";
import { initialPGWorker } from "~/initialWorker";

export const db = new Kysely<DB>({
  dialect: new PGliteDialect(await initialPGWorker()),
});