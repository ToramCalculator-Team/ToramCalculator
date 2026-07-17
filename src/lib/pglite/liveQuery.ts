/** 把 Kysely 编译查询直接接到 PGlite live subscription，并投影为 Solid accessor。 */

import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import type { Compilable, Kysely } from "kysely";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { waitFor } from "~/lib/bootstrap/context-standalone";
import { createKyselyLiveQuerySource, type LiveQuerySubscription } from "./kyselyLiveQuerySource";

export type LiveQueryStatus = "idle" | "loading" | "ready" | "error";

export interface LiveKyselyQueryResult<T> {
	rows: Accessor<T[]>;
	status: Accessor<LiveQueryStatus>;
	error: Accessor<Error | undefined>;
}

/** 把一个 Kysely 查询构造器挂到本地 PGlite live 订阅。 */
export function createLiveKyselyQuery<T>(
	queryFn: (db: Kysely<DB>) => Compilable<T> | null | undefined,
): LiveKyselyQueryResult<T> {
	const [rows, setRows] = createSignal<T[]>([]);
	const [status, setStatus] = createSignal<LiveQueryStatus>("idle");
	const [error, setError] = createSignal<Error | undefined>();
	const [db, setDb] = createSignal<Kysely<DB> | undefined>();

	void (async () => {
		try {
			await waitFor("pgworker");
			const instance = await getDB();
			setDb(() => instance);
		} catch (cause) {
			setRows([]);
			setError(cause instanceof Error ? cause : new Error(String(cause)));
			setStatus("error");
		}
	})();

	createEffect(() => {
		const kysely = db();
		if (!kysely) {
			setStatus("loading");
			return;
		}

		let compilable: Compilable<T> | null | undefined;
		try {
			compilable = queryFn(kysely);
		} catch (cause) {
			setRows([]);
			setError(cause instanceof Error ? cause : new Error(String(cause)));
			setStatus("error");
			return;
		}

		if (!compilable) {
			setRows([]);
			setStatus("idle");
			setError(undefined);
			return;
		}

		let compiled: ReturnType<Compilable<T>["compile"]>;
		try {
			compiled = compilable.compile();
		} catch (cause) {
			setRows([]);
			setError(cause instanceof Error ? cause : new Error(String(cause)));
			setStatus("error");
			return;
		}

		let disposed = false;
		let subscription: LiveQuerySubscription<T> | null = null;
		setRows([]);
		setError(undefined);
		setStatus("loading");
		void createKyselyLiveQuerySource<DB, T>(kysely, compiled)
			.then((source) =>
				source.subscribe((nextRows) => {
					if (disposed) return;
					setRows([...nextRows]);
					setError(undefined);
					setStatus("ready");
				}),
			)
			.then(async (nextSubscription) => {
				if (disposed) {
					await nextSubscription.unsubscribe().catch(() => undefined);
					return;
				}
				subscription = nextSubscription;
				setRows([...nextSubscription.initialRows]);
				setError(undefined);
				setStatus("ready");
			})
			.catch((cause) => {
				if (disposed) return;
				setError(cause instanceof Error ? cause : new Error(String(cause)));
				setStatus("error");
			});

		onCleanup(() => {
			disposed = true;
			void subscription?.unsubscribe().catch(() => undefined);
		});
	});

	return {
		rows,
		status,
		error,
	};
}
