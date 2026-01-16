/**
 * @file DBForm.tsx
 * @description 特化的数据库表单组件，支持嵌套表单功能。
 * @version 1.0.0
 *
 * 表单只能编辑自身和自身的下级，上级只能选择，不提供编辑入口。
 */

import { defaultData } from "@db/defaultData";
import {
	type ChildTableOf,
	DB_RELATION,
	getChildrenDatas,
	getFkRefByColumn,
	getFkRefByRelationField,
	getPrimaryKeys,
	listFkColumns,
} from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { type AnyFieldApi, createForm, type DeepKeys, type DeepValue } from "@tanstack/solid-form";
import type { Transaction } from "kysely";
import { type Accessor, createMemo, createResource, For, Index, Show } from "solid-js";
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
	/**
	 * 配置需要展示的子关系表名（类型安全）
	 * 如果未指定，则展示所有子关系
	 */
	childrenRelations?: Array<ChildTableOf<TTableName>>;
	fieldGenerator?: Partial<{
		[K in keyof DB[TTableName]]: (
			field: Accessor<AnyFieldApi>,
			dictionary: Dic<DB[TTableName]>,
			dataSchema: ZodObject<Record<keyof DB[TTableName], ZodType>>,
		) => JSX.Element;
	}>;
	onInsert: (values: DB[TTableName], trx?: Transaction<DB>) => Promise<void>;
	onUpdate: (primaryKeyValue: string, values: DB[TTableName], trx?: Transaction<DB>) => Promise<void>;
}

type ForeignKeyRenderInfo = {
	referencedTable: keyof DB;
	referencedField: string;
};

