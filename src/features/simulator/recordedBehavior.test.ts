import { defaultData } from "@db/defaultData";
import { describe, expect, it } from "vitest";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import { State } from "~/lib/mistreevous/State";
import { createDesignCopy } from "./designCopy";
import { compileRecordedActionsToMemberBehavior, createRecordedBehaviorDesignCopy } from "./recordedBehavior";
import { SimulationDesignSchema } from "./simulationDesignSchema";

const createSourceCopy = (primaryMemberId = "member-player") => {
	const character = {
		...defaultData.character,
		id: "character-1",
		belongToPlayerId: "player-1",
		weapon: null,
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		skills: [],
		registlets: [],
		avatars: [],
		consumables: [],
		combos: [],
	};
	const mob = { ...defaultData.mob, id: "mob-1" };
	return createDesignCopy(
		SimulationDesignSchema.parse({
			...defaultData.simulator,
			id: "simulator-1",
			primaryMemberId,
			teams: [
				{
					...defaultData.team,
					id: "team-a",
					camp: "A",
					belongToSimulatorId: "simulator-1",
					members: [
						{
							...defaultData.member,
							id: "member-player",
							type: "Player",
							characterId: character.id,
							character,
							mob: null,
							belongToTeamId: "team-a",
						},
					],
				},
				{
					...defaultData.team,
					id: "team-b",
					camp: "B",
					belongToSimulatorId: "simulator-1",
					members: [
						{
							...defaultData.member,
							id: "member-mob",
							type: "Mob",
							characterId: null,
							character: null,
							mobId: mob.id,
							mob,
							belongToTeamId: "team-b",
						},
					],
				},
			],
			analysisSourceMembers: [{ id: "member-player" }],
			analysisTargetMembers: [{ id: "member-mob" }],
		}),
	);
};

