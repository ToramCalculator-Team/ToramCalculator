/**
 * @file liveQuery.ts
 * @description 把 Kysely 的编译查询接到 PGlite `live` 扩展，得到响应式行数据。
 *
 * 设计要点：
 * - Kysely 负责类型安全和 SQL 构造，`.compile()` 得到 { sql, parameters }
 * - PGlite live.query 订阅这条 SQL 的结果；当涉及表发生任何写入（Kysely 写入 / electric-sync 拉回 / PGlite DDL 等）
 *   都会触发回调，无需手动失效
 * - Solid 的 `createEffect` 同步调用 queryFn 收集依赖；signal 变化时重建订阅
 * - 异步资源（db 获取、pgworker 构造）内化到本文件，保证 queryFn 纯同步读 signal
 * - onCleanup 保证订阅释放
 *
 * 为什么不直接返回 createResource：
 * - createResource 面向"一次性 Promise"模型，需要手动 refetch
 * - live.query 天然是订阅模型，直接包成 Signal 更贴合 Solid 反应式
 *
 * SSR 安全：
 * - createEffect 在服务端不执行；pgWorker 走动态 import 避免污染 SSR bundle
 */

import type { DB } from "@db/generated/zod/index";
import type { Compilable, Kysely } from "kysely";
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
 * 重要：queryFn 必须是**同步**函数，且所有响应式 signal 必须在 queryFn 内同步读取。
 * 这样 Solid 的 createEffect 才能追踪依赖，signal 变化时自动重建订阅。
 * 异步资源（db 实例、pgworker）由本函数内部统一处理，调用方无需关心。
 *
 * @example
 * ```ts
 * const { rows, status } = createLiveKyselyQuery((db) => {
 *   const type = wikiStore.type;        // 同步读 signal，会被追踪
 *   if (!type) return null;
 *   return db.selectFrom(type).selectAll();
 * });
 * ```
 */
export function createLiveKyselyQuery<T>(
	queryFn: (db: Kysely<DB>) => Compilable<T> | null | undefined,
): LiveKyselyQueryResult<T> {
	const [rows, setRows] = createSignal<T[]>([]);
	const [status, setStatus] = createSignal<LiveQueryStatus>("idle");
	const [error, setError] = createSignal<Error | undefined>();

	// db 实例以 signal 持有：异步就绪后 setDb 会触发 effect 重跑，建立首次订阅。
	const [db, setDb] = createSignal<Kysely<DB> | undefined>();

	// 异步初始化 db（只跑一次，后续复用缓存）
	void (async () => {
		try {
			const { waitFor } = await import("~/lib/bootstrap/context-standalone");
			await waitFor("pgworker");
			const { getDB } = await import("@db/repositories/database");
			const instance = await getDB();
			setDb(() => instance);
		} catch (e) {
			setError(e instanceof Error ? e : new Error(String(e)));
			setStatus("error");
			console.error("[liveQuery] db 初始化失败", e);
		}
	})();

	createEffect(() => {
		const kysely = db();
		// db 未就绪时保持 loading 并清空 rows，db 到位后 effect 会重跑
		if (!kysely) {
			setStatus("loading");
			setRows(() => []);
			return;
		}

		// 同步调用 queryFn —— 这里读取的所有 signal 都会被 effect 追踪
		let compilable: Compilable<T> | null | undefined;
		try {
			compilable = queryFn(kysely);
		} catch (e) {
			setError(e instanceof Error ? e : new Error(String(e)));
			setStatus("error");
			setRows(() => []);
			console.error("[liveQuery] queryFn 执行失败", e);
			return;
		}

		// 切换查询时立即清空旧数据，避免新表短暂显示旧表内容
		setStatus("loading");
		setError(undefined);
		setRows(() => []);

		if (!compilable) {
			setStatus("idle");
			return;
		}

		const compiled = compilable.compile();

		let disposed = false;
		let liveSub: { unsubscribe: (cb?: (res: unknown) => void) => Promise<void> } | undefined;

		void (async () => {
			try {
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
