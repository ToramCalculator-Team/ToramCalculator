import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { describe, expect, it } from "vitest";
import { WorldStateEntityType, type WorldStateMember, worldStateStringId } from "~/engine/core/thread/worldStateBuffer";
import { Scene, TransformNode, Vector3 } from "~/platform/render/babylon/runtime";
import type { EntityRuntime } from "./entityTypes";
import { StateProgressVisualSystem } from "./StateProgressVisualSystem";
import { resolveStateProgressVisual } from "./stateProgressVisuals";

type MemberOptions = {
	active?: boolean;
	generation?: number;
	state?: "skill.chanting" | "skill.charging" | "skill.startup";
	instance?: number;
	startedAtLogicalTimeMs?: number;
	chantingMs?: number;
};

function createMember(options: MemberOptions = {}): WorldStateMember {
	return {
		entityIdHash: worldStateStringId("player"),
		active: options.active ?? true,
		generation: options.generation ?? 1,
		entityType: WorldStateEntityType.PLAYER,
		visualProfileId: 1,
		position: { x: 0, y: 0, z: 0 },
		yaw: 0,
		speed: 0,
		stateFlags: 0,
		state: {
			id: worldStateStringId(options.state ?? "skill.chanting"),
			instance: options.instance ?? 1,
			startedAtLogicalTimeMs: options.startedAtLogicalTimeMs ?? 100,
		},
		skillExecution: {
			instance: 1,
			lifecycle: { charging: 0, chanting: options.chantingMs ?? 200, startup: 100, recovery: 100 },
		},
		attributes: [],
		modifiers: [],
	};
}

describe("stateProgressVisuals", () => {
	it("按共享逻辑时间返回起点、中点和终点进度", () => {
		const member = createMember();
		expect(resolveStateProgressVisual(member, 100)?.progress).toBe(0);
		expect(resolveStateProgressVisual(member, 200)?.progress).toBe(0.5);
		expect(resolveStateProgressVisual(member, 300)?.progress).toBe(1);
		expect(resolveStateProgressVisual(member, 350)?.progress).toBe(1);
	});

	it("非注册状态和无活动技能的状态不创建表现", () => {
		expect(resolveStateProgressVisual(createMember({ state: "skill.startup" }), 150)).toBeNull();
		const member = createMember();
		member.skillExecution = undefined;
		expect(resolveStateProgressVisual(member, 150)).toBeNull();
		expect(resolveStateProgressVisual(createMember({ chantingMs: 0 }), 150)).toBeNull();
	});

	it("状态实例、成员代次变化和成员失活都会销毁旧扇形", () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const system = new StateProgressVisualSystem(scene);
		const root = new TransformNode("player", scene);
		const entity: EntityRuntime = {
			id: "player",
			type: "sphere",
			mesh: root,
			lastSeq: 0,
			physics: {
				pos: Vector3.Zero(),
				vel: Vector3.Zero(),
				speed: 0,
				moving: false,
				yaw: 0,
			},
		};
		const entities = new Map([["player", entity]]);
		const slots = new Map([["player", 0]]);

		try {
			system.sync(entities, slots, [createMember()], 150);
			expect(scene.meshes).toHaveLength(1);
			const first = scene.meshes[0];

			system.sync(entities, slots, [createMember({ instance: 2 })], 150);
			expect(first?.isDisposed()).toBe(true);
			expect(scene.meshes).toHaveLength(1);
			const second = scene.meshes[0];

			system.sync(entities, slots, [createMember({ instance: 2, generation: 2 })], 150);
			expect(second?.isDisposed()).toBe(true);
			expect(scene.meshes).toHaveLength(1);

			system.sync(entities, slots, [createMember({ active: false, generation: 2 })], 150);
			expect(scene.meshes).toHaveLength(0);
		} finally {
			system.clear();
			scene.dispose();
			engine.dispose();
		}
	});
});
