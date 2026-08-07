import { describe, expect, it } from "vitest";
import { prepareForTransfer } from "./MessageSerializer";

describe("MessageSerializer", () => {
	it("SharedArrayBuffer 保持共享引用且不进入 transfer 列表", () => {
		const shared = new SharedArrayBuffer(16);
		const message = { stateHistory: { segments: [{ buffer: shared }] } };
		const prepared = prepareForTransfer(message);

		expect(prepared.message).toBe(message);
		expect(prepared.message.stateHistory.segments[0]?.buffer).toBe(shared);
		expect(prepared.transferables).toEqual([]);
	});

	it("普通 ArrayBuffer 继续进入 transfer 列表", () => {
		const transferable = new ArrayBuffer(16);
		expect(prepareForTransfer({ transferable }).transferables).toEqual([transferable]);
	});
});
