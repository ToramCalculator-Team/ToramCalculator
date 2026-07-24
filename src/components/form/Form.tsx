import { createForm } from "@tanstack/solid-form";
import { For, type JSX, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { useDictionary } from "~/contexts/Dictionary";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic } from "~/locales/type";
import { type FormRendererPath, type FormRenderers, SchemaFieldNode } from "./fields";

export interface FormProps<T extends object> {
	value: T;
	defaultValue: T;
	dataSchema: ZodSchemaFor<T>;
	dictionary: Dic<T>;
	hiddenFields?: Array<keyof T>;
	fieldGroupMap?: Record<string, Array<keyof T>>;
	renderers?: FormRenderers<T>;
	extraSections?: JSX.Element;
	/** 表单模式：create = 新增，update = 编辑。默认 update。影响提交按钮默认文本。 */
	mode?: "create" | "update";
	submitLabel?: (state: { isSubmitting: boolean }) => string;
	onSubmit: (values: T) => void | Promise<void>;
}

export function Form<T extends object>(props: FormProps<T>) {
	const dictionary = useDictionary();
	const form = createForm(() => ({
		defaultValues: props.value,
		onSubmit: async ({ value }) => {
			await props.onSubmit(value);
		},
	}));

	const fieldGroupGenerator = (fieldGroup: Array<keyof T>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;
				const schemaField = props.dataSchema.shape[key];
				if (!schemaField) return null;

				return (
					<SchemaFieldNode<T, T>
						form={form}
						name={String(key)}
						path={String(key) as FormRendererPath<T>}
						schema={schemaField}
						dictionary={props.dictionary.fields[key]}
						renderers={props.renderers}
					/>
				);
			}}
		</For>
	);

	return (
		<div class="FormBox flex w-full flex-col">
			<div class="Title flex items-center p-2 portrait:p-6">
				<h1 class="FormTitle text-2xl font-black">{props.dictionary.selfName}</h1>
			</div>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				class="Form bg-area-color flex flex-col gap-3 p-3 portrait:rounded-t"
			>
				<Show when={props.fieldGroupMap} fallback={fieldGroupGenerator(Object.keys(props.value) as Array<keyof T>)}>
					{(fieldGroupMap) => (
						<For
							each={Object.entries(fieldGroupMap()).filter(([_, keys]) =>
								keys.some((key) => !props.hiddenFields?.includes(key)),
							)}
						>
							{([groupName, keys]) => (
								<section class="FieldGroup flex w-full flex-col gap-2 rounded bg-primary-color p-2">
									<h3 class="text-accent-color flex items-center gap-2 py-2 font-bold">{groupName}</h3>
									<div class="Content flex flex-col gap-3">{fieldGroupGenerator(keys)}</div>
								</section>
							)}
						</For>
					)}
				</Show>

				{props.extraSections}

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
					children={(state) => (
						<div class="flex items-center gap-1">
							<Button level="primary" class="SubmitBtn flex-1" type="submit" disabled={!state().canSubmit}>
								{props.submitLabel?.({ isSubmitting: state().isSubmitting }) ??
									(state().isSubmitting
										? "..."
										: props.mode === "create"
											? dictionary().ui.actions.create
											: dictionary().ui.actions.update)}
							</Button>
						</div>
					)}
				/>
			</form>
		</div>
	);
}
