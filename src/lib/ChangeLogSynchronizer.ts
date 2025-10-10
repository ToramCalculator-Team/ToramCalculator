import { type PGliteWithLive } from "@electric-sql/pglite/live";

// API 服务器地址配置
const API_URL =
  import.meta.env.VITE_SERVER_HOST == "localhost"
    ? "http://localhost:3001/api"
    : "https://app.kiaclouth.com/api";

// 请求选项类型定义
type RequestOptions = {
  method: string;
  headers: HeadersInit;
  body?: string;
  signal?: AbortSignal;
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
    console.log("上传成功", res);
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
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  if (signal !== undefined) {
    options.signal = signal;
  }

  return await resilientFetch(url, options, 0);
}

// 变更记录类型定义
type Change = {
  id: number;
  operation: `insert` | `update` | `delete`;
  value: {
    id: string;
    title?: string;
    completed?: boolean;
    created_at?: Date;
  };
  write_id: string;
  transaction_id: string;
};

// 发送结果类型定义
type SendResult = "accepted" | "rejected" | "retry";

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
      const result: SendResult = await this.send(changes);

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
  async query(): Promise<{ changes: Change[]; position: number }> {
    const { rows } = await this.#db.sql<Change>`
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
  async send(changes: Change[]): Promise<SendResult> {
    const path = "/changes";

    const groups = Object.groupBy(changes, (x) => x.transaction_id);
    const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    const transactions = sorted.map(([transaction_id, changes]) => {
      return {
        id: transaction_id,
        changes: changes,
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
   * 回滚：使用极其简单的策略，如果任何写入被拒绝，就清除整个本地状态
   * Rollback with an extremely naive strategy: if any write is rejected, simply
   * wipe the entire local state.
   */
  async rollback(): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx.sql`DELETE from changes`;
      // await tx.sql`DELETE from todos_local`
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