describe("录制成员流程编译", () => {
	it("按模拟时间编译真实目标切换与连续技能，不在每个技能前重复选择目标", () => {
		const behavior = compileRecordedActionsToMemberBehavior([
			{
				inputId: "target",
				memberId: "m",
				timeMs: 600,
				action: { type: "切换目标", payload: { targetId: "mob-1" } },
				status: "accepted",
			},
			{
				inputId: "a",
				memberId: "m",
				timeMs: 600,
				action: { type: "使用技能", payload: { skillId: "s1" } },
				status: "accepted",
			},
			{
				inputId: "b",
				memberId: "m",
				timeMs: 1200,
				action: { type: "使用技能", payload: { skillId: "s2" } },
				status: "accepted",
			},
			{
				inputId: "target-2",
				memberId: "m",
				timeMs: 1800,
				action: { type: "切换目标", payload: { targetId: "mob-2" } },
				status: "accepted",
			},
			{
				inputId: "c",
				memberId: "m",
				timeMs: 1800,
				action: { type: "使用技能", payload: { skillId: "s3" } },
				status: "accepted",
			},
		]);
		expect(behavior.definition).toContain("wait [600]");
		expect(behavior.definition).toContain('action [selectTarget, "mob-1", "target"]');
		expect(behavior.definition).toContain('action [castSkill, "s1", "a"]');
		expect(behavior.definition).toContain('action [castSkill, "s2", "b"]');
		expect(behavior.definition).toContain('action [selectTarget, "mob-2", "target-2"]');
		expect(behavior.definition).toContain('action [castSkill, "s3", "c"]');
		expect(behavior.definition.match(/action \[selectTarget/g)).toHaveLength(2);
		expect(behavior.definition.match(/action \[castSkill/g)).toHaveLength(3);
	});

	it("遇到首版不支持的 accepted 行动时明确失败", () => {
		expect(() =>
			compileRecordedActionsToMemberBehavior([
				{
					inputId: "move",
					memberId: "m",
					timeMs: 900,
					action: { type: "移动", payload: { position: { x: 1, y: 2 } } },
					status: "accepted",
				},
			]),
		).toThrow("行动录制暂不支持 accepted 输入: 移动 (move)");
	});

	it("生成流程在不同逻辑频率下都按原模拟时刻执行行动", () => {
		const behavior = compileRecordedActionsToMemberBehavior([
			{
				inputId: "first-target",
				memberId: "m",
				timeMs: 2000,
				action: { type: "切换目标", payload: { targetId: "mob-1" } },
				status: "accepted",
			},
			{
				inputId: "first-skill",
				memberId: "m",
				timeMs: 2000,
				action: { type: "使用技能", payload: { skillId: "s1" } },
				status: "accepted",
			},
			{
				inputId: "second-target",
				memberId: "m",
				timeMs: 5000,
				action: { type: "切换目标", payload: { targetId: "mob-2" } },
				status: "accepted",
			},
			{
				inputId: "second-skill",
				memberId: "m",
				timeMs: 5000,
				action: { type: "使用技能", payload: { skillId: "s2" } },
				status: "accepted",
			},
		]);
		const execute = (stepMs: number) => {
			let currentTimeMs = 0;
			const executed: Array<{ kind: string; value: string; timeMs: number }> = [];
			const tree = new BehaviourTree(
				behavior.definition,
				{
					selectTarget: (targetId: string) => {
						executed.push({ kind: "target", value: targetId, timeMs: currentTimeMs });
						return State.SUCCEEDED;
					},
					castSkill: (skillId: string) => {
						executed.push({ kind: "skill", value: skillId, timeMs: currentTimeMs });
						return State.SUCCEEDED;
					},
				},
				{ getCurrentTimeMs: () => currentTimeMs },
			);

			for (currentTimeMs = 0; currentTimeMs <= 5000; currentTimeMs += stepMs) tree.step();
			return executed;
		};

		const expected = [
			{ kind: "target", value: "mob-1", timeMs: 2000 },
			{ kind: "skill", value: "s1", timeMs: 2000 },
			{ kind: "target", value: "mob-2", timeMs: 5000 },
			{ kind: "skill", value: "s2", timeMs: 5000 },
		];
		expect(execute(100)).toEqual(expected);
		expect(execute(250)).toEqual(expected);
	});

	it("只从 RunRecord 的源副本分支新 DesignCopy", () => {
		const source = createSourceCopy();
		const unrelated = createSourceCopy();
		const unrelatedCharacter = unrelated.design.teams[0].members[0].character;
		if (!unrelatedCharacter) throw new Error("测试 DesignCopy 缺少 Character");
		unrelatedCharacter.lv = 255;
		const result = createRecordedBehaviorDesignCopy(
			[source, unrelated],
			[
				{
					id: "run-1",
					designCopyId: source.id,
					output: {
						inputs: [
							{
								inputId: "input-1",
								memberId: "member-player",
								timeMs: 600,
								action: { type: "使用技能", payload: { skillId: "skill-1" } },
								status: "accepted",
							},
						],
					},
				},
			],
			"run-1",
		);

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error(result.error);
		expect(result.copy.id).not.toBe(source.id);
		expect(result.copy.createdFromId).toBe(source.id);
		expect(result.copy.design.teams[0].members[0].character?.lv).toBe(source.design.teams[0].members[0].character?.lv);
		expect(result.copy.design.teams[0].members[0].behavior?.definition).toContain('castSkill, "skill-1"');
		expect(source.design.teams[0].members[0].behavior).toEqual(defaultData.member.behavior);
	});

	it("RunRecord、源副本或 Player 主控缺失时显式失败", () => {
		const source = createSourceCopy();
		expect(createRecordedBehaviorDesignCopy([source], [], "missing-run")).toEqual({
			ok: false,
			error: "RunRecord 不存在: missing-run",
		});
		expect(
			createRecordedBehaviorDesignCopy(
				[source],
				[{ id: "run-1", designCopyId: "missing-copy", output: { inputs: [] } }],
				"run-1",
			),
		).toEqual({ ok: false, error: "RunRecord run-1 的源 DesignCopy 不存在: missing-copy" });
		const mobPrimary = { ...source, id: "mob-primary-copy", design: structuredClone(source.design) };
		mobPrimary.design.primaryMemberId = "member-mob";
		expect(
			createRecordedBehaviorDesignCopy(
				[mobPrimary],
				[{ id: "run-2", designCopyId: mobPrimary.id, output: { inputs: [] } }],
				"run-2",
			),
		).toEqual({ ok: false, error: `源 DesignCopy ${mobPrimary.id} 缺少 Player 主控成员` });
	});
});
