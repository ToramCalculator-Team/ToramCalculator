import { defaultData } from "@db/defaultData";
import { describe, expect, it } from "vitest";
import { deriveEngineScenarioInput, resolveSimulatorScene } from "./resolveEngineScenario";

const playerMemberId = "player-member";
const mobMemberId = "mob-member";

/** 构造只包含 Player 与木桩 Mob 的普通持久设计，供解析边界测试共享。 */
function createDesign() {
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
	const playerMember = {
		...defaultData.member,
		id: playerMemberId,
		type: "Player" as const,
		characterId: character.id,
		character,
		mob: null,
		belongToTeamId: "team-a",
	};
	const mobMember = {
		...defaultData.member,
		id: mobMemberId,
		type: "Mob" as const,
		characterId: null,
		character: null,
		mobId: mob.id,
		mobDifficultyFlag: "Normal" as const,
		mob,
		belongToTeamId: "team-b",
	};
	return {
		...defaultData.simulator,
		id: "simulator-1",
		primaryMemberId: playerMemberId,
		teams: [
			{
				...defaultData.team,
				id: "team-a",
				camp: "A" as const,
				belongToSimulatorId: "simulator-1",
				members: [playerMember],
			},
			{
				...defaultData.team,
				id: "team-b",
				camp: "B" as const,
				belongToSimulatorId: "simulator-1",
				members: [mobMember],
			},
		],
		analysisSourceMembers: [{ id: playerMemberId }],
		analysisTargetMembers: [{ id: mobMemberId }],
	};
}

describe("Simulator 设计解析", () => {
	it("按 MemberType 解析唯一行为来源并保留分析范围", () => {
		const result = deriveEngineScenarioInput(createDesign());

		expect(result.campA[0].members[0].resolvedBehavior.name).toBe("manual-idle");
		expect(result.campB[0].members[0].resolvedBehavior).toEqual(defaultData.mob.actions);
		expect(result.initialTargetIds).toEqual({ [playerMemberId]: mobMemberId });
		expect(result).not.toHaveProperty("analysisSourceMemberIds");
		expect(result).not.toHaveProperty("analysisTargetMemberIds");
	});

	it("拒绝 Mob Member 保存成员流程", () => {
		const design = createDesign();
		design.teams[1].members[0].behavior = defaultData.mob.actions;

		expect(() => deriveEngineScenarioInput(design)).toThrow("类型关系不合法");
	});

	it("拒绝分析范围引用当前设计之外的 Member", () => {
		const design = createDesign();
		design.analysisTargetMembers = [{ id: "external-member" }];

		expect(() => deriveEngineScenarioInput(design)).toThrow("当前 Simulator 之外");
	});

	it("从同一设计版本派生逻辑输入与完整静态视觉资源", () => {
		const scene = resolveSimulatorScene(createDesign(), "copy-1");

		expect(scene.resolutionVersion).toBe("copy-1");
		expect(scene.worldResources).toEqual([
			expect.objectContaining({
				memberId: playerMemberId,
				kind: "character",
				model: { type: "gltf", uri: "/models/character.glb" },
				animation: expect.objectContaining({ type: "embedded" }),
			}),
			expect.objectContaining({
				memberId: mobMemberId,
				kind: "mob",
				model: { type: "primitive", shape: "sphere" },
				animation: null,
			}),
		]);
	});
});
