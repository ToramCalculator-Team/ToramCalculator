/**
 * @file DBForm.tsx
 * @description 特化的数据库表单组件，支持嵌套表单功能。
 * @version 1.0.0
 *
 * 表单只能编辑自身和自身的下级，上级只能选择，不提供编辑入口。
 */

import { defaultData } from "@db/defaultData";
import {
	getChildRelations,
	getForeignKeyReference,
	getModelFields,
	getPrimaryKeys,
	isForeignKeyField,
} from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { type AnyFieldApi, createForm, type DeepKeys, type DeepValue } from "@tanstack/solid-form";
import { type Accessor, createMemo, createResource, createSignal, For, Index, onMount, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodEnum, ZodObject, ZodType } from "zod/v4";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Toggle } from "~/components/controls/toggle";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { getDictionary } from "~/locales/i18n";
import type { Dic, EnumFieldDetail, FieldDict } from "~/locales/type";
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

type ForeignKeyRenderInfo = {
	referencedTable: keyof DB;
	referencedField: string;
};

export const DBForm = <TTableName extends keyof DB>(props: DBFormProps<TTableName>) => {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	/**
	 * 外键标量字段 -> 引用信息
	 *
	 * Prisma/DMMF 中外键信息挂在 relation field（kind: "object"）上，
	 * 但表单默认渲染的是标量字段（如 worldId）。因此这里做一次映射，
	 * 用于把 worldId 这类字段渲染成“选择 world 的 Autocomplete”。
	 */
	const foreignKeyFieldMap = createMemo(() => {
		type ModelFieldMeta = {
			name: string;
			kind: "scalar" | "object" | "enum";
			type: string;
			isList: boolean;
			relationFromFields?: string[];
		};

		const map = new Map<string, ForeignKeyRenderInfo>();
		const modelFields = getModelFields(props.tableName as string) as ModelFieldMeta[];

		for (const field of modelFields) {
			if (field.kind !== "object" || field.isList) continue;
			if (!field.relationFromFields || field.relationFromFields.length === 0) continue;

			const fkFieldName = field.relationFromFields[0];
			const referenced = getForeignKeyReference(props.tableName, field.name as keyof DB[TTableName]);
			if (!referenced) continue;

			map.set(fkFieldName, {
				referencedTable: referenced.table,
				referencedField: referenced.field,
			});
		}

		return map;
	});

	// 获取子表关系
	const [childRelations] = createResource(async () => {
		const db = await getDB();
		const primaryKey = getPrimaryKeys(props.tableName)[0];
		return await getChildRelations(db, props.tableName, primaryKey as string);
	});

	// 判断传入值主键是否和缺省值主键相同，是的则说明是新建，否则是编辑
	const [isNew, setIsNew] = createSignal(false);
	const initialValue = () => {
		const primaryKey = getPrimaryKeys(props.tableName)[0];
		const currentPrimaryKeyValue = props.initialValue[primaryKey];
		const defaultPrimaryKeyValue = defaultData[props.tableName][primaryKey];
		if (currentPrimaryKeyValue === defaultPrimaryKeyValue) {
			// 是新建的话，需要创建新的主键
			console.log("当前值主键和缺省值主键相同", currentPrimaryKeyValue, defaultPrimaryKeyValue);
			const newPrimaryKeyValue = createId();
			setIsNew(true);
			return {
				...props.initialValue,
				[primaryKey]: newPrimaryKeyValue,
			};
		} else {
			// 是编辑的话，直接返回传入值
			setIsNew(false);
			return props.initialValue;
		}
	};

	// 创建表单
	const form = createForm(() => ({
		defaultValues: initialValue(),
		onSubmit: async ({ value: newValues }) => {
			props.onSubmit?.(newValues);
		},
	}));

	// 字段组生成器
	const fieldGroupGenerator = (fieldGroup: Array<keyof DB[TTableName]>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;

				const fieldName = String(key);
				const fkInfo = foreignKeyFieldMap().get(fieldName);
				// 兼容：如果 fieldGroupMap 里传入的是 relation field 名（object 字段），仍可走旧逻辑
				const isForeignKeyRelationField = isForeignKeyField(props.tableName, key);
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
									console.log("字段：", key, "值：", field().state.value);
									// 如果有字段生成器，则使用字段生成器
									if (hasGenerator) {
										return fieldGenerator(field, dictionary().db[props.tableName], props.dataSchema);
									}

									// 外键标量字段（如 worldId）优先：用 DMMF 的 relationFromFields 映射渲染
									if (fkInfo) {
										const initialValue = { [fkInfo.referencedField]: field().state.value } as Record<string, unknown>;
										return (
											<Input
												title={fkInfo.referencedTable}
												description={`选择 ${fkInfo.referencedTable} 记录`}
												validationMessage={fieldInfo(field())}
												class="border-dividing-color bg-primary-color w-full rounded-md border"
											>
												<Autocomplete
													id={fieldName}
													initialValue={initialValue as any}
													setValue={(value) => field().setValue(value[fkInfo.referencedField] as any)}
													tableName={fkInfo.referencedTable}
												/>
											</Input>
										);
									}

									// 兼容：relation field（object 字段）被直接渲染的情况
									if (isForeignKeyRelationField) {
										const referencedTable = getForeignKeyReference(props.tableName, key);
										console.log("此字段为外键关系字段,关联表：", referencedTable);

										if (referencedTable) {
											const initialValue = { [referencedTable.field]: field().state.value } as Record<string, unknown>;
											return (
												<Input
													title={referencedTable.table}
													description={`选择 ${referencedTable.table} 记录`}
													validationMessage={fieldInfo(field())}
													class="border-dividing-color bg-primary-color w-full rounded-md border"
												>
													<Autocomplete
														id={fieldName}
														initialValue={initialValue as any}
														setValue={(value) => field().setValue(value[referencedTable.field] as any)}
														tableName={referencedTable.table}
													/>
												</Input>
											);
										}
									}
									// 否则使用默认字段渲染器
									return (
										<DBFieldRenderer
											field={field}
											dictionary={dictionary().db[props.tableName]}
											dataSchema={props.dataSchema}
										/>
									);
								}}
							</form.Field>
						);
					}
				}
			}}
		</For>
	);

	onMount(() => {
		console.log("DBFormRenderer mounted", JSON.stringify(initialValue(), null, 2));
	});

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

				{/* 子表关系按钮渲染器 */}
				<Show when={childRelations()}>
					{(relations) => (
						<For each={Object.entries(relations())}>
							{([tableName, data]) => {
								return (
									<div class="Field flex flex-col gap-2">
										<Button
											level="secondary"
											onClick={() => {
												// 这里需要根据data数量打开复数个表单，如果data为空，则用默认值渲染表单
												if (data.length === 0) {
													setStore("pages", "formGroup", store.pages.formGroup.length, {
														type: tableName as keyof DB,
														data: defaultData[tableName as keyof DB],
													});
												} else {
													for (const item of data) {
														setStore("pages", "formGroup", store.pages.formGroup.length, {
															type: tableName as keyof DB,
															// store里的类型更宽泛，但要求是Record<string, unknown>
															data: (item as unknown as Record<string, unknown>) ?? defaultData[tableName as keyof DB],
														});
													}
												}
											}}
										>
											{dictionary().db[tableName as keyof DB].selfName}
										</Button>
									</div>
								);
							}}
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

// 数据库字段渲染器
export function DBFieldRenderer<TTableName extends keyof DB>(props: {
	field: Accessor<AnyFieldApi>;
	dictionary: Dic<DB[TTableName]>;
	dataSchema: ZodObject<Record<keyof DB[TTableName], ZodType>>;
}) {
	// 获取字段名
	const fieldName = props.field().name as keyof DB[TTableName];
	let inputTitle = props.dictionary.selfName;
	let inputDescription = "";

	try {
		inputTitle = (props.dictionary.fields as FieldDict<DB[TTableName]>)[fieldName].key;
		inputDescription = (props.dictionary.fields as FieldDict<DB[TTableName]>)[fieldName].formFieldDescription;
	} catch (error) {
		console.log("字典中不存在字段：", fieldName, error);
	}

	const fieldClass = "border-dividing-color bg-primary-color rounded-md border w-full";

	switch (props.dataSchema.shape[fieldName].type) {
		case "enum": {
			return (
				<Input
					title={inputTitle}
					description={inputDescription}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				>
					<Show
						when={(props.dataSchema.shape[fieldName] as ZodEnum<any>).options.length > 6}
						fallback={
							<EnumSelect
								value={props.field().state.value as string}
								setValue={(value) =>
									props.field().setValue(value as DeepValue<DB[TTableName], DeepKeys<DB[TTableName]>>)
								}
								options={(props.dataSchema.shape[fieldName] as ZodEnum<any>).options.map((i) => i.toString())}
								dic={(props.dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap}
								field={{
									id: props.field().name,
									name: props.field().name,
								}}
							/>
						}
					>
						<Select
							value={props.field().state.value as string}
							setValue={(v) => {
								props.field().setValue(v);
							}}
							options={(props.dataSchema.shape[fieldName] as ZodEnum<any>).options.map((type) => {
								console.log(
									"type",
									type,
									(props.dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap[type],
								);
								return {
									label: (props.dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap[type],
									value: type,
								};
							})}
							placeholder={props.field().state.value as string}
							// optionPosition="top"
						/>
					</Show>
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
						props.field().handleChange(target.value as DeepValue<DB[TTableName], DeepKeys<DB[TTableName]>>);
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
							props.field().setValue(!props.field().state.value as DeepValue<DB[TTableName], DeepKeys<DB[TTableName]>>);
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
						props.field().handleChange(target.value as DeepValue<DB[TTableName], DeepKeys<DB[TTableName]>>);
					}}
					validationMessage={fieldInfo(props.field())}
					class={fieldClass}
				/>
			);
		}
	}
}
