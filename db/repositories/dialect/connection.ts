import type { PGliteWorker } from "@electric-sql/pglite/worker";
import type { CompiledQuery, DatabaseConnection, QueryResult } from "kysely";

export class PGliteConnection implements DatabaseConnection {
	private readonly client: PGliteWorker;

	constructor(client: PGliteWorker) {
		this.client = client;
	}

	async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
		const result = await this.client.query(compiledQuery.sql, [...compiledQuery.parameters]);

		if (result.affectedRows) {
			const numAffectedRows = BigInt(result.affectedRows);
			return {
				numAffectedRows,
				rows: result.rows as O[],
			};
		}

		return {
			rows: result.rows as O[],
		};
	}

	async *streamQuery<O>(_compiledQuery: CompiledQuery, _chunkSize: number): AsyncIterableIterator<QueryResult<O>> {
		// 满足生成器语法要求，但永远不会执行到这里
		yield { rows: [] as O[] };
		throw new Error("PGLite Driver does not support streaming");
	}
}
