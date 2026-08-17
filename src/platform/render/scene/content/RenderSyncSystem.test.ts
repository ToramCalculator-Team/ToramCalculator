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
	it("只消费调用方提供的完整提交，并在代次变化时丢弃旧状态", () => {
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

		const writePlayer = (x: number, speed = 2, moving = true) =>
			writer.write({
				logicalTimeMs: 100,
				tickIndex: 1,
				members: [
					{
						id: "player",
						position: { x, y: 0, z: 0 },
						yaw: 0,
						speed,
						stateFlags: moving ? STATE_FLAG_MOVING : 0,
						attributes: { base: [], act: [] },
					},
				],
			});

		// 首帧：直接跳到权威位置
		writePlayer(10);
		const first = reader.readLatest();
		system.syncEntities(entities, entitySlots, first, 1 / 60);
		expect(renderPosition.x).toBe(10);

		// 版本变化：瞬间校正到新位置
		writePlayer(20);
		const second = reader.readLatest();
		system.syncEntities(entities, entitySlots, second, 1 / 60);
		expect(renderPosition.x).toBe(20);

		// 版本不变：基于权威速度外推（speed=2, yaw=0 → vz=2, 1/60秒 → z 移动 2/60）
		system.syncEntities(entities, entitySlots, second, 1 / 60);
		expect(renderPosition.x).toBe(20); // x 不变（yaw=0 时速度在 z 方向）
		expect(renderPosition.z).toBeCloseTo(2 / 60, 5);

		// 再次版本不变：继续外推
		system.syncEntities(entities, entitySlots, second, 1 / 60);
		expect(renderPosition.z).toBeCloseTo(4 / 60, 5);

		// 实体失活
		writer.write({ logicalTimeMs: 120, tickIndex: 2, members: [] });
		system.syncEntities(entities, entitySlots, reader.readLatest(), 1 / 60);
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(false);

		// 代次变化（重建）：瞬间跳到新位置，旧的外推状态被丢弃
		writePlayer(30);
		const rebuilt = reader.readLatest();
		expect(rebuilt?.members[0]?.generation).toBe(2);
		system.syncEntities(entities, entitySlots, rebuilt, 1 / 60);
		expect(mesh.setEnabled).toHaveBeenLastCalledWith(true);
		expect(renderPosition.x).toBe(30);
		expect(renderPosition.z).toBe(0);
	});
});
