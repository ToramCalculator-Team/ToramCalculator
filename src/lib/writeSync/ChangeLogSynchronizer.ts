import type { PGliteWithLive } from "@electric-sql/pglite/live";
import type { ChangeLogRow } from "./changeLogRow";
import type { ChangesRequest } from "./changesContract";

export type SyncResult = "accepted" | "rejected" | "retry";

export type ChangeLogBatch = {
	changes: ChangeLogRow[];
	position: number;
};

export type ChangeLogSyncStorage = {
	subscribe(listener: () => void): Promise<() => Promise<void>>;
	query(position: number): Promise<ChangeLogBatch>;
	proceed(position: number): Promise<void>;
	rollback(): Promise<void>;
};

export type ChangeLogUploader = (changes: readonly ChangeLogRow[], signal: AbortSignal) => Promise<SyncResult>;

export type ChangeLogUploadMetric = {
	transactionCount: number;
	changeCount: number;
	requestDurationMs: number;
	outboxLength: number;
	result: SyncResult;
};

type Scheduler = {
	setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
	clearTimeout(handle: ReturnType<typeof setTimeout>): void;
};

export type ChangeLogSynchronizerOptions = {
	collectionWindowMs?: number;
	scheduler?: Scheduler;
	now?: () => number;
	onUploadMetric?: (metric: ChangeLogUploadMetric) => void;
};

const defaultScheduler: Scheduler = {
	setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
	clearTimeout: (handle) => clearTimeout(handle),
};

const defaultUploadMetricReporter = (metric: ChangeLogUploadMetric) => {
	console.info("[change-log-sync]", metric);
};

const API_URL =
	import.meta.env.VITE_SERVER_HOST === "localhost" ? "http://localhost:3001/api" : "https://app.kiaclouth.com/api";

const maxRetries = 32;
const backoffMultiplier = 1.1;
const initialDelayMs = 1_000;

type RequestOptions = {
	method: string;
	headers: HeadersInit;
	body?: string;
	signal: AbortSignal;
	credentials: RequestCredentials;
};

const abortableDelay = (delayMs: number, signal: AbortSignal): Promise<boolean> =>
	new Promise((resolve) => {
		if (signal.aborted) {
			resolve(false);
			return;
		}
		const handle = setTimeout(() => {
			signal.removeEventListener("abort", cancel);
			resolve(true);
		}, delayMs);
		const cancel = () => {
			clearTimeout(handle);
			resolve(false);
		};
		signal.addEventListener("abort", cancel, { once: true });
	});

/** 网络重试只包围同一个已冻结批次；停止同步时 AbortSignal 同时取消请求和退避等待。 */
async function requestWithRetry(
	path: string,
	method: string,
	data: object,
	signal: AbortSignal,
): Promise<Response | undefined> {
	const options: RequestOptions = {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		signal,
		// /api/changes 通过 httpOnly jwt cookie 认证；跨端口开发环境必须显式携带凭据。
		credentials: "include",
	};

	for (let retryCount = 0; retryCount <= maxRetries; retryCount += 1) {
		if (signal.aborted) return;
		if (retryCount > 0) {
			const delay = retryCount * backoffMultiplier * initialDelayMs;
			if (!(await abortableDelay(delay, signal))) return;
		}

		try {
			const response = await fetch(`${API_URL}${path}`, options);
			if ((response.status >= 500 && response.status < 600) || response.status === 401 || response.status === 403) {
				continue;
			}
			return response;
		} catch (error) {
			if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
		}
	}
}

/** 按 changes.id 确立事务先后，避免 xid8 字符串排序在十进制位数变化时破坏外键顺序。 */
export function groupChangesIntoTransactions(changes: readonly ChangeLogRow[]): ChangesRequest {
	const groups = new Map<string, ChangeLogRow[]>();
	for (const change of changes) {
		const group = groups.get(change.transaction_id) ?? [];
		group.push(change);
		groups.set(change.transaction_id, group);
	}

	return [...groups.entries()]
		.sort((left, right) => (left[1][0]?.id ?? 0) - (right[1][0]?.id ?? 0))
		.map(([transactionId, rows]) => ({
			id: transactionId,
			changes: rows.map(({ table_name, operation, value, write_id, transaction_id }) => ({
				table_name,
				operation,
				value,
				write_id,
				transaction_id,
			})),
		}));
}

async function uploadChanges(changes: readonly ChangeLogRow[], signal: AbortSignal): Promise<SyncResult> {
	const response = await requestWithRetry("/changes", "POST", groupChangesIntoTransactions(changes), signal);
	if (!response) return "retry";
	if (response.ok) return "accepted";
	if (response.status === 401 || response.status === 403 || response.status >= 500) return "retry";
	return "rejected";
}

/** PGlite 存储适配只暴露持久 outbox 操作，不在同步器内复制 change 行。 */
export function createPGliteChangeLogStorage(db: PGliteWithLive): ChangeLogSyncStorage {
	return {
		subscribe: async (listener) => await db.listen("changes", listener),
		query: async (position) => {
			const { rows } = await db.sql<ChangeLogRow>`
        SELECT * FROM changes
        WHERE id > ${position}
        ORDER BY id ASC
      `;
			return { changes: rows, position: rows.at(-1)?.id ?? position };
		},
		proceed: async (position) => {
			await db.sql`
        DELETE FROM changes
        WHERE id <= ${position}
      `;
		},
		rollback: async () => {
			await db.transaction(async (transaction) => {
				await transaction.sql`DELETE FROM changes`;
				const { rows } = await transaction.query<{ tablename: string }>(
					`SELECT tablename FROM pg_catalog.pg_tables
           WHERE schemaname = 'public' AND tablename LIKE '%\\_local'`,
				);
				for (const { tablename } of rows) {
					// 表名只来自 pg_catalog；双引号用于兼容大小写和保留字。
					await transaction.exec(`DELETE FROM "${tablename}"`);
				}
			});
		},
	};
}

