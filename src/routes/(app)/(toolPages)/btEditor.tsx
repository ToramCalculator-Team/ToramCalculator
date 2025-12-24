import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";

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

export default function BtEditorPage() {
	const [initValues, setInitValues] = createSignal<{
		definition: string;
		agent: string;
	}>({
		definition: "",
		agent: `class Agent {
}`,
	});

	const onSave = (definition: string, agent: string) => {
		console.log(definition, agent);
	};

	onMount(() => {
		const definition = magic_cannon_definition.trim();
		const agent = magic_cannon_agent.trim();
		setInitValues({ definition, agent });
	});

	return <BtEditor initValues={initValues()} onSave={onSave} />;
}
