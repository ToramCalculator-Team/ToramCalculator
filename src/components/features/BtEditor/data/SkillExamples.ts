import type { MemberBTTree } from "@db/schema/jsons";
import type { SkillExample } from "../types";

const defaultSkillDefinition = `
root {
    sequence{
            action [动画,"施法前摇",$施法前摇时长]
            wait [$施法前摇时长]
            action [动画,"蓄力动画",$蓄力时长]
            wait [$蓄力时长]
            action [动画, "咏唱动画",$咏唱时长]
            wait [$咏唱时长]
            branch [mainAction]
            action [动画, "施法后摇",$施法后摇时长]
            wait [$施法后摇时长]
        }
}

root [mainAction] {
    selector {
        sequence {
            condition [是连续使用吗]
            action [rangeAttack, $targetId,"normal","physical",1,$伤害计算公式,1,3]
        }
        sequence {
            action [rangeAttack, $targetId,"physical","physical",1,$伤害计算公式,1,3]
        }
    }
}`;
const defaultSkillAgent = `
class Agent {
    get 施法前摇时长() {
        return 200;
    }
    get 蓄力时长() {
        return 200;
    }
    get 咏唱时长() {
        return 200;
    }
    get 施法后摇时长() {
        return 100;
    }
    get 伤害类型() {
        return "魔法伤害"
    }
    get 伤害计算公式() {
        // 伤害公式本身是“字符串表达式”，这里把通用片段 vAtkP 直接嵌入，避免在 MDSL 参数里写字符串拼接
        return \`(\${this.vAtkP} + 100) * (100 + skill.lv * 5 + self.vit + self.str) / 100\`
    }
    get 伤害范围类型() {
        return "直线伤害"
    }
    get 伤害区域公式() {
        return {
            x: "x",
            y: "2"
        }
    }
    动画(name, durtion){
        console.log(name, durtion)
        return State.SUCCEEDED
    }
    是连续使用吗(){
        if (!this.previousSkill) {
            console.log("没有上一个技能");
            return false
        }
        const res = this.previousSkill.id === this.currentSkill.id
        console.log(res ? "连续使用" : "没有连续使用");
        return res
    }
}`;

const magic_cannon_definition = `
root {
    selector {
        sequence{
            condition [是否有buff,"魔法炮充能"]
            action [启动动画,"魔法炮发射动画前摇"]
            wait [$魔法炮发射前摇]
            action [造成伤害,"直线伤害",3,"(有效MATK+700+10*层数)*(300*层数 + 基础智力*(min(层数,5)))"]
            action [启动动画, "魔法炮发射动画后摇"]
            wait [$魔法炮发射后摇]
        }
        sequence{
            action [启动动画,"魔法炮充填动画前摇"]
            wait [$魔法炮充填前摇]
            action [添加buff, "魔法炮充能", "魔法炮充能Buff"]
            wait [$魔法炮充填后摇]
        }
    }
}`;
const magic_cannon_agent = `
class Agent {
}`;

const magic_cannon_buff1_definition = `
root {
    sequence {
        action [添加计数器, "魔法炮充能"]
        action [向其他技能插入逻辑, $一类技能列表,"咏唱结束",$一类充能增加]
        action [向其他技能插入逻辑, $二类技能列表,"造成伤害后",$一类充能增加]
        action [向其他技能插入逻辑, $三类技能列表,"咏唱结束",$二类充能增加]
        repeat {
            sequence {
                wait [1000]
                sequence {
                    condition [判断充能是否大于一百]
                    wait [2000]
                }
                action [充能数加一]
            }
        }
    }
}`;
const magic_cannon_buff1_agent = `
class Agent {
  get 一类技能列表 () {
    return ["法术/飞箭","法术/长枪","法术/魔法枪","法术/引爆","法术/障壁","法术/暴风","法术/毁灭","法术/终结","法术/爆能","祈祷","神圣光辉","空灵障壁","法术结界","空灵闪焰","复苏","反击势力","天外长枪"]
  }

  get 一类充能增加() {
    return \`一类充能增加() {
      this.魔法炮充能 += \${this.lv} * chantingDurtion + 80 * (self.cm)
    }\`
  }

  get 二类技能列表() {
    return ["法术/冲击波","附魔剑击"]
  }
}`;

export const skillLogicExample: Record<string, MemberBTTree> = {
	default: {
		memberType: "Player",
		name: "default",
		definition: defaultSkillDefinition,
		agent: defaultSkillAgent,
	},
	魔法炮: {
		memberType: "Player",
		name: "魔法炮",
		definition: magic_cannon_definition,
		agent: magic_cannon_agent,
	},
	魔法炮充能: {
		memberType: "Player",
		name: "魔法炮充能",
		definition: magic_cannon_buff1_definition,
		agent: magic_cannon_buff1_agent,
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
