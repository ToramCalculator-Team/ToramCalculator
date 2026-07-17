import { describe, expect, it } from "vitest";
import { convertMDSLToJSON } from "~/lib/mistreevous";
import {
	CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY,
	characterPreviewSetupInputKey,
	compileCharacterPreviewBehavior,
} from "./compileCharacterPreviewBehavior";

describe("compileCharacterPreviewBehavior", () => {
	it("按策略顺序编译 setup 与候选，并应用默认目标", () => {
		const behavior = compileCharacterPreviewBehavior(
			{
				memberId: "preview-member",
				trainingTargetMemberId: "training-target",
				setupSkills: [{ skillId: "setup-a" }, { skillId: "setup-a", targetMemberId: "custom-target" }],
			},
			"candidate-skill",
		);

		const [root] = convertMDSLToJSON(behavior.definition);
		expect(root).toEqual({
			type: "root",
			child: {
				type: "sequence",
				children: [
					{
						type: "action",
						call: "selectTarget",
						args: ["preview-member", `${characterPreviewSetupInputKey(0)}:target`],
					},
					{
						type: "action",
						call: "castSkill",
						args: ["setup-a", characterPreviewSetupInputKey(0)],
					},
					{ type: "action", call: "waitUntilActionSettled", args: [] },
					{
						type: "action",
						call: "selectTarget",
						args: ["custom-target", `${characterPreviewSetupInputKey(1)}:target`],
					},
					{
						type: "action",
						call: "castSkill",
						args: ["setup-a", characterPreviewSetupInputKey(1)],
					},
					{ type: "action", call: "waitUntilActionSettled", args: [] },
					{
						type: "action",
						call: "selectTarget",
						args: ["training-target", `${CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY}:target`],
					},
					{
						type: "action",
						call: "castSkill",
						args: ["candidate-skill", CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY],
					},
					{ type: "action", call: "waitUntilActionSettled", args: [] },
				],
			},
		});
		expect(behavior).toMatchObject({ memberType: "Player", agent: "", attributeSlots: [] });
	});

	it("空 setup 只生成候选分支，并对相同输入产生稳定 MDSL", () => {
		const policy = {
			memberId: "preview-member",
			trainingTargetMemberId: "training-target",
			setupSkills: [],
		};

		const first = compileCharacterPreviewBehavior(policy, "candidate-skill");
		const second = compileCharacterPreviewBehavior(policy, "candidate-skill");

		expect(second).toEqual(first);
		expect(first.definition.match(/castSkill/g)).toHaveLength(1);
		expect(first.definition.match(/selectTarget/g)).toHaveLength(1);
		expect(first.definition.match(/waitUntilActionSettled/g)).toHaveLength(1);
	});

	it("拒绝非法策略、候选技能与 setup 索引", () => {
		expect(() =>
			compileCharacterPreviewBehavior(
				{ memberId: "", trainingTargetMemberId: "training-target", setupSkills: [] },
				"candidate-skill",
			),
		).toThrow();
		expect(() =>
			compileCharacterPreviewBehavior(
				{ memberId: "preview-member", trainingTargetMemberId: "training-target", setupSkills: [] },
				"",
			),
		).toThrow();
		expect(() => characterPreviewSetupInputKey(-1)).toThrow("Invalid Character preview setup index");
	});
});
