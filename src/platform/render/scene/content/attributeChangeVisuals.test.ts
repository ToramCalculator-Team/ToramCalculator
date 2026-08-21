import { describe, expect, it } from "vitest";
import {
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	WorldStateEntityType,
	WorldStateReader,
	WorldStateWriter,
} from "~/engine/core/thread/worldStateBuffer";
import { resolveAttributeChangeAnimation } from "./AttributeChangeVisualSystem";
import { collectAttributeChanges } from "./attributeChangeVisuals";

const layout = createWorldStateLayoutDescriptor(
	[
		{
			id: "player",
			entityType: WorldStateEntityType.PLAYER,
			visualProfileId: 1,
			attributePaths: [
				{ index: 0, path: "hp.max", displayName: "最大HP", expression: "" },
				{ index: 1, path: "hp.current", displayName: "当前HP", expression: "" },
			],
			modifierCapacity: 0,
		},
	],
	{ memberCapacity: 1, areaCapacity: 0 },
);

function createSnapshots() {
	const buffer = createWorldStateBuffer(layout);
	const writer = new WorldStateWriter(buffer, layout);
	const reader = new WorldStateReader(buffer, layout);
	const write = (logicalTimeMs: number, hp: number) => {
		writer.write({
			logicalTimeMs,
			tickIndex: logicalTimeMs,
			clock: {
				state: "running",
				revision: 1,
				sampledAtEpochMs: 0,
				timelineTimeMs: logicalTimeMs,
				timeScale: 1,
				fixedStepMs: 16,
			},
			members: [
				{
					id: "player",
					position: { x: 0, y: 0, z: 0 },
					yaw: 0,
					attributes: { base: [100, hp], act: [100, hp] },
				},
			],
		});
		const snapshot = reader.readLatest();
		if (!snapshot) throw new Error("预期读取到稳定世界状态提交");
		return snapshot;
	};
	return { write };
}

describe("attributeChangeVisuals", () => {
	it("首次建立基线，后续提交按 hp.current 净变化生成一条表现", () => {
		const snapshots = createSnapshots();
		const initial = snapshots.write(100, 100);
		const changed = snapshots.write(116, 70);

		expect(collectAttributeChanges(null, initial, layout)).toEqual([]);
		expect(collectAttributeChanges(initial, changed, layout)).toMatchObject([
			{
				memberSlot: 0,
				path: "hp.current",
				previousValue: 100,
				currentValue: 70,
				delta: -30,
				text: "-30",
			},
		]);
	});

	it("成员代次变化不会把新成员的初始 HP 当成变化", () => {
		const snapshots = createSnapshots();
		const initial = snapshots.write(100, 100);
		const changed = snapshots.write(116, 50);
		const current = changed.members[0];
		if (!current) throw new Error("预期存在成员");
		current.generation++;

		expect(collectAttributeChanges(initial, changed, layout)).toEqual([]);
	});

	it("属性变化表现先放大，再保持可读性并逐渐淡出", () => {
		const start = resolveAttributeChangeAnimation(0);
		const popped = resolveAttributeChangeAnimation(180);
		const settled = resolveAttributeChangeAnimation(300);
		const expired = resolveAttributeChangeAnimation(900);

		expect(start).toEqual({ scale: 0.9, visibility: 1 });
		expect(popped.scale).toBeCloseTo(1.2, 5);
		expect(popped.visibility).toBe(1);
		expect(settled.scale).toBeCloseTo(0.9, 5);
		expect(settled.visibility).toBeGreaterThan(0);
		expect(expired.visibility).toBe(0);
	});
});
