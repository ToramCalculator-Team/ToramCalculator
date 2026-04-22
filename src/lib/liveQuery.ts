/**
 * @file liveQuery.ts
 * @description 把 Kysely 的编译查询接到 PGlite `live` 扩展，得到响应式行数据。
 *
 * 设计要点：
 * - Kysely 负责类型安全和 SQL 构造，`.compile()` 得到 { sql, parameters }
 * - PGlite live.query 订阅这条 SQL 的结果；当涉及表发生任何写入（Kysely 写入 / electric-sync 拉回 / PGlite DDL 等）
 *   都会触发回调，无需手动失效
 * - Solid 的 `createEffect` 追踪 queryFn 闭包内的 signal；signal 变化时重建订阅
 * - onCleanup 保证订阅释放
 * 
 * 为什么不直接返回 createResource：
 * - createResource 面向"一次性 Promise"模型，需要手动 refetch
 * - live.query 天然是订阅模型，直接包成 Signal 更贴合 Solid 反应式
 *
 * SSR 安全：
 * - createEffect 在服务端不执行；pgWorker 走动态 import 避免污染 SSR bundle
 */

import type { Compilable } from "kysely";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export type LiveQueryStatus = "idle" | "loading" | "ready" | "error";

export interface LiveKyselyQueryResult<T> {
	/** 查询结果（初始为空数组） */
	rows: Accessor<T[]>;
	/** 当前状态 */
	status: Accessor<LiveQueryStatus>;
	/** 若发生错误，这里会有 Error 对象 */
	error: Accessor<Error | undefined>;
}

type LiveQueryAdapter = {
	live: {
		query: (
			sql: string,
			params: unknown[],
			cb: (res: { rows: unknown[] }) => void,
		) => Promise<{ unsubscribe: (cb?: (res: unknown) => void) => Promise<void> }>;
	};
};
// 说明：PGliteWorker 的库类型没有完整暴露 live.query 泛型签名，
// 这里使用窄适配类型，仅覆盖当前文件真实依赖的最小接口。

/**
 * 把一个 Kysely 查询构造器挂到 PGlite live 订阅上。
 *
 * @example
 * ```ts
 * const { rows, status } = createLiveKyselyQuery(async () => {
 *   const db = await getDB();
 *   return db.selectFrom("world").selectAll("world");
 * });
 * ```
 *
 * 注意：queryFn 必须返回一个 **可编译的 Kysely 查询构造器**（Compilable），
 * 不要调用 `.execute()`。queryFn 异步支持但不推荐在里面做副作用。
 */
export function createLiveKyselyQuery<T>(
	queryFn: () => Promise<Compilable<T> | null | undefined> | Compilable<T> | null | undefined,
): LiveKyselyQueryResult<T> {
	const [rows, setRows] = createSignal<T[]>([]);
	const [status, setStatus] = createSignal<LiveQueryStatus>("idle");
	const [error, setError] = createSignal<Error | undefined>();

	createEffect(() => {
		let disposed = false;
		let liveSub: { unsubscribe: (cb?: (res: unknown) => void) => Promise<void> } | undefined;

		setStatus("loading");
		setError(undefined);

		void (async () => {
			try {
				// 关键门控：在建立 live 订阅前等待 pgworker ready，规避首次启动竞态。
				const { waitFor } = await import("~/lib/bootstrap/context-standalone");
				await waitFor("pgworker");
				if (disposed) return;

				// 编译 Kysely 查询；queryFn 返回 null/undefined 表示当前不订阅
				const compilable = await queryFn();
				if (disposed) return;
				if (!compilable) {
					setRows(() => []);
					setStatus("idle");
					return;
				}
				const compiled = compilable.compile();

				// 动态导入，避免 SSR 触发 Worker 构造
				const { createPgWorker } = await import("~/initialWorker");
				const pgWorker = (await createPgWorker()) as unknown as LiveQueryAdapter;
				if (disposed) return;

				const sub = await pgWorker.live.query(
					compiled.sql,
					[...compiled.parameters] as unknown[],
					(res) => {
						if (disposed) return;
						setRows(() => res.rows as T[]);
						setStatus("ready");
					},
				);

				if (disposed) {
					await sub.unsubscribe();
					return;
				}
				liveSub = sub;
			} catch (e) {
				if (disposed) return;
				setError(e instanceof Error ? e : new Error(String(e)));
				setStatus("error");
				// eslint-disable-next-line no-console
				console.error("[liveQuery] 订阅失败", e);
			}
		})();

		onCleanup(() => {
			disposed = true;
			liveSub?.unsubscribe().catch(() => {
				/* ignore */
			});
		});
	});

	return { rows, status, error };
}
