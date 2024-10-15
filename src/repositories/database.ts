import { DB } from '~/repositories/db/types' // this is the Database interface we defined earlier
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'

const dialect = new PostgresDialect({
  pool: new Pool({
    // database: 'test',
    // host: 'localhost',
    // user: 'postgres',
    // port: 5432,
    // max: 10,
  })
})

export const db = new Kysely<DB>({
  dialect,
})