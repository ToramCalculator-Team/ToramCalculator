import type { MemberBTTree } from "@db/schema/jsons";
import type { SkillExample } from "../types";

const defaultSkillDefinition = `root {
	sequence{
		action [state,"skill.charging"]
		wait [$currentSkill.lifecycle.charging]
		action [state,"skill.chanting"]
		wait [$currentSkill.lifecycle.chanting]
		action [state,"skill.startup"]
		wait [$currentSkill.lifecycle.startup]
        branch [mainAction]
		action [state,"skill.recovery"]
		wait [$currentSkill.lifecycle.recovery]
    }
}

root [mainAction] {
    sequence {
        action [rangeAttack, $targetId,"physical","physical",1,$伤害计算公式,1,$伤害标签,"none",3]
    }
}`;
const defaultSkillAgent = "";

export const skillLogicExample: Record<string, MemberBTTree> = {
	default: {
		memberType: "Player",
		name: "default",
		definition: defaultSkillDefinition,
		agent: defaultSkillAgent,
		attributeSlots: [],
	},
};

export const SkillLogicExamples: SkillExample[] = [
	...Object.entries(skillLogicExample).map(
		([key, value]) =>
			({
				name: key,
				caption: key,
				category: "common",
				definition: value.definition,
				board: value.agent,
			}) satisfies SkillExample,
	),
];
