import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { describe, expect, it, vi } from "vitest";
import type { FrameLoopClockSnapshot } from "~/engine/core/FrameLoop/types";
import {
	createWorldStateBuffer,
	createWorldStateLayoutDescriptor,
	WorldStateAreaShapeKind,
	WorldStateAreaType,
	WorldStateDamageRangeKind,
	WorldStateEntityType,
	WorldStateReader,
	WorldStateWriter,
	worldStateStringId,
} from "~/engine/core/thread/worldStateBuffer";
import { Scene } from "~/platform/render/babylon/runtime";
import { createDefaultCharacterWorldResource } from "../resources/defaultCharacterResource";
import { CommandHandler } from "./CommandHandler";
import type { EntityFactory } from "./EntityFactory";
import type { EntityRuntime } from "./entityTypes";

const clockSnapshot = (timelineTimeMs: number): FrameLoopClockSnapshot => ({
	state: "running",
	revision: 1,
	sampledAtEpochMs: 10_000,
	timelineTimeMs,
	timeScale: 1,
	fixedStepMs: 1000 / 60,
});

function createHarness() {
	const entities = new Map<string, EntityRuntime>();
	const animationController = {
		setLocomotion: vi.fn(),
		setAirborne: vi.fn(),
		playAction: vi.fn(),
		playStateTimeline: vi.fn(),
		updateStateTimelineProgress: vi.fn(),
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
	const handler = new CommandHandler(entities, factory, {} as Scene);
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

	it("按逻辑时间定位状态动画，实例变化才重启，清除描述后停止", async () => {
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
		const writeTimeline = (logicalTimeMs: number, instance = 1, active = true) =>
			writer.write({
				logicalTimeMs,
				tickIndex: logicalTimeMs / 50,
				clock: clockSnapshot(logicalTimeMs),
				members: [
					{
						id: "player",
						position: { x: 0, y: 0, z: 0 },
						yaw: 0,
						attributes: { base: [50], act: [50] },
						...(active
							? {
									state: {
										id: worldStateStringId("skill.startup"),
										instance,
										startedAtLogicalTimeMs: 50,
									},
								}
							: {}),
					},
				],
			});

		writeTimeline(100);
		const snapshot = reader.readLatest();
		if (!snapshot) throw new Error("预期读到稳定世界状态提交");
		const slots = new Map([["player", 0]]);
		handler.syncMemberStates(snapshot, layout, slots, 90);
		handler.syncMemberStates(snapshot, layout, slots, 90);
		const startupMapping = resource.animation.states["skill.startup"];
		const initialProgress = 40 / startupMapping.durationMs;
		expect(animationController.playStateTimeline).toHaveBeenCalledOnce();
		expect(animationController.playStateTimeline).toHaveBeenCalledWith(startupMapping, initialProgress);
		expect(animationController.updateStateTimelineProgress).toHaveBeenCalledWith(initialProgress);

		writeTimeline(150);
		const middleSnapshot = reader.readLatest();
		if (!middleSnapshot) throw new Error("预期读到稳定世界状态提交");
		handler.syncMemberStates(middleSnapshot, layout, slots, 125);
		expect(animationController.playStateTimeline).toHaveBeenCalledOnce();
		expect(animationController.updateStateTimelineProgress).toHaveBeenLastCalledWith(75 / startupMapping.durationMs);

		writeTimeline(150, 2);
		const nextSnapshot = reader.readLatest();
		if (!nextSnapshot) throw new Error("预期读到稳定世界状态提交");
		handler.syncMemberStates(nextSnapshot, layout, slots, 150);
		expect(animationController.playStateTimeline).toHaveBeenCalledTimes(2);

		writeTimeline(200, 2, false);
		const clearedSnapshot = reader.readLatest();
		if (!clearedSnapshot) throw new Error("预期读到稳定世界状态提交");
		handler.syncMemberStates(clearedSnapshot, layout, slots, 200);
		expect(animationController.stopAllAnimations).toHaveBeenCalledOnce();
		handler.syncMemberStates(clearedSnapshot, layout, slots, 200);
		expect(animationController.stopAllAnimations).toHaveBeenCalledOnce();
	});

	it("伤害区域网格统一位于逻辑位置上方 0.1m", () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const handler = new CommandHandler(new Map(), {} as EntityFactory, scene);
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: worldStateStringId("player"),
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 1 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);

		try {
			writer.write({
				logicalTimeMs: 100,
				tickIndex: 6,
				clock: clockSnapshot(100),
				members: [
					{
						id: "player",
						position: { x: 0, y: 0, z: 0 },
						yaw: 0,
						attributes: { base: [], act: [] },
					},
				],
				areas: [
					{
						id: "damage-1",
						type: WorldStateAreaType.DAMAGE,
						rangeKind: WorldStateDamageRangeKind.RANGE,
						shape: { kind: WorldStateAreaShapeKind.CIRCLE, radius: 2 },
						position: { x: 4, y: 2, z: 5 },
						yaw: 0,
						spawnTimeMs: 100,
						durationMs: 500,
						sourceMemberId: "player",
					},
				],
			});
			const snapshot = reader.readLatest();
			if (!snapshot) throw new Error("预期读到稳定世界状态提交");

			handler.syncAreas(snapshot, 100, [{ x: 0, y: 0, z: 0 }]);

			expect(scene.meshes).toHaveLength(1);
			expect(scene.meshes[0]?.position).toMatchObject({ x: 4, z: 5 });
			expect(scene.meshes[0]?.position.y).toBeCloseTo(2.1);
		} finally {
			handler.disposeAreaVisuals();
			scene.dispose();
			engine.dispose();
		}
	});

	it("直线区域快照创建矩形 Ground 网格", () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const handler = new CommandHandler(new Map(), {} as EntityFactory, scene);
		const layout = createWorldStateLayoutDescriptor(
			[
				{
					id: "player",
					entityType: WorldStateEntityType.PLAYER,
					visualProfileId: worldStateStringId("player"),
					attributePaths: [],
					modifierCapacity: 0,
				},
			],
			{ memberCapacity: 1, areaCapacity: 1 },
		);
		const buffer = createWorldStateBuffer(layout);
		const writer = new WorldStateWriter(buffer, layout);
		const reader = new WorldStateReader(buffer, layout);

		try {
			writer.write({
				logicalTimeMs: 100,
				tickIndex: 6,
				clock: clockSnapshot(100),
				members: [
					{
						id: "player",
						position: { x: 0, y: 0, z: 0 },
						yaw: 0,
						attributes: { base: [], act: [] },
					},
				],
				areas: [
					{
						id: "line-1",
						type: WorldStateAreaType.DAMAGE,
						rangeKind: WorldStateDamageRangeKind.LINE,
						shape: { kind: WorldStateAreaShapeKind.RECTANGLE, width: 3, height: 4 },
						position: { x: 2, y: 0, z: 0 },
						yaw: Math.PI / 2,
						spawnTimeMs: 100,
						durationMs: 16,
						sourceMemberId: "player",
					},
				],
			});
			const snapshot = reader.readLatest();
			if (!snapshot) throw new Error("预期读到稳定世界状态提交");

			handler.syncAreas(snapshot, 100, [{ x: 0, y: 0, z: 0 }]);

			expect(scene.meshes).toHaveLength(1);
			const mesh = scene.meshes[0];
			expect(mesh?.getClassName()).toBe("GroundMesh");
			expect(mesh?.position).toMatchObject({ x: 2, z: 0 });
			expect(mesh?.rotation.y).toBeCloseTo(Math.PI / 2);
			const extendSize = mesh?.getBoundingInfo().boundingBox.extendSize;
			expect(extendSize?.x).toBeCloseTo(1.5);
			expect(extendSize?.z).toBeCloseTo(2);
		} finally {
			handler.disposeAreaVisuals();
			scene.dispose();
			engine.dispose();
		}
	});
});
