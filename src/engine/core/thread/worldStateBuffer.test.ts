import { describe, expect, it } from "vitest";
import {
	calculateModifierCapacity,
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	STATE_FLAG_AIRBORNE,
	STATE_FLAG_MOVING,
	WORLD_STATE_ERROR_CODES,
	WORLD_STATE_LAYOUT_VERSION,
	WORLD_STATE_MAX_AREA_CAPACITY,
	WORLD_STATE_MOB_ATTRIBUTE_COUNT,
	WORLD_STATE_PLAYER_ATTRIBUTE_COUNT,
	WorldStateAreaShapeKind,
	WorldStateAreaType,
	type WorldStateAttributeSchemaEntry,
	type WorldStateCommit,
	WorldStateEntityType,
	type WorldStateLayoutDescriptor,
	WorldStateProtocolError,
	WorldStateReader,
	WorldStateWriter,
	worldStateStringId,
} from "./worldStateBuffer";

const attributes = (count: number, prefix: string): WorldStateAttributeSchemaEntry[] =>
	Array.from({ length: count }, (_, index) => ({
		index,
		path: `${prefix}.${index}`,
		displayName: `${prefix}.${index}`,
		expression: "",
	}));

const emptyCommit = (
	members: WorldStateCommit["members"],
	areas: WorldStateCommit["areas"] = [],
): WorldStateCommit => ({
	logicalTimeMs: 100,
	tickIndex: 4,
	members,
	areas,
});

const inactiveMember = (id: string) => ({
	id,
	position: { x: 0, y: 0, z: 0 },
	yaw: 0,
});

