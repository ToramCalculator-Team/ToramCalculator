import { CompiledQuery, DatabaseConnection, QueryResult } from "kysely"
import { PGlite } from "@electric-sql/pglite"

export class PGliteConnection implements DatabaseConnection {
  private readonly client: PGlite

  constructor(client: PGlite) {
    this.client = client
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const result = await this.client.query(compiledQuery.sql, [
      ...compiledQuery.parameters,
    ])

    if (result.affectedRows) {
      const numAffectedRows = BigInt(result.affectedRows)
      return {
        numUpdatedOrDeletedRows: numAffectedRows,
        numAffectedRows,
        rows: result.rows as O[],
      }
    }

    return {
      rows: result.rows as O[],
    }
  }

  async *streamQuery<O>(
    _compiledQuery: CompiledQuery,
    _chunkSize: number
  ): AsyncIterableIterator<QueryResult<O>> {
    throw new Error("PGLite Driver does not support streaming")
  }
}
