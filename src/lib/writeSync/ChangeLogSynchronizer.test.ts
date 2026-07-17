import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ChangeLogSynchronizer,
	type ChangeLogSyncStorage,
	type ChangeLogUploader,
	groupChangesIntoTransactions,
} from "./ChangeLogSynchronizer";
import type { ChangeLogRow } from "./changeLogRow";

const row = (id: number, transactionId = `${id}`): ChangeLogRow => ({
	id,
	table_name: "character",
	operation: "update",
	value: { id: "character-1", str: id },
	write_id: `write-${id}`,
	transaction_id: transactionId,
});

class FakeStorage implements ChangeLogSyncStorage {
	changes: ChangeLogRow[] = [];
	rollbackCount = 0;
	subscribeCount = 0;
	unsubscribeCount = 0;
	private listener: (() => void) | null = null;

	async subscribe(listener: () => void): Promise<() => Promise<void>> {
		this.subscribeCount += 1;
		this.listener = listener;
		return async () => {
			this.unsubscribeCount += 1;
			if (this.listener === listener) this.listener = null;
		};
	}

	async query(position: number) {
		const changes = this.changes.filter((change) => change.id > position);
		return { changes, position: changes.at(-1)?.id ?? position };
	}

	async proceed(position: number): Promise<void> {
		this.changes = this.changes.filter((change) => change.id > position);
	}

	async rollback(): Promise<void> {
		this.rollbackCount += 1;
		this.changes = [];
	}

	push(...changes: ChangeLogRow[]): void {
		this.changes.push(...changes);
		this.listener?.();
	}
}

