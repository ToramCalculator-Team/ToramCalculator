import type { MemberType } from "@db/schema/enums";
import { afterEach, describe, expect, it } from "vitest";
import {
	collectTickStateHistoryDiagnostics,
	readTickStateRange,
	readTickStateSnapshot,
	TickStateHistoryDirectorySchema,
	TickStateHistoryWriter,
	type TickStateMemberSource,
} from "./tickStateHistory";
import type { ModifierSource, StatIndexedReadSource } from "./World/Member/runtime/StatContainer/StatContainerTypes";
import { ModifierType } from "./World/Member/runtime/StatContainer/StatContainerTypes";

const source: ModifierSource = {
	key: "skill.power",
	name: "Power Skill",
	type: "skill",
	chain: [
		{ kind: "member", id: "member-1" },
		{ kind: "skill", id: "skill-1" },
	],
};

class FakeStatSource implements StatIndexedReadSource {
	baseValue = 10;
	actValue = 12;
	modifierValue = 2;

	prepareIndexedRead(): void {}
	getAttributeCount(): number {
		return 1;
	}
	visitAttributeSchema(visitor: (index: number, path: string, displayName: string, expression: string) => void): void {
		visitor(0, "power", "Power", "base + fixed");
	}
	getBaseValueAt(index: number): number {
		if (index !== 0) throw new Error("invalid index");
		return this.baseValue;
	}
	getValueAt(index: number): number {
		if (index !== 0) throw new Error("invalid index");
		return this.actValue;
	}
	getModifierCountAt(index: number, type: ModifierType): number {
		return index === 0 && type === ModifierType.STATIC_FIXED ? 1 : 0;
	}
	visitModifiersAt(
		index: number,
		type: ModifierType,
		visitor: (modifierSource: ModifierSource, value: number) => void,
	): void {
		if (index === 0 && type === ModifierType.STATIC_FIXED) visitor(source, this.modifierValue);
	}
}

const createMember = (
	statContainer: StatIndexedReadSource,
): TickStateMemberSource & {
	position: { x: number; y: number; z: number };
} => ({
	id: "member-1",
	type: "Player" satisfies MemberType,
	name: "Member",
	campId: "camp-a",
	teamId: "team-a",
	position: { x: 1, y: 2, z: 3 },
	statContainer,
});

describe("TickStateHistory", () => {
	afterEach(() => performance.clearMarks("engine:tick-state-history"));

	it("从分段基准与增量精确还原属性值、modifier 来源和相对时间", () => {
		const stats = new FakeStatSource();
		const member = createMember(stats);
		const writer = new TickStateHistoryWriter(10, 1_000);

		writer.appendTick(10, 1_100, [member]);
		member.position.x = 4;
		writer.appendTick(11, 1_200, [member]);
		stats.actValue = 15;
		stats.modifierValue = 5;
		writer.appendTick(12, 1_300, [member]);

		const directory = TickStateHistoryDirectorySchema.parse(writer.finish());
		expect(directory.tickCount).toBe(3);
		expect(directory.segments).toHaveLength(1);
		expect(directory.segments[0]?.buffer).toBeInstanceOf(SharedArrayBuffer);

		const first = readTickStateSnapshot(directory, 0);
		expect(first.currentTimeMs).toBe(100);
		expect(first.members[0]?.attrs.power).toEqual(
			expect.objectContaining({
				baseValue: 10,
				actValue: 12,
				static: {
					fixed: [{ source, value: 2 }],
					percentage: [],
				},
			}),
		);

		const second = readTickStateSnapshot(directory, 1);
		expect(second.members[0]?.position.x).toBe(4);
		expect(second.members[0]?.attrs.power.actValue).toBe(12);

		const third = readTickStateSnapshot(directory, 2);
		expect(third.currentTimeMs).toBe(300);
		expect(third.members[0]?.attrs.power.actValue).toBe(15);
		expect(third.members[0]?.attrs.power.static.fixed).toEqual([{ source, value: 5 }]);
		expect(readTickStateRange(directory, 1, 3).map((snapshot) => snapshot.tickIndex)).toEqual([1, 2]);
		const metric = performance.getEntriesByName("engine:tick-state-history", "mark").at(-1);
		expect(metric && "detail" in metric ? metric.detail : undefined).toMatchObject({
			tickCount: 3,
			segmentCount: 1,
		});
	});

	it("长记录自动分段，并且目标 Tick 只依赖所在分段的完整基准", () => {
		const emptyStats: StatIndexedReadSource = {
			prepareIndexedRead() {},
			getAttributeCount: () => 0,
			visitAttributeSchema() {},
			getBaseValueAt: () => 0,
			getValueAt: () => 0,
			getModifierCountAt: () => 0,
			visitModifiersAt() {},
		};
		const member = createMember(emptyStats);
		const writer = new TickStateHistoryWriter(0, 0);
		for (let tick = 0; tick < 20_000; tick++) {
			member.position.x = tick;
			writer.appendTick(tick, tick * 10, [member]);
		}
		const directory = TickStateHistoryDirectorySchema.parse(writer.finish());

		expect(directory.segments.length).toBeGreaterThan(1);
		const secondSegmentStart = directory.segments[1]?.startTick;
		expect(readTickStateSnapshot(directory, secondSegmentStart).members[0]?.position.x).toBe(secondSegmentStart);
		expect(readTickStateSnapshot(directory, 19_999).members[0]?.position.x).toBe(19_999);
		const diagnostics = collectTickStateHistoryDiagnostics(directory);
		expect(diagnostics).toMatchObject({
			tickCount: 20_000,
			segmentCount: directory.segments.length,
			coveredTicks: 20_000,
			allShared: true,
			continuous: true,
		});
		expect(diagnostics.samples.map((sample) => sample.tickIndex)).toEqual([
			0,
			...directory.segments.slice(1).map((segment) => segment.startTick),
			19_999,
		]);
		expect(diagnostics.samples.every((sample) => sample.memberSchemaMatches)).toBe(true);
	});

	it("协议目录拒绝未封闭分段", () => {
		const writer = new TickStateHistoryWriter(0, 0);
		writer.appendTick(0, 10, [createMember(new FakeStatSource())]);
		const directory = writer.finish();
		const state = new Int32Array(directory.segments[0].buffer, 8, 1);
		Atomics.store(state, 0, 0);
		expect(() => TickStateHistoryDirectorySchema.parse(directory)).toThrow("未封闭");
		Atomics.store(state, 0, 1);
	});
});
