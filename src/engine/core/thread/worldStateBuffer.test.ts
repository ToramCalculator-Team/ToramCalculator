import { describe, expect, it } from "vitest";
import {
	createWorldStateBuffer,
	MemberSlotIndex,
	STATE_FLAG_AIRBORNE,
	STATE_FLAG_MOVING,
	WorldStateReader,
	WorldStateWriter,
} from "./worldStateBuffer";

describe("worldStateBuffer", () => {
	it("按成员槽位往返完整实时世界状态", () => {
		const memberIds = ["member-1"];
		const buffer = createWorldStateBuffer(memberIds.length);
		const slotIndex = new MemberSlotIndex(memberIds);
		const writer = new WorldStateWriter(buffer, slotIndex);
		const reader = new WorldStateReader(buffer);

		writer.write([
			{
				id: "member-1",
				position: { x: 1.25, y: -2.5, z: 3.75 },
				yaw: Math.PI / 2,
				speed: 2.1,
				stateFlags: STATE_FLAG_MOVING | STATE_FLAG_AIRBORNE,
			},
		]);

		expect(reader.readSlot(0)).toEqual({
			posX: 1.25,
			posY: -2.5,
			posZ: 3.75,
			yaw: Math.fround(Math.PI / 2),
			speed: Math.fround(2.1),
			stateFlags: STATE_FLAG_MOVING | STATE_FLAG_AIRBORNE,
		});
	});

	it("在附件边界拒绝非法布局和重复成员 ID", () => {
		expect(() => new WorldStateReader(new SharedArrayBuffer(16))).toThrow("magic");
		expect(() => new MemberSlotIndex(["member-1", "member-1"])).toThrow("重复");

		const buffer = createWorldStateBuffer(1);
		expect(() => new WorldStateWriter(buffer, new MemberSlotIndex([]))).toThrow("数量不匹配");
	});
});
