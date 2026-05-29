import type { MemberBTTree } from "@db/schema/jsons";
import type { SkillExample } from "../types";

const defaultSkillDefinition = `root {
	sequence{
		action [animation,"蓄力动画",$currentSkill.lifecycle.chargingMs]
		wait [$currentSkill.lifecycle.chargingMs]
		action [animation, "咏唱动画",$currentSkill.lifecycle.chantingMs]
		wait [$currentSkill.lifecycle.chantingMs]
		action [animation,"施法前摇",$currentSkill.lifecycle.startupMs]
		wait [$currentSkill.lifecycle.startupMs]
        branch [mainAction]
		action [animation, "施法后摇", $后摇毫秒]
		wait [$后摇毫秒]
    }
}

root [mainAction] {
    sequence {
        action [rangeAttack, $targetId,"physical","physical",1,$伤害计算公式,1,$伤害标签,"none",3]
    }
}`;
const defaultSkillAgent = `class Agent {
    get 后摇毫秒() {
        const endMs = this.currentSkill.lifecycle.actionMs - this.currentSkill.lifecycle.startupMs
        return endMs
    }
}`;



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
