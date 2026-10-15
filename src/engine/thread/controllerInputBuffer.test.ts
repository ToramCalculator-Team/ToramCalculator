import { describe, expect, it } from "vitest";
import { readSharedMovementState, SharedMovementStateWriter } from "./controllerInputBuffer";

describe("controllerInputBuffer", () => {
	it("只保留最新移动状态并发布一致的偶数 revision", () => {
		const writer = new SharedMovementStateWriter();
		const initial = readSharedMovementState(writer.buffer);
		expect(initial).toMatchObject({ enabled: true, moving: false, revision: 2 });

		expect(writer.write({ enabled: true, moving: true, direction: { x: 0.6, z: 0.8 }, intensity: 1 })).toBe(true);
		expect(writer.write({ enabled: true, moving: true, direction: { x: 0.6, z: 0.8 }, intensity: 1 })).toBe(false);
		expect(readSharedMovementState(writer.buffer)).toMatchObject({
			enabled: true,
			moving: true,
			direction: { x: expect.closeTo(0.6), z: expect.closeTo(0.8) },
			intensity: 1,
			revision: 4,
		});
	});

	it("停用状态覆盖之前的移动状态", () => {
		const writer = new SharedMovementStateWriter();
		writer.write({ enabled: true, moving: true, direction: { x: 1, z: 0 }, intensity: 1 });
		writer.write({ enabled: false, moving: false, direction: { x: 0, z: 0 }, intensity: 0 });
		expect(readSharedMovementState(writer.buffer)).toMatchObject({
			enabled: false,
			moving: false,
			direction: { x: 0, z: 0 },
			intensity: 0,
		});
	});
});
