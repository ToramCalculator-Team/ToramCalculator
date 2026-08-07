import type { behavior_tree } from "@db/generated/zod";
import { createSignal } from "solid-js";
import { Input } from "~/components/ui/controls/input";
import type { FormFieldRendererContext } from "~/components/ui/form/fields";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

const formatJson = (value: unknown): string => JSON.stringify(value ?? [], null, 2);

const createAttributeSlotsField = (context: FormFieldRendererContext<behavior_tree, "attributeSlots">) => {
	const value = () => context.value();
	const [text, setText] = createSignal(formatJson(value()));
	const [localError, setLocalError] = createSignal<string | undefined>();

	return (
		<Input
			title={context.dictionary?.key ?? "attributeSlots"}
			description={context.dictionary?.formFieldDescription ?? ""}
			validationMessage={localError() ?? context.validationMessage}
			class="border-dividing-color bg-primary-color w-full rounded-md border"
		>
			<textarea
				value={text()}
				spellcheck={false}
				class="text-accent-color bg-area-color min-h-48 w-full resize-y rounded p-3 font-mono text-sm"
				onInput={(event) => {
					const nextText = event.currentTarget.value;
					setText(nextText);
					try {
						context.setValue(JSON.parse(nextText));
						setLocalError(undefined);
					} catch (error) {
						setLocalError(error instanceof Error ? error.message : String(error));
					}
				}}
			/>
		</Input>
	);
};

export const BEHAVIOR_TREE_DATA_CONFIG: TableDataConfigurator<"behavior_tree", behavior_tree> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基础信息: ["name", "definition", "agent", "attributeSlots"],
			归属: ["activeOwnerId", "passiveOwnerId", "registeredOwnerId"],
		},
		table: {
			columnsDef: [
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "activeOwnerId",
					accessorFn: (row) => row.activeOwnerId,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "passiveOwnerId",
					accessorFn: (row) => row.passiveOwnerId,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "registeredOwnerId",
					accessorFn: (row) => row.registeredOwnerId,
					cell: (info) => info.getValue(),
					size: 220,
				},
			],
			hiddenColumnDef: ["id", "definition", "agent", "attributeSlots"],
			defaultSort: { field: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id"],
			renderers: {
				fields: {
					attributeSlots: createAttributeSlotsField,
				},
			},
			references: [
				{
					relation: "activeOwner",
					tableName: "skill_variant",
				},
				{
					relation: "passiveOwner",
					tableName: "skill_variant",
				},
				{
					relation: "registeredOwner",
					tableName: "skill_variant",
				},
			],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id"],
			references: [
				{
					relation: "activeOwner",
					tableName: "skill_variant",
				},
				{
					relation: "passiveOwner",
					tableName: "skill_variant",
				},
				{
					relation: "registeredOwner",
					tableName: "skill_variant",
				},
			],
			referencedBy: [],
			renderers: {
				fields: {
					attributeSlots: ({ value, dictionary }) => (
						<div class="Field flex flex-col gap-2">
							<span class="Title text-main-text-color text-nowrap">{dictionary?.key ?? "attributeSlots"}</span>
							<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">
								{formatJson(value())}
							</pre>
						</div>
					),
				},
			},
		},
	}) satisfies TableDataConfig<"behavior_tree", behavior_tree>;
