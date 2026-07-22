import { defaultData } from "@db/defaultData";
import { CharacterWithRelationsSchema } from "@db/generated/repositories/character";
import { CharacterSchema, PlayerSchema } from "@db/generated/zod/index";
import { describe, expect, it } from "vitest";
import { SimulationTaskSchema } from "~/lib/engine/core/simulationTask";
import type { CharacterLiveAggregate } from "../data/characterAggregateQuery";
import { CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY } from "./compileCharacterPreviewBehavior";
import {
	createDefaultCharacterPreviewPolicy,
	resolveCharacterPreviewTask,
	resolveCharacterRealtimeScenario,
} from "./resolveCharacterPreviewTask";

const createAggregate = (): CharacterLiveAggregate => {
	const character = CharacterWithRelationsSchema.parse({
		...defaultData.character,
		id: "character-1",
		name: "Preview Character",
		belongToPlayerId: "player-1",
		weapon: null,
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		avatars: [],
		skills: [],
		registlets: [],
		consumables: [],
		combos: [],
	});
	return {
		player: PlayerSchema.parse({ ...defaultData.player, id: "player-1" }),
		character,
		characters: [CharacterSchema.parse(character)],
		assets: {
			weapons: [],
			armors: [],
			options: [],
			specials: [],
			weaponsById: {},
			armorsById: {},
			optionsById: {},
			specialsById: {},
		},
		relations: { skillsById: {}, registletsById: {}, combosById: {}, consumablesById: {} },
	};
};

describe("resolveCharacterPreviewTask", () => {
	it("从 Character 验证输入构造确定性的训练场景与通用任务", () => {
		const aggregate = createAggregate();
		const original = structuredClone(aggregate);
		const policy = {
			...createDefaultCharacterPreviewPolicy(aggregate.character.id),
			setupSkills: [{ skillId: "setup-skill" }],
		};
		const task = resolveCharacterPreviewTask({
			runId: "run-1",
			character: aggregate.character,
			policy,
			candidateSkillId: "candidate-skill",
		});

		expect(SimulationTaskSchema.parse(task)).toEqual(task);
		expect(task.stopPolicy).toEqual({ kind: "untilMemberFlowEnds", memberId: policy.memberId });
		expect(task.runtimeConfig).toMatchObject({ driveMode: "unclocked", acceptExternalIntents: false });
		expect(task.scenarioData.scenario.primaryMemberId).toBe(policy.memberId);
		expect(task.scenarioData.scenario.campB[0]?.members[0]?.id).toBe(policy.trainingTargetMemberId);
		expect(task.scenarioData.scenario.campA[0]?.members[0]?.resolvedBehavior.definition).toContain(
			CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY,
		);
		expect(aggregate).toEqual(original);
	});

	it("不提前拒绝验证输入中不存在的候选技能，由 Player FSM 在运行时裁决", () => {
		const aggregate = createAggregate();
		const policy = createDefaultCharacterPreviewPolicy(aggregate.character.id);
		expect(() =>
			resolveCharacterPreviewTask({
				runId: "run-missing-skill",
				character: aggregate.character,
				policy,
				candidateSkillId: "missing-skill",
			}),
		).not.toThrow();
	});

	it("实时属性场景使用无候选业务的 idle behavior，并返回可 patch 的 Player member", () => {
		const aggregate = createAggregate();
		const policy = createDefaultCharacterPreviewPolicy(aggregate.character.id);
		const resolved = resolveCharacterRealtimeScenario(aggregate.character, policy);

		expect(resolved.member.id).toBe(policy.memberId);
		expect(resolved.member.character?.id).toBe(aggregate.character.id);
		expect(resolved.member.resolvedBehavior.definition).toBe("root { wait [1] }");
		expect(resolved.scenarioData.scenario.campA[0]?.members).toEqual([resolved.member]);
	});

	it("默认 policy 的成员身份由 Character 身份稳定派生", () => {
		expect(createDefaultCharacterPreviewPolicy("character-1")).toEqual(
			createDefaultCharacterPreviewPolicy("character-1"),
		);
		expect(createDefaultCharacterPreviewPolicy("character-1")).not.toEqual(
			createDefaultCharacterPreviewPolicy("character-2"),
		);
	});
});
