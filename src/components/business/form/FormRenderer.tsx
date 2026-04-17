import { createForm, type DeepKeys, type DeepValue } from "@tanstack/solid-form";
import { createMemo,  For, Index, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { FieldRenderer } from "~/components/dataDisplay/form";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { useDictionary } from "~/contexts/Dictionary";
import type { Dic } from "~/locales/type";

export interface FormProps<T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>> {
	// UI渲染表单名称时需要
	tableName: string;
	// 表单值
	value: T;
	// 表单主键
	primaryKey: keyof T;
	// 表单缺省值，用于判断表单是否为新建
	defaultValue: T;
	// 表单数据结构
	dataSchema: TSchema;
	// UI文本字典
	dictionary: Dic<T>;
	// 表单隐藏字段
	hiddenFields?: Array<keyof T>;
	// 表单字段分组
	fieldGroupMap?: Record<string, Array<keyof T>>;
	// 表单字段生成器
	fieldGenerator?: Partial<{
		[K in keyof T]: (
			value: () => T[K],
			setValue: (value: T[K]) => void,
			validationMessage: string,
			dictionary: Dic<T>,
			dataSchema: ZodObject<Record<keyof T, ZodType>>,
		) => JSX.Element;
	}>;
	// 表单新建回调
	onInsert: (values: T) => Promise<T>;
	// 表单更新回调
	onUpdate: (primaryKeyValue: string, values: T) => Promise<T>;
}

export const Form = <T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>>(
	props: FormProps<T, TSchema>,
) => {
	// UI文本字典
	const dictionary = useDictionary();

	// 判断传入值主键是否和缺省值主键相同
	const isNew = createMemo(() => {
		const currentPrimaryKeyValue = props.value[props.primaryKey];
		const defaultPrimaryKeyValue = props.defaultValue[props.primaryKey];
		if (currentPrimaryKeyValue === defaultPrimaryKeyValue) {
			return true;
		} else {
			return false;
		}
	});

	// 创建表单
	const form = createForm(() => ({
		defaultValues: props.value,
		onSubmit: async ({ value: newValues }) => {
			if (isNew()) {
				await props.onInsert?.(newValues);
			} else {
				await props.onUpdate?.(newValues[props.primaryKey] as string, newValues);
			}
		},
	}));

	// 字段组生成器
	const fieldGroupGenerator = (fieldGroup: Array<keyof T>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;

				const fieldName = String(key);
				const schemaFieldValue = props.dataSchema.shape[key];
				const fieldGenerator = props.fieldGenerator?.[key];
				const hasGenerator = !!fieldGenerator;

				// 如果有字段生成器，则使用字段生成器
				if (hasGenerator) {
					const safeKey = key as DeepKeys<T>;
					return (
						<form.Field
							name={safeKey}
							validators={{
								onChangeAsyncDebounceMs: 500,
								onChangeAsync: props.dataSchema.shape[key] as any,
							}}
						>
							{(field) => {
								return fieldGenerator(
									() => field().state.value as T[typeof key],
									(value) => {
										console.log("value", value);
										field().setValue(value as DeepValue<T, DeepKeys<T>>);
										console.log("field().state.value", field().state.value);
									},
									fieldInfo(field()),
									props.dictionary,
									props.dataSchema,
								);
							}}
						</form.Field>
					);
				}

				// 没有则走默认处理逻辑
				switch (schemaFieldValue.type) {
					case "array": {
						return (
							<form.Field
								name={key as DeepKeys<T>}
								validators={{
									onChangeAsyncDebounceMs: 500,
									onChangeAsync: props.dataSchema.shape[key] as any,
								}}
							>
								{(field) => {
									// 一般数组对象字段会单独处理，如果这里被调用，说明是简单的字符串数组
									const arrayValue = () => field().state.value as string[];
									return (
										<Input
											title={fieldName}
											description=""
											validationMessage={fieldInfo(field())}
											class="border-dividing-color bg-primary-color w-full rounded-md border"
										>
											<div class="ArrayBox flex w-full flex-col gap-2">
												<Index each={arrayValue()}>
													{(item, index) => (
														<div class="flex items-center gap-2">
															<div class="flex-1">
																<Input
																	type="text"
																	value={item()}
																	onChange={(e) => {
																		field().replaceValue(index, e.target.value as any);
																	}}
																	class="w-full p-0!"
																/>
															</div>
															<Button
																onClick={(e) => {
																	field().removeValue(index);
																	e.stopPropagation();
																}}
															>
																-
															</Button>
														</div>
													)}
												</Index>
												<Button
													onClick={() => {
														field().pushValue("" as any);
													}}
													class="w-full"
												>
													+
												</Button>
											</div>
										</Input>
									);
								}}
							</form.Field>
						);
					}
					default: {
						const safeKey = key as DeepKeys<T>;
						return (
							<form.Field
								name={safeKey}
								validators={{
									onChangeAsyncDebounceMs: 500,
									onChangeAsync: props.dataSchema.shape[key] as any,
								}}
							>
								{(field) => <FieldRenderer field={field} dictionary={props.dictionary} dataSchema={props.dataSchema} />}
							</form.Field>
						);
					}
				}
			}}
		</For>
	);

	return (
		<div class="FormBox flex w-full flex-col">
			<div class="Title flex items-center p-2 portrait:p-6">
				<h1 class="FormTitle text-2xl font-black">{props.tableName}</h1>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
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
								<section class="FieldGroup flex w-full flex-col gap-2">
									<h3 class="text-accent-color flex items-center gap-2 px-3 py-2">
										{groupName}
										<div class="Divider bg-dividing-color h-px w-full flex-1" />
									</h3>
									<div class="Content flex flex-col gap-3">{fieldGroupGenerator(keys)}</div>
								</section>
							)}
						</For>
					)}
				</Show>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
					children={(state) => {
						return (
							<div class="flex items-center gap-1">
								<Button level="primary" class="SubmitBtn flex-1" type="submit" disabled={!state().canSubmit}>
									{state().isSubmitting
										? "..."
										: isNew()
											? dictionary().ui.actions.add
											: dictionary().ui.actions.update}
								</Button>
							</div>
						);
					}}
				/>
			</form>
		</div>
	);
};
