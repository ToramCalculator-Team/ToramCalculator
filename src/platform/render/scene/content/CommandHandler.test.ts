import { describe, expect, it, vi } from "vitest";
import {
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	WorldStateEntityType,
	WorldStateReader,
	WorldStateWriter,
	worldStateStringId,
} from "~/engine/core/thread/worldStateBuffer";
import type { Scene } from "~/platform/render/babylon/runtime";
import { createDefaultCharacterWorldResource } from "../resources/defaultCharacterResource";
import { CommandHandler } from "./CommandHandler";
import type { EntityFactory } from "./EntityFactory";
import type { EntityRuntime } from "./entityTypes";

function createHarness() {
	const entities = new Map<string, EntityRuntime>();
	const animationController = {
		setMotionSpeed: vi.fn(),
		setLocomotion: vi.fn(),
		setAirborne: vi.fn(),
		playAction: vi.fn(),
		stopAllAnimations: vi.fn(),
	};
	const entity = {
		id: "player",
		type: "character",
		lastSeq: 0,
		animationController,
		builtinAnimations: new Map(),
		customAnimations: new Map(),
		physics: {
			pos: { copyFromFloats: vi.fn() },
		},
		mesh: {
			position: { copyFrom: vi.fn() },
		},
	} as unknown as EntityRuntime;
	// 测试替身只实现 CommandHandler 创建实体所调用的工厂方法，其余 Babylon 能力不进入本测试。
	const factory = {
		createCharacter: vi.fn(async () => entity),
	} as unknown as EntityFactory;
	const handler = new CommandHandler(entities, factory, {} as Scene, {
		onPoseDiscontinuity: vi.fn(),
		onEntityRemoved: vi.fn(),
	});
	return { handler, entities, factory, animationController };
}

describe("CommandHandler 实时世界投影", () => {
	it("实时资源注册不预创建实体，并只接受精确 visualProfileId", async () => {
		const { handler, entities, factory } = createHarness();
		const resource = createDefaultCharacterWorldResource({
			memberId: "player",
			resourceId: "character-player",
			displayName: "Player",
		});
		await handler.applyWorldResources([resource], [], "realtime");
		expect(factory.createCharacter).not.toHaveBeenCalled();

		await handler.ensureEntityFromVisualProfile("player", worldStateStringId("player"), { x: 1, y: 2, z: 3 }, 1);
		expect(factory.createCharacter).toHaveBeenCalledOnce();
		expect(entities.has("player")).toBe(true);

		await handler.ensureEntityFromVisualProfile("unknown", 999_999, { x: 0, y: 0, z: 0 }, 2);
		expect(factory.createCharacter).toHaveBeenCalledOnce();
		expect(entities.has("unknown")).toBe(false);
	});

	it("同一动画时间线不重复启动，结束动作不补播", async () => {
		const { handler, animationController } = createHarness();
		const resource = createDefaultCharacterWorldResource({
			memberId: "player",
			resourceId: "character-player",
			displayName: "Player",
		});
		await handler.applyWorldResources([resource], [], "realtime");
		await handler.ensureEntityFromVisualProfile("player", worldStateStringId("player"), { x: 0, y: 0, z: 0 }, 1);
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: worldStateStringId("player"),
					attributePaths: [{ index: 0, path: "mspd", displayName: "mspd", expression: "" }],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 0 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);
		const writeTimeline = (ended: boolean) =>
			writer.write({
				logicalTimeMs: ended ? 200 : 100,
				tickIndex: ended ? 2 : 1,
				members: [
					{
						id: "player",
						position: { x: 0, y: 0, z: 0 },
						yaw: 0,
						attributes: { base: [50], act: [50] },
						animation: {
							id: worldStateStringId("jump"),
							progress: ended ? 1 : 0.25,
							logicTimeMs: 50,
							loop: false,
							ended,
						},
					},
				],
			});

		writeTimeline(false);
		const snapshot = reader.readLatest();
		if (!snapshot) throw new Error("预期读到稳定世界状态提交");
		const slots = new Map([["player", 0]]);
		handler.syncMemberAnimations(snapshot, layout, reader, slots);
		handler.syncMemberAnimations(snapshot, layout, reader, slots);
		expect(animationController.setAirborne).toHaveBeenCalledOnce();
		expect(animationController.setAirborne).toHaveBeenCalledWith(true, 0.25);

		writeTimeline(true);
		const endedSnapshot = reader.readLatest();
		if (!endedSnapshot) throw new Error("预期读到结束动作提交");
		handler.syncMemberAnimations(endedSnapshot, layout, reader, slots);
		expect(animationController.setAirborne).toHaveBeenCalledOnce();
	});
});
