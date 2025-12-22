import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";

export default function BtEditorPage() {
  const [initValues, setInitValues] = createSignal<{ definition: string; agent: string }>({
    definition: `root {
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
}

root [魔法炮充能Buff] {
    sequence {
        condition [CanDance]
        action [Dance]
    }
}`,
    agent: `class Agent {
}`,
  });

  const onSave = (definition: string, agent: string) => {
    console.log(definition, agent);
  };

  return <BtEditor initValues={initValues()} onSave={onSave} />;
}
