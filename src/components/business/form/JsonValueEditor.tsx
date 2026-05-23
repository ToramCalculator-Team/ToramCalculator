import { createEffect, createSignal, untrack } from "solid-js";
import { Input } from "~/components/controls/input";

function formatJson(value: unknown): string {
	if (value === undefined) return "";
	return JSON.stringify(value, null, 2);
}

export function JsonValueEditor(props: {
	title: string;
	description: string;
	value: () => unknown;
	setValue: (value: unknown) => void;
	validationMessage: string;
	class: string;
}) {
	const [draft, setDraft] = createSignal(formatJson(props.value()));
	const [localError, setLocalError] = createSignal<string>();

	createEffect(() => {
		// 非法 JSON 期间保留用户草稿；一旦恢复合法输入，再跟随外部 form state 格式化同步。
		if (localError()) return;
		const nextDraft = formatJson(props.value());
		if (untrack(draft) !== nextDraft) setDraft(nextDraft);
	});

	return (
		<Input
			title={props.title}
			description={props.description}
			validationMessage={localError() ?? props.validationMessage}
			class={props.class}
		>
			<textarea
				value={draft()}
				spellcheck={false}
				class="text-accent-color bg-area-color min-h-32 w-full resize-y rounded p-3 font-mono text-sm"
				onInput={(event) => {
					const nextDraft = event.currentTarget.value;
					setDraft(nextDraft);
					try {
						props.setValue(JSON.parse(nextDraft));
						setLocalError(undefined);
					} catch (error) {
						setLocalError(error instanceof Error ? error.message : String(error));
					}
				}}
			/>
		</Input>
	);
}
