import type { CompiledQuery, Kysely } from "kysely";

export type LiveQuerySubscription<T> = {
	initialRows: readonly T[];
	unsubscribe(): Promise<void>;
};

export type LiveQuerySource<T> = {
	subscribe(listener: (rows: readonly T[]) => void): Promise<LiveQuerySubscription<T>>;
	execute(): Promise<readonly T[]>;
};

type LiveQueryAdapter = {
	live: {
		query: <T>(
			sql: string,
			params: unknown[],
			callback: (result: { rows: T[] }) => void,
		) => Promise<{
			initialResults: { rows: T[] };
			unsubscribe: () => Promise<void>;
		}>;
	};
};

/** 为已编译的 Kysely 查询建立 PGlite live source；调用方负责查询身份和行协议。 */
export async function createKyselyLiveQuerySource<TDatabase, T>(
	kysely: Kysely<TDatabase>,
	compiled: CompiledQuery<T>,
): Promise<LiveQuerySource<T>> {
	const { createPgWorker } = await import("~/lib/pglite/pg");
	// PGliteWorker 的公开类型未携带扩展 namespace；运行实例由 pg.ts 明确以 live 扩展创建。
	const pgWorker = (await createPgWorker()) as unknown as LiveQueryAdapter;
	return {
		subscribe: async (listener) => {
			const subscription = await pgWorker.live.query<T>(compiled.sql, [...compiled.parameters] as unknown[], (result) =>
				listener(result.rows),
			);
			return {
				initialRows: subscription.initialResults.rows,
				unsubscribe: () => subscription.unsubscribe(),
			};
		},
		execute: async () => (await kysely.executeQuery<T>(compiled)).rows,
	};
}
