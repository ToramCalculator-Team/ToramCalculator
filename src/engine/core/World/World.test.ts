import { describe, expect, it, vi } from "vitest";
import type { ResolvedDamageEffect } from "./Damage/types";
import { World } from "./World";

const effect: ResolvedDamageEffect = {
	identity: {
		sourceId: "caster",
		sourceCampId: "camp-a",
		sourceTeamId: "team-a",
		sourceSkillId: "skill-1",
	},
	attackSemantics: { damageCount: 1, damageIntervalMs: 0 },
	payload: {
		damageFormula: "100",
		casterSnapshot: {},
		skillLv: 1,
		damageTags: [],
		lockCasterAttributes: true,
	},
	targetId: "target",
	rangeKind: "Single",
	range: { shape: { kind: "point" }, anchor: { kind: "target" }, yaw: 0 },
};

function runTick(memberOrder: readonly ("caster" | "target")[]) {
	const world = new World();
	const dispatches: string[] = [];
	const dispatchCountSeenByTarget: number[] = [];
	const caster = {
		id: "caster",
		campId: "camp-a",
		position: { x: 0, y: 0, z: 0 },
		alive: true,
		tick: vi.fn(() => world.damageSystem.queueInstantDamage(effect)),
		integrateTerrainHeight: vi.fn(),
	};
	const target = {
		id: "target",
		campId: "camp-b",
		position: { x: 1, y: 0, z: 0 },
		alive: true,
		tick: vi.fn(() => dispatchCountSeenByTarget.push(dispatches.length)),
		integrateTerrainHeight: vi.fn(),
	};
	const members = { caster, target };
	// 测试替身只实现 World.tick 与空间查询所需的最小 Member 接口，因此在 mock 边界收窄类型。
	vi.spyOn(world.memberManager, "getAllMembers").mockReturnValue(memberOrder.map((id) => members[id]) as never);
	vi.spyOn(world.memberManager, "getMember").mockImplementation((id) => members[id as keyof typeof members] as never);

	world.tick({ tickIndex: 0, currentTimeMs: 0, deltaTimeMs: 16 }, undefined, (targetId) => {
		dispatches.push(targetId);
	});

	return { dispatches, dispatchCountSeenByTarget };
}

describe("World 瞬时伤害同步结算点", () => {
	it.each([
		["caster", "target"],
		["target", "caster"],
	] as const)("成员注册顺序为 %s -> %s 时都在成员 Tick 后派发", (...memberOrder) => {
		const result = runTick(memberOrder);
		expect(result.dispatchCountSeenByTarget).toEqual([0]);
		expect(result.dispatches).toEqual(["target"]);
	});

	it.each([
		["member-a", "member-b"],
		["member-b", "member-a"],
	] as const)("互相攻击时注册顺序为 %s -> %s 仍先锁定双方目标", (...memberOrder) => {
		const world = new World();
		const dispatchedTargets: string[] = [];
		const members = {
			"member-a": {
				id: "member-a",
				campId: "camp-a",
				position: { x: 0, y: 0, z: 0 },
				alive: true,
				tick: vi.fn(() =>
					world.damageSystem.queueInstantDamage({
						...effect,
						identity: { ...effect.identity, sourceId: "member-a", sourceCampId: "camp-a" },
						targetId: "member-b",
					}),
				),
				integrateTerrainHeight: vi.fn(),
			},
			"member-b": {
				id: "member-b",
				campId: "camp-b",
				position: { x: 1, y: 0, z: 0 },
				alive: true,
				tick: vi.fn(() =>
					world.damageSystem.queueInstantDamage({
						...effect,
						identity: { ...effect.identity, sourceId: "member-b", sourceCampId: "camp-b" },
						targetId: "member-a",
					}),
				),
				integrateTerrainHeight: vi.fn(),
			},
		};
		// 测试替身只实现本用例需要的最小 Member 接口，因此在 mock 边界收窄类型。
		vi.spyOn(world.memberManager, "getAllMembers").mockReturnValue(memberOrder.map((id) => members[id]) as never);
		vi.spyOn(world.memberManager, "getMember").mockImplementation((id) => members[id as keyof typeof members] as never);

		world.tick({ tickIndex: 0, currentTimeMs: 0, deltaTimeMs: 16 }, undefined, (targetId) => {
			dispatchedTargets.push(targetId);
			const target = targetId === "member-a" ? members["member-a"] : members["member-b"];
			target.alive = false;
		});

		expect(dispatchedTargets).toEqual(["member-b", "member-a"]);
	});
});
