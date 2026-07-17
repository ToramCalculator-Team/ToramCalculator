import { describe, expect, it, vi } from "vitest";
import type { CharacterEdit } from "../edit/characterEditProtocol";
import { CharacterEditQueue } from "./CharacterEditQueue";

const CHARACTER_ID = "character-1";

const deferred = <T>() => {
	let resolve: (value: T) => void = () => undefined;
	let reject: (reason?: unknown) => void = () => undefined;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};

const adjust = (field: "str" | "int" | "dex", delta: -1 | 1 = 1): CharacterEdit => ({
	type: "character.numeric.adjust",
	field,
	delta,
});

describe("CharacterEditQueue", () => {
	it("空闲时立即启动首条操作，提交期间积累的操作组成下一原子批次", async () => {
		const first = deferred<void>();
		const persisted: CharacterEdit[][] = [];
		const persistBatch = vi.fn(async (_characterId: string, edits: readonly CharacterEdit[]) => {
			persisted.push([...edits]);
			if (persisted.length === 1) await first.promise;
		});
		const queue = new CharacterEditQueue({ persistBatch });

		queue.accept(CHARACTER_ID, adjust("str"));
		expect(persistBatch).toHaveBeenCalledTimes(1);
		expect(queue.getSnapshot()).toEqual({ status: "committing" });

		queue.accept(CHARACTER_ID, adjust("int"));
		queue.accept(CHARACTER_ID, adjust("dex"));
		expect(persistBatch).toHaveBeenCalledTimes(1);

		first.resolve(undefined);
		await vi.waitFor(() => expect(persistBatch).toHaveBeenCalledTimes(2));
		expect(persisted).toEqual([[adjust("str")], [adjust("int"), adjust("dex")]]);
		await vi.waitFor(() => expect(queue.getSnapshot()).toEqual({ status: "idle" }));
	});

	it("不合并或重排同字段的绝对设置和相对调整", async () => {
		const first = deferred<void>();
		const persisted: CharacterEdit[][] = [];
		const persistBatch = vi.fn(async (_characterId: string, edits: readonly CharacterEdit[]) => {
			persisted.push([...edits]);
			if (persisted.length === 1) await first.promise;
		});
		const queue = new CharacterEditQueue({ persistBatch });

		queue.accept(CHARACTER_ID, { type: "character.numeric.set", field: "str", value: 10 });
		queue.accept(CHARACTER_ID, adjust("str"));
		queue.accept(CHARACTER_ID, { type: "character.numeric.set", field: "str", value: 20 });
		first.resolve(undefined);

		await vi.waitFor(() => expect(persistBatch).toHaveBeenCalledTimes(2));
		expect(persisted[1]).toEqual([adjust("str"), { type: "character.numeric.set", field: "str", value: 20 }]);
	});

	it("失败时保留原子批次和后续操作，重试同一批次后再继续", async () => {
		const first = deferred<void>();
		const retry = deferred<void>();
		const persisted: CharacterEdit[][] = [];
		const persistBatch = vi.fn(async (_characterId: string, edits: readonly CharacterEdit[]) => {
			persisted.push([...edits]);
			if (persisted.length === 1) await first.promise;
			if (persisted.length === 2) await retry.promise;
		});
		const queue = new CharacterEditQueue({ persistBatch });

		queue.accept(CHARACTER_ID, adjust("str"));
		queue.accept(CHARACTER_ID, adjust("int"));
		queue.accept(CHARACTER_ID, adjust("dex"));
		first.reject(new Error("database failed"));
		await vi.waitFor(() => expect(queue.getSnapshot()).toEqual({ status: "failed", error: "database failed" }));
		expect(() => queue.accept(CHARACTER_ID, adjust("str"))).toThrow("存在待处理的失败批次");

		queue.retryFailed();
		expect(persisted[1]).toEqual([adjust("str")]);
		retry.resolve(undefined);
		await vi.waitFor(() => expect(persistBatch).toHaveBeenCalledTimes(3));
		expect(persisted[2]).toEqual([adjust("int"), adjust("dex")]);
	});

	it("明确放弃失败批次后只继续此前已接纳的后续操作", async () => {
		const first = deferred<void>();
		const persisted: CharacterEdit[][] = [];
		const persistBatch = vi.fn(async (_characterId: string, edits: readonly CharacterEdit[]) => {
			persisted.push([...edits]);
			if (persisted.length === 1) await first.promise;
		});
		const queue = new CharacterEditQueue({ persistBatch });

		queue.accept(CHARACTER_ID, adjust("str"));
		queue.accept(CHARACTER_ID, adjust("int"));
		first.reject(new Error("database failed"));
		await vi.waitFor(() => expect(queue.getSnapshot().status).toBe("failed"));

		queue.discardFailed();
		await vi.waitFor(() => expect(persistBatch).toHaveBeenCalledTimes(2));
		expect(persisted).toEqual([[adjust("str")], [adjust("int")]]);
	});
});
