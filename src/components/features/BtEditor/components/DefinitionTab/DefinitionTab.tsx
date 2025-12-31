import { type Component, Show } from "solid-js";
import type { MdslIntellisenseRegistry } from "../../modes/mdslIntellisense";
import { DefinitionType } from "../../types/app";
import { Alert, CodeEditor, Divider } from "../";

export type DefinitionTabProps = {
	definition: string;
	definitionType: DefinitionType;
	onChange(value: string): void;
	errorMessage?: string;
	readOnly: boolean;
	mdslIntellisense?: MdslIntellisenseRegistry;
};

export const DefinitionTab: Component<DefinitionTabProps> = (props) => {
	const mode = () =>
		props.definitionType === DefinitionType.JSON ? "json" : "mdsl";

	return (
		<div class="flex flex-col w-full h-full basis-3/5 overflow-hidden bg-area-color">
			<div class="flex flex-row items-center px-3 py-2">
				<span class="tracking-wider text-accent-color font-bold">
					Definition
				</span>
				<div class="flex items-center h-[18px] ml-auto mr-1.5">
					<Show when={props.definitionType === DefinitionType.MDSL}>
						MDSL
					</Show>
					<Show when={props.definitionType === DefinitionType.JSON}>
						JSON
					</Show>
				</div>
			</div>
			<Divider />
			<div class="flex-1 min-h-0">
				<CodeEditor
					value={props.definition}
					onChange={props.onChange}
					readOnly={props.readOnly}
					mode={mode()}
					theme="sqlserver"
					mdslIntellisense={props.mdslIntellisense}
				/>
			</div>
			<Show when={props.errorMessage}>
				<Alert severity="error" class="rounded-none">
					{props.errorMessage}
				</Alert>
			</Show>
		</div>
	);
};
