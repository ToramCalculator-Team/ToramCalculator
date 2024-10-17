import { DB } from '~/repositories/db/types'
import { Kysely } from 'kysely'
import { PGliteDialect } from './dialect/dialect';
import { PGlite } from '@electric-sql/pglite';

export const db = new Kysely<DB>({
    dialect: new PGliteDialect(new PGlite()),
  })