export const DBForm = <TTableName extends keyof DB>(props: DBFormProps<TTableName>) => {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	// 主键字段名
	const primaryKey = getPrimaryKeys(props.tableName)[0];

	// 判断传入值主键是否和缺省值主键相同
	const isNew = createMemo(() => {
		const currentPrimaryKeyValue = props.initialValue[primaryKey];
		const defaultPrimaryKeyValue = defaultData[props.tableName][primaryKey];
		if (currentPrimaryKeyValue === defaultPrimaryKeyValue) {
			return true;
		} else {
			return false;
		}
	});

	// 根据主键是否为缺省值(是的则说明是新建，否则是编辑)和是否被隐藏，决定是否自动生成主键
	const initialValue = createMemo(() => {
		// 如果是新建，且主键在表单内被隐藏，则自动生成主键
		if (isNew() && props.hiddenFields?.includes(primaryKey)) {
			return {
				...props.initialValue,
				[primaryKey]: createId(),
			};
		}
		return props.initialValue;
	});

	// 子关系查询使用 initialValue() 的主键（确保新建时已自动生成的 id 也能被使用）
	const primaryKeyValue = createMemo(() => String(initialValue()[primaryKey] ?? ""));

	// 需要展示的子关系表名：来自 DB_RELATION（结构），再叠加 childrenRelations 白名单过滤
	const childRelationTableNames = createMemo(() => {
		const all = Object.keys(DB_RELATION[props.tableName]?.children ?? {}) as Array<keyof DB>;
		const allow = props.childrenRelations;
		if (!allow || allow.length === 0) return all;
		const allowSet = new Set<string>(allow as unknown as string[]);
		return all.filter((t) => allowSet.has(String(t)));
	});

	// 获取子表关系数据（基于 DB_RELATION 的 children，内部已处理多边/去重）
	const [childRelations] = createResource(primaryKeyValue, async (pk) => {
		if (!pk) return {};
		const db = await getDB();
		return await getChildrenDatas(db, props.tableName, pk);
	});

	/**
	 * 外键标量字段 -> 引用信息
	 *
	 * Prisma/DMMF 中外键信息挂在 relation field（kind: "object"）上，
	 * 但表单默认渲染的是标量字段（如 worldId）。因此这里做一次映射，
	 * 用于把 worldId 这类字段渲染成“选择 world 的 Autocomplete”。
	 */
	const foreignKeyFieldMap = createMemo(() => {
		const map = new Map<string, ForeignKeyRenderInfo>();
		for (const fkColumn of listFkColumns(props.tableName)) {
			const ref = getFkRefByColumn(props.tableName, fkColumn);
			if (!ref) continue;
			map.set(String(fkColumn), {
				referencedTable: ref.table,
				referencedField: ref.field,
			});
		}

		return map;
	});

	// 外键/关系字段可能引用到的表：预拉取 options，避免在渲染闭包里创建资源导致泄漏
	const referencedTables = createMemo(() => {
		const tables = new Set<keyof DB>();
		for (const info of foreignKeyFieldMap().values()) {
			tables.add(info.referencedTable);
		}
		// 兼容：直接渲染 relation field（object 字段）时，也要纳入引用表
		for (const key of Object.keys(initialValue()) as Array<keyof DB[TTableName]>) {
			const refByRelation = getFkRefByRelationField(props.tableName, key);
			if (refByRelation) tables.add(refByRelation.table);
		}
		return Array.from(tables);
	});

	// 获取外键选项列表
	const [fkOptionsByTable] = createResource(referencedTables, async (tables) => {
		const entries = await Promise.all(
			tables.map(async (table) => {
				const options = (await repositoryMethods[table].selectAll?.()) ?? [];
				return [table, options] as const;
			}),
		);
		return Object.fromEntries(entries) as Partial<Record<keyof DB, unknown[]>>;
	});

	// 创建表单
	const form = createForm(() => ({
		defaultValues: initialValue(),
		onSubmit: async ({ value: newValues }) => {
			// 当数据中存在账号关联信息时，绑定当前账号
			if ("updatedByAccountId" in newValues) {
				newValues.updatedByAccountId = store.session.account.id;
			}
			if (isNew()) {
				if ("createdByAccountId" in newValues) {
					newValues.createdByAccountId = store.session.account.id;
				}
				await props.onInsert?.(newValues);
			} else {
				await props.onUpdate?.(newValues[primaryKey] as string, newValues);
			}
		},
	}));

	// 字段组生成器
	const fieldGroupGenerator = (fieldGroup: Array<keyof DB[TTableName]>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;

				const fieldName = String(key);
				const fkInfo = foreignKeyFieldMap().get(fieldName);
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
									// 如果有字段生成器，则使用字段生成器
									if (hasGenerator) {
										return fieldGenerator(field, dictionary().db[props.tableName], props.dataSchema);
									}

									// 外键标量字段用 DMMF 的 relationFromFields 映射渲染
									if (fkInfo) {
										console.log("fkInfo", fkInfo, fkOptionsByTable.latest);
										return (
											<Input
												title={fkInfo.referencedTable}
												description={`选择 ${fkInfo.referencedTable} 记录`}
												validationMessage={fieldInfo(field())}
												class="border-dividing-color bg-primary-color w-full rounded-md border"
											>
												<Autocomplete
													id={fieldName}
													options={
														(fkOptionsByTable()?.[fkInfo.referencedTable] ?? []) as Array<Record<string, unknown>>
													}
													value={field().state.value}
													onChange={(value) =>
														field().setValue(value as DeepValue<DB[TTableName], DeepKeys<DB[TTableName]>>)
													}
													getOptionValue={(option: Record<string, unknown>) => option[fkInfo.referencedField]}
													getOptionLabel={(option: Record<string, unknown>) => {
														const name = option.name;
														if (typeof name === "string") return name;
														const byField = option[fkInfo.referencedField];
														if (byField !== null && byField !== undefined) return String(byField);
														const id = option.id;
														return id !== null && id !== undefined ? String(id) : "";
													}}
												/>
											</Input>
										);
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
				<Show when={childRelationTableNames().length > 0}>
					<For each={childRelationTableNames()}>
						{(tableName) => {
							const data = () => (childRelations()?.[tableName] ?? []) as unknown[];
							return (
								<div class="Field flex flex-col gap-2">
									<Button
										level="secondary"
										onClick={() => {
											// 这里需要根据data数量打开复数个表单，如果data为空，则用默认值渲染表单
											if (data().length === 0) {
												// 依据 DB_RELATION 回填子表外键（仅 fkOn=other 的一对多场景）
												const defaultValue = {
													...((defaultData[tableName as keyof DB] ?? {}) as Record<string, unknown>),
												};
												const relationEntries = DB_RELATION[props.tableName]?.children?.[tableName as keyof DB] ?? [];
												for (const entry of relationEntries) {
													if (entry.query.kind === "fk" && entry.query.fkOn === "other") {
														defaultValue[entry.query.fkField] = primaryKeyValue();
													}
												}
												setStore("pages", "formGroup", store.pages.formGroup.length, {
													type: tableName as keyof DB,
													data: defaultValue,
												});
											} else {
												for (const item of data()) {
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
								// console.log(
								// 	"type",
								// 	type,
								// 	(props.dictionary.fields[fieldName] as EnumFieldDetail<string>).enumMap[type],
								// );
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
