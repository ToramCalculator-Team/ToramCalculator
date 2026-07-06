import type { PGliteWithLive } from "@electric-sql/pglite/live";
import type { ChangeRecord, SyncResult, TransactionRecord } from "~/shared/types/sync";

// API 服务器地址配置
const API_URL =
	import.meta.env.VITE_SERVER_HOST === "localhost" ? "http://localhost:3001/api" : "https://app.kiaclouth.com/api";

// 请求选项类型定义
type RequestOptions = {
	method: string;
	headers: HeadersInit;
	body?: string;
	signal?: AbortSignal;
	credentials?: RequestCredentials;
};

// 重试配置：持续重试3分钟，延迟时间从1秒缓慢增加到20秒
// Keeps trying for 3 minutes, with the delay
// increasing slowly from 1 to 20 seconds.
const maxRetries = 32;
const backoffMultiplier = 1.1;
const initialDelayMs = 1_000;

// 重试获取函数：使用指数退避策略进行重试
async function retryFetch(url: string, options: RequestOptions, retryCount: number): Promise<Response | undefined> {
	if (retryCount > maxRetries) {
		return;
	}

	const delay = retryCount * backoffMultiplier * initialDelayMs;

	return await new Promise((resolve) => {
		setTimeout(async () => {
			console.log(`重试 ${retryCount} 次，等待 ${delay} 毫秒`);
			resolve(await resilientFetch(url, options, retryCount));
		}, delay);
	});
}

// 弹性获取函数：处理网络请求，支持重试机制
async function resilientFetch(url: string, options: RequestOptions, retryCount: number): Promise<Response | undefined> {
	try {
		// Could also check the status and retry before returning if you want to be
		// resilient to 4xx and 5xx responses as well as network errors
		console.log(`尝试上传：fetching ${url}, retryCount=${retryCount}`);
		const res = await fetch(url, options);

		// 如果是 5xx 错误，则触发重试
		if (res.status >= 500 && res.status < 600) {
			console.warn(`服务器错误（${res.status}），准备重试`);
			return await retryFetch(url, options, retryCount + 1);
		}
		if (res.status === 401 || res.status === 403) {
			console.warn(`上传认证失败（${res.status}），等待认证恢复后重试`, res);
			return await retryFetch(url, options, retryCount + 1);
		}
		if (res.ok) {
			console.log("上传成功", res);
		} else {
			console.warn(`上传被服务器拒绝（${res.status}）`, res);
		}
		return res;
	} catch (_err) {
		console.log("发生错误，正在重试", _err);
		return await retryFetch(url, options, retryCount + 1);
	}
}

// 通用请求函数：构建请求并发送到服务器
async function request(
	path: string,
	method: string,
	data?: object,
	signal?: AbortSignal,
): Promise<Response | undefined> {
	const url = `${API_URL}${path}`;

	const options: RequestOptions = {
		method: method,
		headers: {
			"Content-Type": "application/json",
		},
		// 设计说明：/api/changes 通过 httpOnly jwt cookie 认证；跨端口开发环境必须显式携带凭据。
		credentials: "include",
	};

	if (data !== undefined) {
		options.body = JSON.stringify(data);
	}

	if (signal !== undefined) {
		options.signal = signal;
	}

	return await resilientFetch(url, options, 0);
}

/*
 * 最小化的同步工具类，用于演示监听变更并将其发送到API服务器的模式
 * Minimal, naive synchronization utility, just to illustrate the pattern of
 * `listen`ing to `changes` and `POST`ing them to the api server.
 */
export class ChangeLogSynchronizer {
	#db: PGliteWithLive; // 数据库实例
	#position: number; // 当前处理位置

	#hasChangedWhileProcessing: boolean = false; // 处理过程中是否有新变更
	#shouldContinue: boolean = true; // 是否应该继续同步
	#status: "idle" | "processing" = "idle"; // 当前状态

	#abortController?: AbortController; // 中止控制器
	#unsubscribe?: () => Promise<void>; // 取消订阅函数

	constructor(db: PGliteWithLive, position = 0) {
		this.#db = db;
		this.#position = position;
	}

	/*
	 * 开始监听变更通知
	 * Start by listening for notifications.
	 */
	async start(): Promise<void> {
		this.#abortController = new AbortController();
		this.#unsubscribe = await this.#db.listen("changes", this.handle.bind(this));

		this.process();
	}

	/*
	 * 处理变更通知：如果正在处理中则标记有新变更，否则立即开始处理
	 * On notify, either kick off processing or note down that there were changes
	 * so we can process them straightaway on the next loop.
	 */
	async handle(): Promise<void> {
		console.log("接收到来自live插件的changes通知");
		if (this.#status === "processing") {
			this.#hasChangedWhileProcessing = true;

			return;
		}

		this.#status = "processing";

		this.process();
	}

