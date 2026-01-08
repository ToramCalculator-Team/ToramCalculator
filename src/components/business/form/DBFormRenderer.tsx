/**
 * @file DBForm.tsx
 * @description 特化的数据库表单组件，支持嵌套表单功能
 * @version 1.0.0
 */

import {
	getForeignKeyFields,
	getForeignKeyReference,
	getPrimaryKeys,
	isForeignKeyField,
	isPrimaryKeyField,
} from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";
import { type AnyFieldApi, createForm, type DeepKeys, type DeepValue } from "@tanstack/solid-form";
import { type Accessor, createMemo, For, Index, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodEnum, ZodObject, ZodType } from "zod/v4";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Toggle } from "~/components/controls/toggle";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { getDictionary } from "~/locales/i18n";
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { setStore, store } from "~/store";

export interface DBFormProps<TTableName extends keyof DB> {
	tableName: TTableName;
	initialValue: DB[TTableName];
	dataSchema: ZodObject<{ [K in keyof DB[TTableName]]: ZodType }>;
	hiddenFields?: Array<keyof DB[TTableName]>;
	fieldGroupMap?: Record<string, Array<keyof DB[TTableName]>>;
	fieldGenerator?: Partial<{
		[K in keyof DB[TTableName]]: (
			field: Accessor<AnyFieldApi>,
			dictionary: Dic<DB[TTableName]>,
			dataSchema: ZodObject<Record<keyof DB[TTableName], ZodType>>,
		) => JSX.Element;
	}>;
	onSubmit?: (values: DB[TTableName]) => void;
}