describe("worldStateBuffer", () => {
	it("按 Player 138、Mob 31 和动态属性去重生成对齐布局", () => {
		const playerAttributes = [
			...attributes(WORLD_STATE_PLAYER_ATTRIBUTE_COUNT, "player"),
			{ index: 138, path: "dynamic.shared", displayName: "dynamic.shared", expression: "" },
			{ index: 139, path: "dynamic.shared", displayName: "dynamic.shared", expression: "" },
		];
		const layout = createWorldStateLayoutDescriptor([
			{
				id: "player",
				entityType: WorldStateEntityType.PLAYER,
				visualProfileId: 1,
				attributePaths: playerAttributes,
				modifierCount: 48,
			},
			{
				id: "mob",
				entityType: WorldStateEntityType.MOB,
				visualProfileId: 2,
				attributePaths: attributes(WORLD_STATE_MOB_ATTRIBUTE_COUNT, "mob"),
				modifierCount: 49,
			},
		]);

		expect(layout.layoutVersion).toBe(WORLD_STATE_LAYOUT_VERSION);
		expect(layout.memberCapacity).toBe(8);
		expect(layout.areaCapacity).toBe(WORLD_STATE_MAX_AREA_CAPACITY);
		expect(layout.memberDirectory[0]).toMatchObject({ attributeOffset: 0, attributeCount: 139, modifierCapacity: 128 });
		expect(layout.memberDirectory[1]).toMatchObject({
			attributeOffset: 139,
			attributeCount: 31,
			modifierCapacity: 256,
		});
		expect(layout.attributeSchema).toHaveLength(170);
		expect(layout.byteLength % 8).toBe(0);
	});

	it("为 modifier 计算 128、256、512 容量并使用稳定超限诊断码", () => {
		expect(calculateModifierCapacity(48)).toBe(128);
		expect(calculateModifierCapacity(49)).toBe(256);
		expect(calculateModifierCapacity(177)).toBe(512);
		expect(calculateModifierCapacity(432)).toBe(512);
		try {
			calculateModifierCapacity(433);
			throw new Error("预期 modifier 容量失败");
		} catch (error) {
			expect(error).toBeInstanceOf(WorldStateProtocolError);
			expect((error as WorldStateProtocolError).code).toBe(WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED);
		}
	});

	it("拒绝 Area 257 和不一致的布局版本、长度与 offset", () => {
		expect(() => createWorldStateLayoutDescriptor([], { memberCapacity: 0, areaCapacity: 257 })).toThrow(
			WORLD_STATE_ERROR_CODES.AREA_CAPACITY_EXCEEDED,
		);
		const layout = createWorldStateLayoutDescriptor([], { memberCapacity: 0, areaCapacity: 256 });
		expect(() => createWorldStateBuffer({ ...layout, byteLength: layout.byteLength + 8 })).toThrow(
			WORLD_STATE_ERROR_CODES.LAYOUT_SIZE_MISMATCH,
		);
		expect(() =>
			createWorldStateBuffer({ ...layout, layoutVersion: 999 } as unknown as WorldStateLayoutDescriptor),
		).toThrow(WORLD_STATE_ERROR_CODES.LAYOUT_VERSION_MISMATCH);

		const memberLayout = createWorldStateLayoutDescriptor(
			[
				{
					id: "member",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: attributes(1, "member"),
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 0 },
		);
		const invalidDirectory = memberLayout.memberDirectory.map((member) => ({ ...member, attributeOffset: 1 }));
		expect(() => createWorldStateBuffer({ ...memberLayout, memberDirectory: invalidDirectory })).toThrow(
			"offset 不连续",
		);
	});

	it("在一个稳定提交中读取成员、动作状态、mspd、modifier 来源链和区域", () => {
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 11,
					attributePaths: [
						{ index: 0, path: "mspd", displayName: "mspd", expression: "" },
						{ index: 1, path: "mspd", displayName: "mspd", expression: "" },
					],
					modifierSourceMetadata: [
						{
							idHash: 101,
							source: {
								key: "skill:101",
								name: "测试技能",
								type: "skill",
								chain: [
									{ kind: "member", id: "player" },
									{ kind: "skill", id: "101" },
								],
							},
						},
					],
					modifierCount: 1,
				},
			],
			{ memberCapacity: 1, areaCapacity: 1 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);

		writer.write({
			logicalTimeMs: 100,
			tickIndex: 4,
			members: [
				{
					id: "player",
					position: { x: 1, y: 2, z: 3 },
					yaw: 0.5,
					speed: 2.1,
					stateFlags: STATE_FLAG_MOVING | STATE_FLAG_AIRBORNE,
					state: { id: 7, instance: 3, startedAtLogicalTimeMs: 80 },
					attributes: { base: [10], act: [12] },
					modifiers: [{ attributeIndex: 0, type: 1, value: 2, sourceIndex: 0, chainIndex: 0 }],
				},
			],
			areas: [
				{
					id: "area-1",
					type: WorldStateAreaType.DAMAGE,
					position: { x: 4, y: 0, z: 5 },
					shape: { kind: WorldStateAreaShapeKind.CIRCLE, radius: 2 },
					remainingTimeMs: 50,
					sourceMemberId: "player",
				},
			],
			modifierSources: [{ idHash: 101, type: 2 }],
			modifierChains: [{ sourceIndex: 0, parentIndex: -1 }],
		});

		const snapshot = reader.readLatest();
		expect(snapshot).toMatchObject({
			commitVersion: 2,
			logicalTimeMs: 100,
			tickIndex: 4,
			modifierSources: [{ idHash: 101, type: 2 }],
			modifierChains: [{ sourceIndex: 0, parentIndex: -1 }],
		});
		expect(snapshot?.members[0]).toMatchObject({
			active: true,
			generation: 1,
			entityIdHash: worldStateStringId("player"),
			position: { x: 1, y: 2, z: 3 },
			state: { id: 7, instance: 3, startedAtLogicalTimeMs: 80 },
		});
		expect(layout.attributeSchema[0]?.path).toBe("mspd");
		expect(snapshot?.members[0]?.attributes[0]).toEqual({ base: 10, act: 12 });
		expect(layout.modifierSourceMetadata[0]?.source.name).toBe("测试技能");
		expect(snapshot?.members[0]?.modifiers[0]).toMatchObject({ sourceIndex: 0, chainIndex: 0, value: 2 });
		expect(snapshot?.areas[0]).toMatchObject({
			active: true,
			generation: 1,
			type: WorldStateAreaType.DAMAGE,
			shape: { kind: WorldStateAreaShapeKind.CIRCLE, radius: 2 },
			remainingTimeMs: 50,
			sourceMemberIndex: 0,
		});
	});

	it("动态成员槽释放后复用并递增 generation", () => {
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "fixed",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 2, areaCapacity: 0 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);

		writer.write(
			emptyCommit([
				inactiveMember("fixed"),
				{ ...inactiveMember("summon-a"), entityType: WorldStateEntityType.SUMMON, visualProfileId: 31 },
			]),
		);
		expect(reader.readLatest()?.members[1]).toMatchObject({
			active: true,
			generation: 1,
			entityIdHash: worldStateStringId("summon-a"),
		});

		writer.write(emptyCommit([inactiveMember("fixed")]));
		expect(reader.readLatest()?.members[1]?.active).toBe(false);

		writer.write(
			emptyCommit([
				inactiveMember("fixed"),
				{ ...inactiveMember("summon-b"), entityType: WorldStateEntityType.SUMMON, visualProfileId: 32 },
			]),
		);
		expect(reader.readLatest()?.members[1]).toMatchObject({
			active: true,
			generation: 2,
			entityIdHash: worldStateStringId("summon-b"),
			visualProfileId: 32,
		});
	});

	it("成员槽不足时拒绝整个提交且不改变提交版本", () => {
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "fixed",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 2, areaCapacity: 0 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const commit = emptyCommit([inactiveMember("fixed"), inactiveMember("summon-a"), inactiveMember("summon-b")]);

		expect(() => writer.write(commit)).toThrow(WORLD_STATE_ERROR_CODES.MEMBER_CAPACITY_EXCEEDED);
		expect(reader.getCommitVersion()).toBe(0);
	});

	it("在写锁前拒绝重复 ID 和非法 modifier 引用", () => {
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "member",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: attributes(1, "member"),
					modifierCapacity: 1,
				},
			],
			{ memberCapacity: 1, areaCapacity: 1 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const member = {
			...inactiveMember("member"),
			attributes: { base: [1], act: [1] },
			modifiers: [{ attributeIndex: 0, type: 1, value: 1, sourceIndex: -2, chainIndex: -1 }],
		};

		expect(() => writer.write(emptyCommit([member]))).toThrow("modifier 来源索引越界");
		expect(() =>
			writer.write({
				...emptyCommit([{ ...member, modifiers: [] }]),
				modifierSources: [{ idHash: 1, type: 1 }],
				modifierChains: [{ sourceIndex: 1, parentIndex: -1 }],
			}),
		).toThrow("modifier 链 0 的来源索引越界");
		expect(() =>
			writer.write(
				emptyCommit([
					{ ...member, modifiers: [] },
					{ ...member, active: false, modifiers: [] },
				]),
			),
		).toThrow("重复成员 ID");
		expect(() =>
			writer.write(
				emptyCommit(
					[],
					[
						{ id: "area", position: { x: 0, y: 0, z: 0 }, remainingTimeMs: 1 },
						{ id: "area", active: false, position: { x: 0, y: 0, z: 0 }, remainingTimeMs: 0 },
					],
				),
			),
		).toThrow("重复区域 ID");
		expect(reader.getCommitVersion()).toBe(0);
	});

	it("Area 按 ID 保持槽位并在复用后递增 generation", () => {
		const layout = createWorldStateLayoutDescriptor([], { memberCapacity: 0, areaCapacity: 2 });
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const area = (id: string) => ({ id, position: { x: 0, y: 0, z: 0 }, remainingTimeMs: 100 });

		writer.write(emptyCommit([], [area("area-a"), area("area-b")]));
		const first = reader.readLatest();
		const areaBSlot = first?.areas.findIndex((entry) => entry.idHash === worldStateStringId("area-b")) ?? -1;
		expect(first?.areas[areaBSlot]?.generation).toBe(1);

		writer.write(emptyCommit([], [area("area-b"), area("area-c")]));
		const second = reader.readLatest();
		expect(second?.areas[areaBSlot]).toMatchObject({ idHash: worldStateStringId("area-b"), generation: 1 });
		expect(second?.areas.find((entry) => entry.idHash === worldStateStringId("area-c"))?.generation).toBe(2);
	});

	it("附件边界拒绝非法 magic 和 descriptor 长度", () => {
		const layout = createWorldStateLayoutDescriptor([], { memberCapacity: 0, areaCapacity: 0 });
		expect(() => new WorldStateReader(new SharedArrayBuffer(16), layout)).toThrow("magic");
		const buffer = createWorldStateBuffer(layout);
		expect(() => new WorldStateWriter(buffer, { ...layout, byteLength: layout.byteLength + 8 })).toThrow(
			WORLD_STATE_ERROR_CODES.LAYOUT_SIZE_MISMATCH,
		);
	});

	it("以 60Hz、8 成员和持续区域创建完成短时 latest-state 负载", () => {
		const memberInputs = Array.from({ length: 8 }, (_, index) => ({
			id: `member-${index}`,
			entityType: index === 0 ? WorldStateEntityType.PLAYER : WorldStateEntityType.MOB,
			visualProfileId: index + 1,
			attributePaths: [],
			modifierCapacity: 0,
		}));
		const layout = createWorldStateLayoutDescriptor(memberInputs, { memberCapacity: 8, areaCapacity: 256 });
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);

		for (let tick = 0; tick < 120; tick++) {
			writer.write({
				logicalTimeMs: tick * (1000 / 60),
				tickIndex: tick,
				members: memberInputs.map((member, index) => ({
					id: member.id,
					position: { x: tick + index, y: 0, z: index },
					yaw: 0,
				})),
				areas: Array.from({ length: 64 }, (_, index) => ({
					id: `area-${tick % 4}-${index}`,
					position: { x: index, y: 0, z: tick },
					remainingTimeMs: 100,
				})),
			});
			const snapshot = reader.readLatest();
			expect(snapshot?.tickIndex).toBe(tick);
			expect(snapshot?.members.filter((member) => member.active)).toHaveLength(8);
			expect(snapshot?.areas.filter((area) => area.active)).toHaveLength(64);
		}

		expect(reader.getCommitVersion()).toBe(240);
		expect(buffer.byteLength).toBe(layout.byteLength);
	});
});
