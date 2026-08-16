import { describe, expect, it, vi } from "vitest";
import {
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	STATE_FLAG_MOVING,
	WorldStateEntityType,
	WorldStateReader,
	WorldStateWriter,
} from "~/engine/core/thread/worldStateBuffer";
import type { EntityRuntime } from "./entityTypes";
import { RenderSyncSystem } from "./RenderSyncSystem";

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
	return { entity, mesh, renderPosition, animationController };
}

describe("RenderSyncSystem", () => {
	it("只消费调用方提供的完整提交，并在代次变化时丢弃旧插值", () => {
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
		const readLatest = vi.spyOn(reader, "readLatest");
		const system = new RenderSyncSystem();
		const { entity, mesh, renderPosition, animationController } = createEntity();
		const entities = new Map([[entity.id, entity]]);
		const entitySlots = new Map([[entity.id, 0]]);
		const writePlayer = (x: number) =>
			writer.write({
				logicalTimeMs: 100,
				tickIndex: 1,
				members: [
					{
						id: "player",
						position: { x, y: 0, z: 0 },
						yaw: 0,
						speed: 2,
						stateFlags: STATE_FLAG_MOVING,
						attributes: { base: [], act: [] },
					},
				],
			});

		writePlayer(0);
		const first = reader.readLatest();
		system.syncEntities(entities, entitySlots, first, 1 / 60);
		expect(readLatest).toHaveBeenCalledTimes(1);
		expect(renderPosition.x).toBe(0);

		writePlayer(10);
		const second = reader.readLatest();
		system.syncEntities(entities, entitySlots, second, 1 / 60);
		expect(readLatest).toHaveBeenCalledTimes(2);
		expect(renderPosition.x).toBeGreaterThan(0);
		expect(renderPosition.x).toBeLessThan(10);

		writer.write({ logicalTimeMs: 120, tickIndex: 2, members: [] });
		system.syncEntities(entities, entitySlots, reader.readLatest(), 1 / 60);
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(false);

		writePlayer(20);
		const rebuilt = reader.readLatest();
		expect(rebuilt?.members[0]?.generation).toBe(2);
		system.syncEntities(entities, entitySlots, rebuilt, 1 / 60);
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(true);
		expect(renderPosition.x).toBe(20);
	});
});