/**
 * 编排持久 outbox 的固定收集窗口和串行上传。
 * 收集下一批与上传上一批是正交事实；窗口不会因后续通知重置，也不会复制 change 行。
 */
export class ChangeLogSynchronizer {
	private readonly collectionWindowMs: number;
	private readonly scheduler: Scheduler;
	private readonly now: () => number;
	private readonly onUploadMetric: (metric: ChangeLogUploadMetric) => void;
	private position = 0;
	private started = false;
	private generation = 0;
	private collectionTimer: ReturnType<typeof setTimeout> | null = null;
	private collectionReady = false;
	private abortController: AbortController | null = null;
	private unsubscribe: (() => Promise<void>) | null = null;
	private startTask: Promise<void> | null = null;
	private drainTask: Promise<void> | null = null;

	constructor(
		private readonly storage: ChangeLogSyncStorage,
		private readonly upload: ChangeLogUploader,
		options: ChangeLogSynchronizerOptions = {},
	) {
		this.collectionWindowMs = options.collectionWindowMs ?? 300;
		this.scheduler = options.scheduler ?? defaultScheduler;
		this.now = options.now ?? (() => performance.now());
		this.onUploadMetric = options.onUploadMetric ?? defaultUploadMetricReporter;
	}

	async start(): Promise<void> {
		if (this.started) {
			if (this.startTask) await this.startTask;
			return;
		}

		this.started = true;
		const generation = ++this.generation;
		this.abortController = new AbortController();
		const task = this.open(generation);
		this.startTask = task;
		try {
			await task;
		} catch (error) {
			if (this.isCurrent(generation)) {
				this.started = false;
				this.abortController?.abort();
				this.abortController = null;
			}
			throw error;
		} finally {
			if (this.startTask === task) this.startTask = null;
		}
	}

	/** changes 通知只启动尚不存在的收集窗口，不读取或复制 change 行。 */
	handle(): void {
		if (!this.started) return;
		this.beginCollection();
	}

	async stop(): Promise<void> {
		if (!this.started && !this.startTask && !this.drainTask && !this.unsubscribe) return;
		this.started = false;
		this.generation += 1;
		this.clearCollection();
		this.abortController?.abort();

		if (this.startTask) await this.startTask.catch(() => undefined);
		const unsubscribe = this.unsubscribe;
		this.unsubscribe = null;
		if (unsubscribe) await unsubscribe();
		if (this.drainTask) await this.drainTask.catch(() => undefined);
		this.abortController = null;
	}

	private async open(generation: number): Promise<void> {
		const unsubscribe = await this.storage.subscribe(() => this.handle());
		if (!this.isCurrent(generation)) {
			await unsubscribe();
			return;
		}
		this.unsubscribe = unsubscribe;
		const pending = await this.storage.query(this.position);
		if (!this.isCurrent(generation)) return;
		if (pending.changes.length > 0) this.beginCollection();
	}

	private beginCollection(): void {
		if (!this.started || this.collectionTimer || this.collectionReady) return;
		const generation = this.generation;
		this.collectionTimer = this.scheduler.setTimeout(() => {
			this.collectionTimer = null;
			if (!this.isCurrent(generation)) return;
			this.collectionReady = true;
			this.startDrain();
		}, this.collectionWindowMs);
	}

	private clearCollection(): void {
		if (this.collectionTimer) this.scheduler.clearTimeout(this.collectionTimer);
		this.collectionTimer = null;
		this.collectionReady = false;
	}

	private startDrain(): void {
		if (!this.started || !this.collectionReady || this.drainTask) return;
		const generation = this.generation;
		const task = this.drain(generation)
			.catch((error) => {
				console.warn("上传本地变更失败，将重新进入收集窗口", error);
				if (this.isCurrent(generation)) this.beginCollection();
			})
			.finally(() => {
				if (this.drainTask === task) this.drainTask = null;
				if (this.isCurrent(generation) && this.collectionReady) this.startDrain();
			});
		this.drainTask = task;
	}

	private async drain(generation: number): Promise<void> {
		this.collectionReady = false;
		const batch = await this.storage.query(this.position);
		if (!this.isCurrent(generation) || batch.changes.length === 0) return;
		const signal = this.abortController?.signal;
		if (!signal) return;

		const requestStartedAt = this.now();
		const result = await this.upload(batch.changes, signal);
		if (!this.isCurrent(generation)) return;
		this.onUploadMetric({
			transactionCount: new Set(batch.changes.map((change) => change.transaction_id)).size,
			changeCount: batch.changes.length,
			requestDurationMs: this.now() - requestStartedAt,
			outboxLength: batch.changes.length,
			result,
		});
		if (result === "accepted") {
			await this.storage.proceed(batch.position);
			this.position = batch.position;
		} else if (result === "rejected") {
			await this.storage.rollback();
		} else {
			this.beginCollection();
		}

		if (!this.isCurrent(generation) || this.collectionTimer || this.collectionReady) return;
		const remaining = await this.storage.query(this.position);
		if (this.isCurrent(generation) && remaining.changes.length > 0) this.beginCollection();
	}

	private isCurrent(generation: number): boolean {
		return this.started && this.generation === generation;
	}
}

export function createChangeLogSynchronizer(
	db: PGliteWithLive,
	options?: ChangeLogSynchronizerOptions,
): ChangeLogSynchronizer {
	return new ChangeLogSynchronizer(createPGliteChangeLogStorage(db), uploadChanges, options);
}
