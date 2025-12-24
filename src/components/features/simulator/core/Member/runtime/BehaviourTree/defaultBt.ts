import type { EffectTree } from "@db/schema/skillEffectLogicSchema";

export const defaultBt: EffectTree = {
	name: "缺省值行为树",
	definition: `
root {
  sequence {
      action [SomeAction]
      wait [2000]
      action [SomeAction]
      wait [2000]
      action [SomeAction]
      wait [2000]
  }
}
`,
	agent: `
class Agent {
  SomeAction() {
    console.log(this);
    return State.SUCCEEDED;
  }
}`,
};
