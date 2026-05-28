import type { MemberBTTree } from "@db/schema/jsons";
import type { SkillExample } from "../types";

const defaultSkillDefinition = `root {
	sequence{
		action [animation,"蓄力动画",$currentSkillChargingMs]
		wait [$currentSkillChargingMs]
		action [animation, "咏唱动画",$currentSkillChantingMs]
		wait [$currentSkillChantingMs]
		action [animation,"施法前摇",$currentSkillStartupMs]
		wait [$currentSkillStartupMs]
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
    get 有效攻击力() {
        return this.vAtkP;
    }
    get 技能常数() {
        return 500;
    }
    get 技能倍率() {
        return 100 + skill.lv * 5 + self.vit + self.str;
    }
    get 后摇毫秒() {
        const endMs = this.currentSkillActionMs - this.currentSkillStartupMs
        return endMs
    }
    get 伤害标签() {
        // 伤害归因标签。commonAttackSchema.damageTags；受击 Pipeline 的 overlay/proc 订阅依据之一。
        // 物理类 rangeAttack 默认给 ["physical"]；后续可加元素/特殊 tag。
        return ["physical"];
    }
}`;

// 顺发行为树
const InstantBtDefinition = `root {
	sequence{
		action [animation,"施法前摇",$currentSkillStartupMs]
		wait [$currentSkillStartupMs]
        branch [mainAction] // 施法内容
		action [animation, "施法后摇", $后摇毫秒]
		wait [$后摇毫秒]
    }
}

root [mainAction] {
    sequence {
        action [rangeAttack, $targetId,"physical","physical",1,$伤害计算公式,1,$伤害标签,"none",3]
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