const flushPromises = async () => {
	for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("ChangeLogSynchronizer", () => {
	it("从第一条通知启动固定窗口，后续通知不重置计时", async () => {
		const storage = new FakeStorage();
		const uploads: ChangeLogRow[][] = [];
		const synchronizer = new ChangeLogSynchronizer(storage, async (changes) => {
			uploads.push([...changes]);
			return "accepted";
		});
		await synchronizer.start();

		storage.push(row(1));
		await vi.advanceTimersByTimeAsync(200);
		storage.push(row(2));
		await vi.advanceTimersByTimeAsync(99);
		expect(uploads).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(1);
		await flushPromises();

		expect(uploads.map((batch) => batch.map((change) => change.id))).toEqual([[1, 2]]);
		expect(storage.changes).toEqual([]);
		await synchronizer.stop();
	});

	it("上传上一批时收集下一批，窗口到期后等待在途请求完成并立即上传", async () => {
		const storage = new FakeStorage();
		let finishFirst: ((result: "accepted") => void) | undefined;
		const firstUpload = new Promise<"accepted">((resolve) => {
			finishFirst = resolve;
		});
		const uploads: number[][] = [];
		const uploader: ChangeLogUploader = vi
			.fn<ChangeLogUploader>()
			.mockImplementationOnce(async (changes) => {
				uploads.push(changes.map((change) => change.id));
				return await firstUpload;
			})
			.mockImplementation(async (changes) => {
				uploads.push(changes.map((change) => change.id));
				return "accepted";
			});
		const synchronizer = new ChangeLogSynchronizer(storage, uploader);
		await synchronizer.start();

		storage.push(row(1));
		await vi.advanceTimersByTimeAsync(300);
		expect(uploads).toEqual([[1]]);

		storage.push(row(2));
		await vi.advanceTimersByTimeAsync(300);
		expect(uploads).toEqual([[1]]);

		finishFirst?.("accepted");
		await flushPromises();
		expect(uploads).toEqual([[1], [2]]);
		await synchronizer.stop();
	});

	it("启动时发现离线积压也进入相同窗口", async () => {
		const storage = new FakeStorage();
		storage.changes = [row(1)];
		const uploader = vi.fn<ChangeLogUploader>(async () => "accepted");
		const synchronizer = new ChangeLogSynchronizer(storage, uploader);
		await synchronizer.start();

		await vi.advanceTimersByTimeAsync(299);
		expect(uploader).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await flushPromises();
		expect(uploader).toHaveBeenCalledTimes(1);
		await synchronizer.stop();
	});

	it("rejected 使用存储层 rollback 清理整个本地态", async () => {
		const storage = new FakeStorage();
		const synchronizer = new ChangeLogSynchronizer(storage, async () => "rejected");
		await synchronizer.start();
		storage.push(row(1));

		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(storage.rollbackCount).toBe(1);
		expect(storage.changes).toEqual([]);
		await synchronizer.stop();
	});

	it("每次上传记录事务数、change 数、耗时、outbox 长度和结果", async () => {
		const storage = new FakeStorage();
		const metrics: Array<{
			transactionCount: number;
			changeCount: number;
			requestDurationMs: number;
			outboxLength: number;
			result: string;
		}> = [];
		const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(145);
		const synchronizer = new ChangeLogSynchronizer(storage, async () => "accepted", {
			now,
			onUploadMetric: (metric) => metrics.push(metric),
		});
		await synchronizer.start();
		storage.push(row(1, "transaction-a"), row(2, "transaction-a"), row(3, "transaction-b"));

		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(metrics).toEqual([
			{
				transactionCount: 2,
				changeCount: 3,
				requestDurationMs: 45,
				outboxLength: 3,
				result: "accepted",
			},
		]);
		await synchronizer.stop();
	});

	it("retry 结果重新进入固定窗口，并重传同一持久 outbox", async () => {
		const storage = new FakeStorage();
		const uploader = vi.fn<ChangeLogUploader>().mockResolvedValueOnce("retry").mockResolvedValueOnce("accepted");
		const synchronizer = new ChangeLogSynchronizer(storage, uploader, { onUploadMetric: () => {} });
		await synchronizer.start();
		storage.push(row(1));

		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(uploader).toHaveBeenCalledTimes(1);
		expect(storage.changes.map((change) => change.id)).toEqual([1]);
		await vi.advanceTimersByTimeAsync(299);
		expect(uploader).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		await flushPromises();
		expect(uploader).toHaveBeenCalledTimes(2);
		expect(storage.changes).toEqual([]);
		await synchronizer.stop();
	});

	it("同一实例重复 start/stop 不重复监听，重启后恢复积压", async () => {
		const storage = new FakeStorage();
		const uploader = vi.fn<ChangeLogUploader>(async () => "accepted");
		const synchronizer = new ChangeLogSynchronizer(storage, uploader, { onUploadMetric: () => {} });
		await synchronizer.start();
		await synchronizer.start();
		expect(storage.subscribeCount).toBe(1);
		await synchronizer.stop();
		await synchronizer.stop();
		expect(storage.unsubscribeCount).toBe(1);

		storage.changes = [row(1)];
		await synchronizer.start();
		await synchronizer.start();
		expect(storage.subscribeCount).toBe(2);
		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(uploader).toHaveBeenCalledOnce();
		await synchronizer.stop();
		expect(storage.unsubscribeCount).toBe(2);
	});

	it("停止会取消收集窗口和在途上传，重启后从持久 outbox 继续", async () => {
		const storage = new FakeStorage();
		const signals: AbortSignal[] = [];
		const uploader: ChangeLogUploader = async (_changes, signal) => {
			signals.push(signal);
			return await new Promise<"retry">((resolve) => {
				if (signal.aborted) resolve("retry");
				else signal.addEventListener("abort", () => resolve("retry"), { once: true });
			});
		};
		const synchronizer = new ChangeLogSynchronizer(storage, uploader);
		await synchronizer.start();
		await synchronizer.start();
		expect(storage.subscribeCount).toBe(1);

		storage.push(row(1));
		await vi.advanceTimersByTimeAsync(300);
		expect(signals).toHaveLength(1);
		await synchronizer.stop();
		expect(signals[0]?.aborted).toBe(true);
		expect(storage.unsubscribeCount).toBe(1);
		expect(storage.changes.map((change) => change.id)).toEqual([1]);

		const completedUploader = vi.fn<ChangeLogUploader>(async () => "accepted");
		const resumed = new ChangeLogSynchronizer(storage, completedUploader);
		await resumed.start();
		await vi.advanceTimersByTimeAsync(300);
		await flushPromises();
		expect(completedUploader).toHaveBeenCalledTimes(1);
		await resumed.stop();
	});
});

describe("groupChangesIntoTransactions", () => {
	it("按每组最小 changes.id 排序并删除 outbox 私有 id", () => {
		const transactions = groupChangesIntoTransactions([row(10, "10"), row(9, "9"), row(11, "10")]);

		expect(transactions.map((transaction) => transaction.id)).toEqual(["9", "10"]);
		expect(transactions[1]?.changes).toHaveLength(2);
		expect(transactions[0]?.changes[0]).not.toHaveProperty("id");
	});
});
