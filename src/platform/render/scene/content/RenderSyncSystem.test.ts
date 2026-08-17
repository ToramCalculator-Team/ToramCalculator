import { describe, expect, it, vi } from "vitest";
import type { FrameLoopClockSnapshot } from "~/engine/core/FrameLoop/types";
import {
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	STATE_FLAG_MOVING,
	WorldStateEntityType,
	WorldStateReader,
	WorldStateWriter,
} from "~/engine/core/thread/worldStateBuffer";
import type { EntityRuntime } from "./entityTypes";
import { RenderSyncSystem, sampleWorldStateMembers } from "./RenderSyncSystem";

const clockSnapshot = (timelineTimeMs: number): FrameLoopClockSnapshot => ({
	state: "running",
	revision: 1,
	sampledAtEpochMs: 10_000,
	timelineTimeMs,
	timeScale: 1,
	fixedStepMs: 1000 / 60,
});

function createEntity() {
	const renderPosition = { x: 0, y: 0, z: 0 };
	const animationController = {
		setMovement: vi.fn(),
		setAirborne: vi.fn(),
	};
	const mesh = {
		setEnabled: vi.fn(),
		position: {
			copyFromFloats: (x: number, y: number, z: number) => Object.assign(renderPosition, { x, y, z }),
		},
		rotation: { y: 0 },
	};
	// 测试替身只覆盖 RenderSyncSystem 读取的实体字段。
	const entity = {
		id: "player",
		type: "character",
		mesh,
		animationController,
		physics: {
			pos: { x: 0, y: 0, z: 0 },
			yaw: 0,
			moving: false,
			speed: 0,
		},
	} as unknown as EntityRuntime;
	return { entity, mesh, renderPosition };
}

describe("RenderSyncSystem", () => {
	it("按统一渲染逻辑时间插值，并在 latest 之后按权威速度外推", () => {
		const fixedStepMs = 1000 / 60;
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 0 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const system = new RenderSyncSystem();
		const { entity, renderPosition } = createEntity();
		const entities = new Map([[entity.id, entity]]);
		const entitySlots = new Map([[entity.id, 0]]);
		const writePlayer = (logicalTimeMs: number, x: number) =>
			writer.write({
				logicalTimeMs,
				tickIndex: Math.round(logicalTimeMs / fixedStepMs),
				clock: clockSnapshot(logicalTimeMs),
				members: [
					{
						id: "player",
						position: { x, y: 0, z: 0 },
						yaw: Math.PI / 2,
						speed: 60,
						stateFlags: STATE_FLAG_MOVING,
						attributes: { base: [], act: [] },
					},
				],
			});

		writePlayer(100, 10);
		const previous = reader.readLatest();
		writePlayer(100 + fixedStepMs, 20);
		const latest = reader.readLatest();
		if (!previous || !latest) throw new Error("预期读到相邻的稳定世界状态提交");

		system.syncEntities(entities, entitySlots, sampleWorldStateMembers(previous, latest, 100 + fixedStepMs / 2));
		expect(renderPosition.x).toBeCloseTo(15, 5);

		system.syncEntities(
			entities,
			entitySlots,
			sampleWorldStateMembers(previous, latest, latest.logicalTimeMs + fixedStepMs / 2),
		);
		expect(renderPosition.x).toBeCloseTo(20.5, 5);
	});

	it("代次变化和槽位失活都在 latest 逻辑边界切换", () => {
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: 1,
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 0 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const system = new RenderSyncSystem();
		const { entity, mesh, renderPosition } = createEntity();
		const entities = new Map([[entity.id, entity]]);
		const entitySlots = new Map([[entity.id, 0]]);

		writer.write({
			logicalTimeMs: 100,
			tickIndex: 6,
			clock: clockSnapshot(100),
			members: [{ id: "player", position: { x: 10, y: 0, z: 0 }, yaw: 0 }],
		});
		const oldGeneration = reader.readLatest();
		writer.write({ logicalTimeMs: 110, tickIndex: 7, clock: clockSnapshot(110), members: [] });
		const inactive = reader.readLatest();
		if (!oldGeneration || !inactive) throw new Error("预期读到稳定世界状态提交");
		system.syncEntities(entities, entitySlots, sampleWorldStateMembers(oldGeneration, inactive, 105));
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(true);
		expect(renderPosition.x).toBe(10);
		system.syncEntities(entities, entitySlots, sampleWorldStateMembers(oldGeneration, inactive, 110));
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(false);

		writer.write({
			logicalTimeMs: 120,
			tickIndex: 8,
			clock: clockSnapshot(120),
			members: [{ id: "player", position: { x: 30, y: 0, z: 0 }, yaw: 0 }],
		});
		const rebuilt = reader.readLatest();
		if (!rebuilt) throw new Error("预期读到重建后的稳定世界状态提交");
		expect(rebuilt.members[0]?.generation).toBe(2);
		system.syncEntities(entities, entitySlots, sampleWorldStateMembers(oldGeneration, rebuilt, 115));
		expect(renderPosition.x).toBe(10);
		system.syncEntities(entities, entitySlots, sampleWorldStateMembers(oldGeneration, rebuilt, 120));
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(true);
		expect(renderPosition.x).toBe(30);
	});
});
