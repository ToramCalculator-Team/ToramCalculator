import type { MemberType } from "@db/schema/enums";
import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import { skillLogicExample } from "~/components/features/BtEditor/data/SkillExamples";

export default function BtEditorPage() {
	const [initValues, setInitValues] = createSignal<{
		definition: string;
		agent: string;
		memberType?: MemberType;
	}>({
		definition: "",
		agent: `class Agent {
}`,
		memberType: "Player",
	});

	const onSave = (definition: string, agent: string, memberType: MemberType) => {
		console.log(definition, agent, memberType);
	};

	onMount(() => {
		const definition = skillLogicExample.default.definition.trim();
		const agent = skillLogicExample.default.agent.trim();
		setInitValues({ definition, agent, memberType: "Player" });
	});

	return <BtEditor initValues={initValues()} onSave={onSave} />;
}
