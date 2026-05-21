import type { MemberBTTree } from "@db/schema/jsons";
import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import { skillLogicExample } from "~/components/features/BtEditor/data/SkillExamples";

export default function BtEditorPage() {
	const [initValue, setInitValue] = createSignal<MemberBTTree>({
		name: "default",
		definition: "",
		agent: `class Agent {
}`,
		memberType: "Player",
		attributeSlots: [],
	});

	const onChange = (nextTree: MemberBTTree) => {
		setInitValue(nextTree);
		console.log(nextTree);
	};

	onMount(() => {
		const definition = skillLogicExample.default.definition.trim();
		const agent = skillLogicExample.default.agent.trim();
		setInitValue({ ...skillLogicExample.default, definition, agent, memberType: "Player" });
	});

	return <BtEditor title="行为树编辑器" value={initValue()} onChange={onChange} />;
}