export const DBForm = <TTableName extends keyof DB>(props: DBFormProps<TTableName>) => {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	const form = createForm(() => ({
		defaultValues: props.initialValue,
		onSubmit: async ({ value: newValues }) => {
			props.onSubmit?.(newValues);
		},
	}));

	// 获取外键字段
	const foreignKeyFields = createMemo(() => {
		return getForeignKeyFields(props.tableName);
	});

	// 获取主键字段
	const primaryKeyFields = createMemo(() => {
		return getPrimaryKeys(props.tableName);
	});

	// 字段组生成器
	const fieldGroupGenerator = (fieldGroup: Array<keyof DB[TTableName]>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;

				// 检查是否为外键字段
				const isForeignKey = isForeignKeyField(props.tableName, key);
				const isPrimaryKey = isPrimaryKeyField(props.tableName, key);

				const fieldName = String(key);
				const schemaFieldValue = props.dataSchema?.shape[key];
				const fieldGenerator = props.fieldGenerator?.[key];
				const hasGenerator = !!fieldGenerator;

				// 处理嵌套结构
				switch (schemaFieldValue.type) {
					case "array": {
						return (
							<form.Field
								name={key as DeepKeys<DB[TTableName]>}
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
													onClick={(e) => {
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
						const safeKey = key as DeepKeys<DB[TTableName]>;
						return (
							<form.Field
								name={safeKey}
								validators={{
									onChangeAsyncDebounceMs: 500,
									onChangeAsync: props.dataSchema.shape[key] as any,
								}}
							>
								{(field) => {
									if (hasGenerator) {
										return fieldGenerator(field, dictionary().db[props.tableName], props.dataSchema);
									} else if (isForeignKey) {
										// 外键字段使用 AutoComplete
										const referencedTable = getForeignKeyReference(props.tableName, key);
										console.log("referencedTable", referencedTable);

										if (referencedTable) {
											return (
												<Input
													title={referencedTable.table}
													description={`选择 ${referencedTable.table} 记录`}
													validationMessage={fieldInfo(field())}
													class="border-dividing-color bg-primary-color w-full rounded-md border"
												>
													<Autocomplete
														id={fieldName}
														initialValue={{ id: field().state.value }}
														setValue={(value: any) => field().setValue(value.id)}
														table={referencedTable.table}
														valueMap={(value: any) => ({ id: value.id })}
													/>
												</Input>
											);
										}
									} else {
										return (
											<DBFieldRenderer
												field={field}
												dictionary={dictionary().db[props.tableName]}
												dataSchema={props.dataSchema}
											/>
										);
									}
								}}
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
				<h1 class="FormTitle text-2xl font-black">
					{dictionary().db[props.tableName].selfName ?? `编辑 ${props.tableName}`}
				</h1>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				class="Form bg-area-color flex flex-col gap-3 p-3 portrait:rounded-t"
			>
				<Show
					when={props.fieldGroupMap}
					fallback={fieldGroupGenerator(Object.keys(props.initialValue) as Array<keyof DB[TTableName]>)}
				>
					<For
						each={Object.entries(props.fieldGroupMap!).filter(([_, keys]) =>
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
				</Show>

				{/* 外键字段渲染器 */}
				<For each={foreignKeyFields()}>
					{(field) => (
						<div class="Field flex flex-col gap-2">
							<Button
								level="secondary"
								onClick={() => {
                  console.log(getForeignKeyReference(props.tableName, field));
									//   setStore("pages", "formGroup", store.pages.formGroup.length, {
									// 	type: getForeignKeyReference(props.tableName, field)?.table,
									// 	data: {},
									// })
								}}
							>
								{props.tableName}
							</Button>
						</div>
					)}
				</For>

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
										: props.initialValue
											? dictionary().ui.actions.update
											: dictionary().ui.actions.add}
								</Button>
							</div>
						);
					}}
				/>
			</form>
		</div>
	);
};

// 数据库字段渲染器
export function DBFieldRenderer<T extends keyof DB>(props: {
	field: Accessor<AnyFieldApi>;
	dictionary: Dic<DB[T]>;
	dataSchema: ZodObject<Record<keyof DB[T], ZodType>>;
}) {
	// 获取字段名
	const fieldName = props.field().name;
	let inputTitle = props.dictionary.selfName;
	let inputDescription = "";

	try {
		inputTitle = (props.dictionary.fields as any)[fieldName].key;
		inputDescription = (props.dictionary.fields as any)[fieldName].formFieldDescription;
	} catch (error) {}

	const fieldClass = "border-dividing-color bg-primary-color rounded-md border w-full";

	switch ((props.dataSchema.shape as any)[fieldName].type) {
		case "enum": {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				>
					<EnumSelect
						value={props.field().state.value as string}
						setValue={(value) => props.field().setValue(value as DeepValue<DB[T], DeepKeys<DB[T]>>)}
						options={((props.dataSchema.shape as any)[fieldName] as ZodEnum<any>).options.map((i) => i.toString())}
						dic={((props.dictionary.fields as any)[fieldName] as EnumFieldDetail<string>).enumMap}
						field={{
							id: props.field().name,
							name: props.field().name,
						}}
					/>
				</Input>
			);
		}

		case "number": {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					autocomplete="off"
					type="number"
					id={props.field().name}
					name={props.field().name}
					value={props.field().state.value}
					onBlur={props.field().handleBlur}
					onChange={(e) => props.field().handleChange(parseFloat(e.target.value))}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				/>
			);
		}

		case "array": {
			throw new Error("array type is not supported in DBFieldRenderer");
		}

		case "object": {
			throw new Error("object type is not supported in DBFieldRenderer");
		}

		case "lazy": {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					autocomplete="off"
					type="text"
					id={props.field().name}
					name={props.field().name}
					value={props.field().state.value as string}
					onBlur={props.field().handleBlur}
					onChange={(e) => {
						const target = e.target;
						props.field().handleChange(target.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
					}}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				>
					"逻辑编辑器，暂未处理"
				</Input>
			);
		}

		case "boolean": {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				>
					<Toggle
						id={props.field().name}
						onClick={() => {
							props.field().setValue(!props.field().state.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
						}}
						onBlur={props.field().handleBlur}
						name={props.field().name}
						checked={props.field().state.value as boolean}
					/>
				</Input>
			);
		}

		// 字符串输入
		default: {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					autocomplete="off"
					type="text"
					id={props.field().name}
					name={props.field().name}
					value={props.field().state.value as string}
					onBlur={props.field().handleBlur}
					onChange={(e) => {
						const target = e.target;
						props.field().handleChange(target.value as DeepValue<DB[T], DeepKeys<DB[T]>>);
					}}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				/>
			);
		}
	}
}
