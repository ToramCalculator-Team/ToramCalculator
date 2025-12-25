import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import { skillLogicExample } from "~/components/features/BtEditor/data/SkillExamples";

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
		const definition = skillLogicExample.default.definition.trim();
		const agent = skillLogicExample.default.agent.trim();
		setInitValues({ definition, agent });
	});

	return <BtEditor initValues={initValues()} onSave={onSave} />;
}