	// 处理变更：获取变更并发送到服务器，根据结果决定是继续、回滚还是重试
	// Process the changes by fetching them and posting them to the server.
	// If the changes are accepted then proceed, otherwise rollback or retry.
	async process(): Promise<void> {
		this.#hasChangedWhileProcessing = false;

		const { changes, position } = await this.query();

		if (changes.length) {
			const result: SyncResult = await this.send(changes);

			switch (result) {
				case "accepted":
					await this.proceed(position);

					break;

				case "rejected":
					await this.rollback();

					break;

				case "retry":
					this.#hasChangedWhileProcessing = true;

					break;
			}
		}

		if (this.#hasChangedWhileProcessing && this.#shouldContinue) {
			return await this.process();
		}

		this.#status = "idle";
	}

	/*
	 * 获取当前批次的变更记录
	 * Fetch the current batch of changes
	 */
	async query(): Promise<{ changes: ChangeRecord[]; position: number }> {
		const { rows } = await this.#db.sql<ChangeRecord>`
      SELECT * from changes
        WHERE id > ${this.#position}
        ORDER BY id asc
    `;

		const position = rows.length ? rows.at(-1)!.id : this.#position;

		return {
			changes: rows,
			position,
		};
	}

	/*
	 * 将当前批次的变更发送到服务器，按事务分组
	 * Send the current batch of changes to the server, grouped by transaction.
	 */
	async send(changes: ChangeRecord[]): Promise<SyncResult> {
		const path = "/changes";

		// 按事务分组后，按事务内最小 changes.id 数值排序（见 ADR 0017 B-5）。
		// 不能用 transaction_id.localeCompare：transaction_id 是 xid8 数字，字符串序下
		// "1000" < "999"，会在 xid 跨十进制位数边界时打乱事务应用顺序 → 外键约束失败。
		// changes.id 是 BIGSERIAL，天然反映写入顺序，且与 query() 的 ORDER BY id 一致。
		const groups = Object.groupBy(changes, (x) => x.transaction_id);
		const minId = (rows: ChangeRecord[]) => rows.reduce((m, r) => (r.id < m ? r.id : m), rows[0].id);
		const sorted = Object.entries(groups).sort((a, b) => minId(a[1] ?? []) - minId(b[1] ?? []));
		const transactions: TransactionRecord[] = sorted.map(([transaction_id, changes]) => {
			return {
				id: transaction_id,
				changes: changes || [],
			};
		});

		const signal = this.#abortController?.signal;

		let response: Response | undefined;
		try {
			console.log("发送数据", transactions);
			response = await request(path, "POST", transactions, signal);
		} catch (_err) {
			return "retry";
		}

		if (response === undefined) {
			return "retry";
		}

		if (response.ok) {
			return "accepted";
		}

		if (response.status === 401 || response.status === 403) {
			return "retry";
		}

		return response.status < 500 ? "rejected" : "retry";
	}

	/*
	 * 继续处理：清除已处理的变更并向前移动位置
	 * Proceed by clearing the processed changes and moving the position forward.
	 */
	async proceed(position: number): Promise<void> {
		await this.#db.sql`
      DELETE from changes
        WHERE id <= ${position}
    `;

		this.#position = position;
	}

	/*
	 * 回滚：恢复官方 pattern 4 的完整语义 —— 任一写被服务端拒绝时，清空整个本地态。
	 * 官方原实现是 `DELETE from changes` + `DELETE from <t>_local` 两句一起，二者缺一
	 * 则不自洽：只清 outbox 而留下 local 覆盖会让被拒的写从重试队列消失、却仍显示在视图上，
	 * 造成永久静默发散（见 ADR 0017 B-4）。
	 *
	 * 因背景同步已丢失原始写入上下文，官方明确不做因果感知的定向回滚（"opens the door to
	 * a lot of complexity"），而是粗暴清空本地态、由 Electric 从服务端重新收敛。此处遵循同一策略，
	 * 并把官方硬编码的单表 `<t>_local` 泛化为「运行时自省所有 %_local 表」，不依赖生成期清单。
	 */
	async rollback(): Promise<void> {
		await this.#db.transaction(async (tx) => {
			await tx.sql`DELETE from changes`;

			// 动态发现所有本地乐观覆盖表（<t>_local），逐个清空。
			const { rows } = await tx.query<{ tablename: string }>(
				`SELECT tablename FROM pg_catalog.pg_tables
				 WHERE schemaname = 'public' AND tablename LIKE '%\\_local'`,
			);
			for (const { tablename } of rows) {
				// 表名来自 pg_catalog，非用户输入；用双引号包裹防止大小写/保留字问题。
				await tx.exec(`DELETE FROM "${tablename}"`);
			}
		});
	}

	/*
	 * 停止同步
	 * Stop synchronizing
	 */
	async stop(): Promise<void> {
		this.#shouldContinue = false;

		if (this.#abortController !== undefined) {
			this.#abortController.abort();
		}

		if (this.#unsubscribe !== undefined) {
			await this.#unsubscribe();
		}
	}
}
