import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import type { EngineCharacter, EngineCharacterSkill } from "../../../../engineScenarioSchema";
import { MemberRuntimeServicesDefaults } from "../../RuntimeServices";
import { type PlayerRuntime, PlayerRuntimeDefaults } from "../../runtime/types";
import { type PlayerFSMEnv, playerFSM } from "./PlayerStateMachine";

function createSkillFixture(): { character: EngineCharacter; skill: EngineCharacterSkill } {
	// 测试只需要 Player FSM 读取的技能选择、消耗和 active behavior 字段。
	const skill = {
		id: "skill-1",
		lv: 1,
		template: {
			name: "测试技能",
			treeType: "Magic",
			variants: [
				{
					id: "variant-1",
					targetMainWeaponType: "Any",
					targetSubWeaponType: "Any",
					targetArmorAbilityType: "Any",
					activeBehavior: {},
					activeBehaviorTree: null,
					hpCost: "0",
					mpCost: "0",
				},
			],
		},
	} as unknown as EngineCharacterSkill;
	const character = {
		skills: [skill],
		weapon: null,
		subWeapon: null,
		armor: null,
	} as unknown as EngineCharacter;
	return { character, skill };
}

function createHarness(withSkill: boolean) {
	const fixture = withSkill ? createSkillFixture() : null;
	const runtime: PlayerRuntime = {
		...structuredClone(PlayerRuntimeDefaults),
		memberId: "player",
		name: "Player",
		campId: "camp-a",
		teamId: "team-a",
		targetId: "target",
		data: fixture?.character ?? null,
		skillList: fixture ? [fixture.skill] : [],
		skillCooldowns: fixture ? [0] : [],
	};
	const faceCurrentTarget = vi.fn(() => true);
	const notifyDomainEvent = vi.fn();
	const runPipeline = vi.fn((name: string) => (name === "skill.cost" ? { hpCost: 0, mpCost: 0 } : { durationMs: 0 }));
	// 测试替身只实现这些状态转换实际读取的 AttributeContainer、BtManager 与服务能力。
	const env = {
		id: runtime.memberId,
		name: runtime.name,
		position: runtime.position,
		runtime,
		attributeContainer: {
			getValue: vi.fn(() => 1000),
			addModifier: vi.fn(),
			removeModifiersBySourceKeyPrefix: vi.fn(),
		},
		services: {
			...MemberRuntimeServicesDefaults,
			expressionEvaluator: vi.fn(() => 0),
		},
		btManager: {
			registerActiveEffectBt: vi.fn(),
			unregisterActiveEffectBt: vi.fn(),
			hasActiveEffectBt: vi.fn(() => withSkill),
			clearStateDeclarations: vi.fn(),
		},
		notifyDomainEvent,
		emitProc: vi.fn(),
		faceCurrentTarget,
		runPipeline,
		send: vi.fn(),
	} as unknown as PlayerFSMEnv;
	const actor = createActor(playerFSM(env));
	actor.start();
	return { actor, faceCurrentTarget, notifyDomainEvent };
}

describe("Player FSM 动作朝向", () => {
	it("进入格挡状态时朝向当前目标", () => {
		const { actor, faceCurrentTarget } = createHarness(false);
		try {
			actor.send({ id: "guard-1", type: "使用格挡", data: {} });
			expect(faceCurrentTarget).toHaveBeenCalledOnce();
			expect(actor.getSnapshot().matches({ 存活: { 可操作状态: { 动作状态: "格挡中" } } })).toBe(true);
		} finally {
			actor.stop();
		}
	});

	it("技能越过接纳条件后朝向当前目标", () => {
		const { actor, faceCurrentTarget, notifyDomainEvent } = createHarness(true);
		try {
			actor.send({ id: "skill-input-1", type: "使用技能", data: { skillId: "skill-1" } });
			expect(faceCurrentTarget).toHaveBeenCalledOnce();
			expect(notifyDomainEvent).toHaveBeenCalledWith(
				expect.objectContaining({ type: "skill_cast_accepted", targetId: "target" }),
			);
		} finally {
			actor.stop();
		}
	});

	it("技能被拒绝时不改变朝向", () => {
		const { actor, faceCurrentTarget } = createHarness(false);
		try {
			actor.send({ id: "skill-input-1", type: "使用技能", data: { skillId: "missing-skill" } });
			expect(faceCurrentTarget).not.toHaveBeenCalled();
		} finally {
			actor.stop();
		}
	});
});
