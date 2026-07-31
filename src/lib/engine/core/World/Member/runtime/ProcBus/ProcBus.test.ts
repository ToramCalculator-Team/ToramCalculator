import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { StatusEnteredPayloadSchema } from "../../../../Event/BuiltInEvents";
import { EventCatalog } from "../../../../Event/EventCatalog";
import { ProcBus } from "./ProcBus";

describe("ProcBus", () => {
	it("测试环境 emit 时校验 EventCatalog payload schema", () => {
		const bus = new ProcBus(
			new EventCatalog([
				{
					name: "sample.event",
					payloadSchema: z.object({ value: z.number() }),
					description: "test event",
				},
			]),
		);

		expect(() => bus.emit("sample.event", { value: "bad" }, 0)).toThrow(/payload 不匹配/);
	});

	it("payload 校验通过后才分发给订阅者", () => {
		const bus = new ProcBus(
			new EventCatalog([
				{
					name: "sample.event",
					payloadSchema: z.object({ value: z.number() }),
					description: "test event",
				},
			]),
		);
		const handler = vi.fn();

		bus.subscribeByName("test", ["sample.event"], null, handler);
		bus.emit("sample.event", { value: 1 }, 123);

		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ payload: { value: 1 }, timeMs: 123 }));
	});

	it("status.entered payload 使用 timeMs 作为事实时间字段", () => {
		expect(StatusEnteredPayloadSchema.parse({ type: "Ignition", sourceId: "skill-1", timeMs: 100 })).toEqual({
			type: "Ignition",
			sourceId: "skill-1",
			timeMs: 100,
		});
		expect(() => StatusEnteredPayloadSchema.parse({ type: "Ignition", frame: 1 })).toThrow();
	});
});
