import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { BehaviorTreeSchema, type behavior_tree } from "@db/generated/zod";
import { createSignal } from "solid-js";
import { Input } from "~/components/controls/input";
import type { TableDataConfig } from "../data-config";

const formatJson = (value: unknown): string => JSON.stringify(value ?? [], null, 2);

const createAttributeSlotsField = (
	value: () => behavior_tree["attributeSlots"],
	setValue: (value: behavior_tree["attributeSlots"]) => void,
	validationMessage: string | undefined,
	dictionary: { fields: Record<string, { key: string; formFieldDescription: string }> },
) => {
	const [text, setText] = createSignal(formatJson(value()));
	const [localError, setLocalError] = createSignal<string | undefined>();

	return (
		<Input
			title={dictionary.fields.attributeSlots.key}
			description={dictionary.fields.attributeSlots.formFieldDescription}
			validationMessage={localError() ?? validationMessage}
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
						setValue(JSON.parse(nextText) as behavior_tree["attributeSlots"]);
						setLocalError(undefined);
					} catch (error) {
						setLocalError(error instanceof Error ? error.message : String(error));
					}
				}}
			/>
		</Input>
	);
};

export const BEHAVIOR_TREE_DATA_CONFIG: TableDataConfig<behavior_tree> = (dictionary) => ({
	dictionary: dictionary().db.behavior_tree,
	dataSchema: BehaviorTreeSchema,
	primaryKey: "id",
	defaultData: defaultData.behavior_tree,
	dataFetcher: {
		get: repositoryMethods.behavior_tree.select,
		getAll: repositoryMethods.behavior_tree.selectAll,
		liveQuery: (db) => db.selectFrom("behavior_tree").selectAll("behavior_tree"),
		insert: repositoryMethods.behavior_tree.insert,
		update: repositoryMethods.behavior_tree.update,
		delete: repositoryMethods.behavior_tree.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础信息: ["name", "definition", "agent", "attributeSlots"],
		归属: ["activeOwnerId", "passiveOwnerId", "registeredOwnerId"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "name",
				cell: (info) => info.getValue(),
				size: 220,
			},
			{
				accessorKey: "activeOwnerId",
				cell: (info) => info.getValue(),
				size: 220,
			},
			{
				accessorKey: "passiveOwnerId",
				cell: (info) => info.getValue(),
				size: 220,
			},
			{
				accessorKey: "registeredOwnerId",
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
		fieldGenerator: {
			attributeSlots: createAttributeSlotsField,
		},
		onInsert: repositoryMethods.behavior_tree.insert,
		onUpdate: repositoryMethods.behavior_tree.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {
			attributeSlots: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
		},
		deleteCallback: repositoryMethods.behavior_tree.delete,
		editAbleCallback: (data) => repositoryMethods.behavior_tree.canEdit(data.id),
	},
});
