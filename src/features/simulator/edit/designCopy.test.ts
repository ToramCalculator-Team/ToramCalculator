import { defaultData } from "@db/defaultData";
import { describe, expect, it } from "vitest";
import { SimulationDesignSchema } from "../data/simulationDesignSchema";
import { createDesignCopy, diffDesignCopies, editDesignCopy, forkDesignCopy } from "./designCopy";

const baseline = SimulationDesignSchema.parse({
	...defaultData.simulator,
	id: "simulator-1",
	primaryMemberId: "member-1",
	teams: [
		{
			...defaultData.team,
			id: "team-a",
			camp: "A",
			belongToSimulatorId: "simulator-1",
			members: [
				{
					...defaultData.member,
					id: "member-1",
					type: "Player",
					characterId: "character-1",
					belongToTeamId: "team-a",
					character: {
						...defaultData.character,
						id: "character-1",
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
					},
					mob: null,
				},
			],
		},
		{
			...defaultData.team,
			id: "team-b",
			camp: "B",
			belongToSimulatorId: "simulator-1",
			members: [],
		},
	],
	analysisSourceMembers: [{ id: "member-1" }],
	analysisTargetMembers: [{ id: "member-1" }],
});

describe("DesignCopy 差异", () => {
	it("从当前 DesignCopy 新增副本并记录来源", () => {
		const source = createDesignCopy(baseline);
		const next = forkDesignCopy(source);

		expect(next.id).not.toBe(source.id);
		expect(next.createdFromId).toBe(source.id);
		expect(next.hasRun).toBe(false);
		expect(next.design).toEqual(source.design);
	});

	it("编辑已验证副本时生成新副本并记录来源", () => {
		const source = { ...createDesignCopy(baseline), hasRun: true };
		const next = editDesignCopy(source, (draft) => {
			draft.randomSeed = 42;
		});

		expect(next.id).not.toBe(source.id);
		expect(next.createdFromId).toBe(source.id);
		expect(next.hasRun).toBe(false);
		expect(next.design.randomSeed).toBe(42);
	});

	it("成员跨队移动按稳定 Member 身份显示 FK 变化", () => {
		const candidate = structuredClone(baseline);
		const member = candidate.teams[0].members.pop();
		expect(member).toBeDefined();
		if (!member) return;
		member.belongToTeamId = "team-b";
		candidate.teams[1].members.push(member);

		const differences = diffDesignCopies(baseline, candidate).filter(
			(difference) => difference.entityType === "member" && difference.entityId === member.id,
		);
		expect(differences).toEqual([
			expect.objectContaining({ field: "belongToTeamId", before: "team-a", after: "team-b" }),
		]);
	});

	it("Character 装备 FK 进入应用前差异预览", () => {
		const candidate = structuredClone(baseline);
		const beforeWeaponId = baseline.teams[0].members[0].character?.weaponId;
		const character = candidate.teams[0].members[0].character;
		expect(character).not.toBeNull();
		if (!character) return;
		character.weaponId = "weapon-2";

		expect(diffDesignCopies(baseline, candidate)).toContainEqual(
			expect.objectContaining({
				entityType: "character",
				entityId: character.id,
				field: "weaponId",
				before: beforeWeaponId,
				after: "weapon-2",
			}),
		);
	});
});
