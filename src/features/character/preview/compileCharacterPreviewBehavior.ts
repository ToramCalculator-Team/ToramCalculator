import { MemberBTSchema, type MemberBTTree } from "@db/schema/jsons";
import { z } from "zod/v4";
import type {
	ActionNodeDefinition,
	RootNodeDefinition,
	SequenceNodeDefinition,
} from "~/lib/mistreevous/BehaviourTreeDefinition";
import { convertJSONToMDSL } from "~/lib/mistreevous/mdsl/MDSLDefinitionPrinter";

const CharacterPreviewSetupSkillSchema = z.object({
	skillId: z.string().min(1),
	targetMemberId: z.string().min(1).optional(),
});

export const CharacterPreviewPolicySchema = z.object({
	memberId: z.string().min(1),
	trainingTargetMemberId: z.string().min(1),
	setupSkills: z.array(CharacterPreviewSetupSkillSchema),
});
export type CharacterPreviewPolicy = z.output<typeof CharacterPreviewPolicySchema>;

export const CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY = "character-preview:candidate";

export function characterPreviewSetupInputKey(index: number): string {
	if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid Character preview setup index: ${index}`);
	return `character-preview:setup:${index}`;
}

const selectTargetNode = (targetMemberId: string, inputKey: string): ActionNodeDefinition => ({
	type: "action",
	call: "selectTarget",
	args: [targetMemberId, inputKey],
});

const castSkillNode = (skillId: string, inputKey: string): ActionNodeDefinition => ({
	type: "action",
	call: "castSkill",
	args: [skillId, inputKey],
});

const waitUntilActionSettledNode = (): ActionNodeDefinition => ({
	type: "action",
	call: "waitUntilActionSettled",
});

/**
 * 把 Character 预览策略编译为普通 Player member-flow。
 * 编译器只决定动作顺序、独立目标切换和稳定输入身份，不调用引擎，也不提前判断技能是否可用。
 */
export function compileCharacterPreviewBehavior(
	policy: CharacterPreviewPolicy,
	candidateSkillId: string,
): MemberBTTree {
	const parsedPolicy = CharacterPreviewPolicySchema.parse(policy);
	const parsedCandidateSkillId = z.string().min(1).parse(candidateSkillId);
	const children: ActionNodeDefinition[] = [];
	let currentTargetId: string | null = null;

	const appendSkill = (skillId: string, targetMemberId: string, inputKey: string) => {
		if (targetMemberId !== currentTargetId) {
			children.push(selectTargetNode(targetMemberId, `${inputKey}:target`));
			currentTargetId = targetMemberId;
		}
		children.push(castSkillNode(skillId, inputKey), waitUntilActionSettledNode());
	};

	parsedPolicy.setupSkills.forEach((setup, index) => {
		appendSkill(setup.skillId, setup.targetMemberId ?? parsedPolicy.memberId, characterPreviewSetupInputKey(index));
	});
	appendSkill(parsedCandidateSkillId, parsedPolicy.trainingTargetMemberId, CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY);

	const sequence: SequenceNodeDefinition = { type: "sequence", children };
	const definition: RootNodeDefinition = { type: "root", child: sequence };
	return MemberBTSchema.parse({
		name: "Character Skill Preview",
		definition: convertJSONToMDSL(definition),
		agent: "",
		memberType: "Player",
		attributeSlots: [],
	});
}
