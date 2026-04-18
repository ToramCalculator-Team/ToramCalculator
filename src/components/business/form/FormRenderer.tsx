import type { DB } from "@db/generated/zod";
import { getFkRefByColumn, isFkColumn, listFkColumns } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import { type AnyFieldApi, createForm, type DeepKeys, type DeepValue } from "@tanstack/solid-form";
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
import { useDictionary } from "~/contexts/Dictionary";
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { DATA_CONFIG, type EmbedsDecl, type InheritsFromDecl } from "../data-config";

export interface FormProps<
	T extends Record<string, unknown>,
	TSchema extends ZodObject<{ [K in keyof T]: ZodType }>,
> {
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
	// 继承关系（合并父表字典/字段生成器）
	inheritsFrom?: InheritsFromDecl;
	// 内嵌子表（1:N，表单内嵌套数组编辑器）
	embeds?: EmbedsDecl[];
	// 表单新建回调
	onInsert: (values: T) => Promise<T>;
	// 表单更新回调
	onUpdate: (primaryKeyValue: string, values: T) => Promise<T>;
}

type ForeignKeyRenderInfo = {
	referencedTable: keyof DB;
	referencedField: string;
};

/**
 * 渲染单个字段（供主表单和 embed 内嵌数组共用）
 * - pathPrefix 为空时渲染顶层字段；否则渲染嵌套字段（如 "variants[0]"）
 * - dataSchema / dictionary / fieldGenerator 都对应这组字段实际所属的表（父表或子表）
 */
function FormFieldBlock<TItem extends Record<string, unknown>>(props: {
	form: ReturnType<typeof createForm<TItem>> | ReturnType<typeof createForm<any>>;
	pathPrefix: string;
	fieldKey: keyof TItem & string;
	dataSchema: ZodObject<{ [K in keyof TItem]: ZodType }>;
	dictionary: Dic<TItem>;
	fieldGenerator?: Partial<{
		[K in keyof TItem]: (
			value: () => TItem[K],
			setValue: (value: TItem[K]) => void,
			validationMessage: string,
			dictionary: Dic<TItem>,
			dataSchema: ZodObject<Record<keyof TItem, ZodType>>,
		) => JSX.Element;
	}>;
	foreignKeyFieldMap: Map<string, ForeignKeyRenderInfo>;
	fkOptionsByTable: () => Partial<Record<keyof DB, unknown[]>> | undefined;
}) {
	const key = props.fieldKey;
	const fullName = (props.pathPrefix ? `${props.pathPrefix}.${key}` : key) as unknown as DeepKeys<any>;
	const schemaField = props.dataSchema.shape[key];
	const fieldGenerator = props.fieldGenerator?.[key];
	const fkInfo = props.foreignKeyFieldMap.get(String(key));

	const fieldDic = (props.dictionary.fields as Record<string, { key?: string; formFieldDescription?: string }>)[
		String(key)
	];
	const inputTitle = fieldDic?.key ?? String(key);
	const inputDescription = fieldDic?.formFieldDescription ?? "";
	const fieldClass = "border-dividing-color bg-primary-color rounded-md border w-full";

	return (
		// @ts-expect-error - 动态路径与 DeepKeys<T> 类型对齐困难，运行时正确
		<props.form.Field
			name={fullName}
			validators={{
				onChangeAsyncDebounceMs: 500,
				onChangeAsync: schemaField,
			}}
		>
			{(field: () => AnyFieldApi) => {
				// 1) 自定义 fieldGenerator 优先
				if (fieldGenerator) {
					return fieldGenerator(
						() => field().state.value as TItem[typeof key],
						(value) => field().setValue(value as never),
						fieldInfo(field()),
						props.dictionary,
						props.dataSchema as ZodObject<Record<keyof TItem, ZodType>>,
					);
				}

				// 2) 外键列兜底：自动 Autocomplete
				if (fkInfo) {
					const options = () =>
						(props.fkOptionsByTable()?.[fkInfo.referencedTable] ?? []) as Array<Record<string, unknown>>;
					return (
						<Input
							title={inputTitle !== String(key) ? inputTitle : fkInfo.referencedTable}
							description={inputDescription || `选择 ${fkInfo.referencedTable} 记录`}
							validationMessage={fieldInfo(field())}
							class={fieldClass}
						>
							<Autocomplete
								id={String(fullName)}
								options={options()}
								value={field().state.value}
								onChange={(value) => field().setValue(value as never)}
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

				// 3) 数组兜底：简单字符串数组
				if (schemaField.type === "array") {
					const arrayValue = () => (field().state.value as string[]) ?? [];
					return (
						<Input
							title={inputTitle}
							description={inputDescription}
							validationMessage={fieldInfo(field())}
							class={fieldClass}
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
														field().replaceValue(index, e.target.value as never);
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
										field().pushValue("" as never);
									}}
									class="w-full"
								>
									+
								</Button>
							</div>
						</Input>
					);
				}

				// 4) 按 schema type 分派
				switch (schemaField.type) {
					case "enum": {
						const options = (schemaField as ZodEnum<Record<string, string>>).options.map((i) => i.toString());
						const enumMap = (fieldDic as EnumFieldDetail<string> | undefined)?.enumMap ?? {};
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								validationMessage={fieldInfo(field())}
								class={fieldClass}
							>
								<Show
									when={options.length > 6}
									fallback={
										<EnumSelect
											value={field().state.value as string}
											setValue={(value) => field().setValue(value as never)}
											options={options}
											dic={enumMap}
											field={{ id: field().name, name: field().name }}
										/>
									}
								>
									<Select
										value={field().state.value as string}
										setValue={(v) => field().setValue(v as never)}
										options={options.map((type) => ({ label: enumMap[type] ?? type, value: type }))}
										placeholder={field().state.value as string}
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
								id={field().name}
								name={field().name}
								value={field().state.value as number}
								onBlur={field().handleBlur}
								onChange={(e) => field().handleChange(parseFloat(e.target.value))}
								validationMessage={fieldInfo(field())}
								class={fieldClass}
							/>
						);
					}
					case "boolean": {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								validationMessage={fieldInfo(field())}
								class={fieldClass}
							>
								<Toggle
									id={field().name}
									onClick={() => field().setValue(!field().state.value as never)}
									onBlur={field().handleBlur}
									name={field().name}
									checked={field().state.value as boolean}
								/>
							</Input>
						);
					}
					case "lazy": {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								autocomplete="off"
								type="text"
								id={field().name}
								name={field().name}
								value={field().state.value as string}
								onBlur={field().handleBlur}
								onChange={(e) => field().handleChange(e.target.value as never)}
								validationMessage={fieldInfo(field())}
								class={fieldClass}
							>
								"逻辑编辑器，暂未处理"
							</Input>
						);
					}
					case "object": {
						// 对象型字段：不在此渲染器内处理，需 fieldGenerator 兜底（比如 BtEditor）
						return (
							<Input title={inputTitle} description={inputDescription} class={fieldClass}>
								<span class="text-dividing-color">[object] 需要自定义 fieldGenerator</span>
							</Input>
						);
					}
					default: {
						return (
							<Input
								title={inputTitle}
								description={inputDescription}
								autocomplete="off"
								type="text"
								id={field().name}
								name={field().name}
								value={field().state.value as string}
								onBlur={field().handleBlur}
								onChange={(e) => field().handleChange(e.target.value as never)}
								validationMessage={fieldInfo(field())}
								class={fieldClass}
							/>
						);
					}
				}
			}}
			{/* @ts-expect-error 同上 */}
		</props.form.Field>
	);
}

export const Form = <T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>>(
	props: FormProps<T, TSchema>,
) => {
	const dictionary = useDictionary();

	// 判断是否新建（主键等于默认主键）
	const isNew = createMemo(() => {
		const currentPrimaryKeyValue = props.value[props.primaryKey];
		const defaultPrimaryKeyValue = props.defaultValue[props.primaryKey];
		return currentPrimaryKeyValue === defaultPrimaryKeyValue;
	});

	// ---------- 合并 inheritsFrom 带来的父表字典/字段生成器 ----------

	const mergedDictionary = createMemo<Dic<T>>(() => {
		if (!props.inheritsFrom) return props.dictionary;
		const parentDic = dictionary().db[props.inheritsFrom.table];
		return {
			...props.dictionary,
			fields: {
				...((parentDic?.fields as object) ?? {}),
				...(props.dictionary.fields as object),
			},
		} as Dic<T>;
	});

	const mergedFieldGenerator = createMemo(() => {
		const own = props.fieldGenerator ?? {};
		if (!props.inheritsFrom) return own as NonNullable<typeof props.fieldGenerator>;
		const parentForm = DATA_CONFIG[props.inheritsFrom.table]?.(dictionary).form;
		return {
			...((parentForm?.fieldGenerator as object) ?? {}),
			...(own as object),
		} as NonNullable<typeof props.fieldGenerator>;
	});

	// ---------- 自动 FK 字段映射 ----------

	const foreignKeyFieldMap = createMemo(() => {
		const map = new Map<string, ForeignKeyRenderInfo>();
		const tables: Array<keyof DB> = [props.tableName as keyof DB];
		if (props.inheritsFrom) tables.push(props.inheritsFrom.table);
		for (const table of tables) {
			for (const fkCol of listFkColumns(table)) {
				if (map.has(String(fkCol))) continue;
				const ref = getFkRefByColumn(table, fkCol);
				if (!ref) continue;
				// 不把"指向继承父表自身的 FK"作为选择器（用户不需要手选父表）
				if (props.inheritsFrom && String(fkCol) === props.inheritsFrom.via) continue;
				map.set(String(fkCol), { referencedTable: ref.table, referencedField: ref.field });
			}
		}
		return map;
	});

	const referencedTables = createMemo(() => {
		const set = new Set<keyof DB>();
		for (const v of foreignKeyFieldMap().values()) set.add(v.referencedTable);
		return Array.from(set);
	});

	const [fkOptionsByTable] = createResource(referencedTables, async (tables) => {
		const entries = await Promise.all(
			tables.map(async (table) => {
				const options = (await repositoryMethods[table].selectAll?.()) ?? [];
				return [table, options] as const;
			}),
		);
		return Object.fromEntries(entries) as Partial<Record<keyof DB, unknown[]>>;
	});

	// ---------- 排除 embed 字段，防止被当成普通 array 渲染 ----------

	const embedFieldNames = createMemo(() => new Set((props.embeds ?? []).map((e) => e.field)));

	// ---------- 创建表单 ----------

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

	// ---------- 字段组渲染 ----------

	const fieldGroupGenerator = (fieldGroup: Array<keyof T>) => (
		<For each={fieldGroup}>
			{(key) => {
				if (props.hiddenFields?.includes(key)) return null;
				if (embedFieldNames().has(String(key))) return null;

				return (
					<FormFieldBlock
						form={form}
						pathPrefix=""
						fieldKey={String(key) as keyof T & string}
						dataSchema={props.dataSchema}
						dictionary={mergedDictionary()}
						fieldGenerator={mergedFieldGenerator()}
						foreignKeyFieldMap={foreignKeyFieldMap()}
						fkOptionsByTable={() => fkOptionsByTable()}
					/>
				);
			}}
		</For>
	);

	// ---------- embed 内嵌数组渲染 ----------

	const embedSection = (embed: EmbedsDecl) => {
		const childConfig = DATA_CONFIG[embed.table]?.(dictionary);
		if (!childConfig) {
			return (
				<section class="FieldGroup flex w-full flex-col gap-2">
					<h3 class="text-accent-color px-3 py-2">未找到子表配置：{embed.table}</h3>
				</section>
			);
		}
		const childTableName = embed.table;
		return (
			<section class="FieldGroup flex w-full flex-col gap-2">
				<h3 class="text-accent-color flex items-center gap-2 px-3 py-2">
					{childConfig.dictionary.selfName}
					<div class="Divider bg-dividing-color h-px w-full flex-1" />
				</h3>
				{/* @ts-expect-error 动态 embed 字段名与 DeepKeys<T> 对齐困难 */}
				<form.Field name={embed.field} mode="array">
					{(arrayField: () => AnyFieldApi) => {
						const items = () => (arrayField().state.value as Array<Record<string, unknown>>) ?? [];
						return (
							<div class="EmbedArray flex w-full flex-col gap-4">
								<Index each={items()}>
									{(_item, index) => (
										<div class="EmbedItem bg-primary-color border-dividing-color flex flex-col gap-3 rounded-md border p-3">
											<div class="flex items-center justify-between">
												<span class="text-accent-color font-bold">
													{childConfig.dictionary.selfName} #{index + 1}
												</span>
												<Button
													level="tertiary"
													onClick={() => {
														arrayField().removeValue(index);
													}}
												>
													移除
												</Button>
											</div>
											<Show
												when={Object.keys(childConfig.fieldGroupMap ?? {}).length > 0}
												fallback={
													<For each={Object.keys(childConfig.defaultData) as Array<string>}>
														{(childKey) => {
															if (childConfig.form.hiddenFields?.includes(childKey as never)) return null;
															return (
																<FormFieldBlock
																	form={form}
																	pathPrefix={`${embed.field}[${index}]`}
																	fieldKey={childKey as never}
																	dataSchema={childConfig.dataSchema}
																	dictionary={childConfig.dictionary}
																	fieldGenerator={childConfig.form.fieldGenerator}
																	foreignKeyFieldMap={childFkMapFor(childTableName, embed.via)}
																	fkOptionsByTable={() => fkOptionsByTable()}
																/>
															);
														}}
													</For>
												}
											>
												<For each={Object.entries(childConfig.fieldGroupMap ?? {})}>
													{([groupName, keys]) => {
														const visibleKeys = (keys as Array<string>).filter(
															(k) => !childConfig.form.hiddenFields?.includes(k as never),
														);
														if (visibleKeys.length === 0) return null;
														return (
															<section class="SubFieldGroup flex w-full flex-col gap-2">
																<h4 class="text-main-text-color px-2 py-1 text-sm">{groupName}</h4>
																<div class="Content flex flex-col gap-3">
																	<For each={visibleKeys}>
																		{(childKey) => (
																			<FormFieldBlock
																				form={form}
																				pathPrefix={`${embed.field}[${index}]`}
																				fieldKey={childKey as never}
																				dataSchema={childConfig.dataSchema}
																				dictionary={childConfig.dictionary}
																				fieldGenerator={childConfig.form.fieldGenerator}
																				foreignKeyFieldMap={childFkMapFor(childTableName, embed.via)}
																				fkOptionsByTable={() => fkOptionsByTable()}
																			/>
																		)}
																	</For>
																</div>
															</section>
														);
													}}
												</For>
											</Show>
										</div>
									)}
								</Index>
								<Button
									level="secondary"
									onClick={() => {
										const newItem = {
											...(childConfig.defaultData as Record<string, unknown>),
											[embed.via]: props.value[props.primaryKey],
										};
										arrayField().pushValue(newItem as never);
									}}
								>
									新增 {childConfig.dictionary.selfName}
								</Button>
							</div>
						);
					}}
					{/* @ts-expect-error 同上 */}
				</form.Field>
			</section>
		);
	};

	// 子表的 FK 字段映射缓存（排除回指父表的 via FK，避免用户在子表单里手选父表）
	const childFkMapCache = new Map<string, Map<string, ForeignKeyRenderInfo>>();
	const childFkMapFor = (childTable: keyof DB, viaFk: string): Map<string, ForeignKeyRenderInfo> => {
		const key = `${String(childTable)}::${viaFk}`;
		const cached = childFkMapCache.get(key);
		if (cached) return cached;
		const map = new Map<string, ForeignKeyRenderInfo>();
		for (const fkCol of listFkColumns(childTable)) {
			if (String(fkCol) === viaFk) continue;
			const ref = getFkRefByColumn(childTable, fkCol);
			if (!ref) continue;
			map.set(String(fkCol), { referencedTable: ref.table, referencedField: ref.field });
		}
		childFkMapCache.set(key, map);
		return map;
	};

	return (
		<div class="FormBox flex w-full flex-col">
			<div class="Title flex items-center p-2 portrait:p-6">
				<h1 class="FormTitle text-2xl font-black">{mergedDictionary().selfName ?? props.tableName}</h1>
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
								keys.some(
									(key) => !props.hiddenFields?.includes(key) && !embedFieldNames().has(String(key)),
								),
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

				{/* embed 嵌套数组编辑 */}
				<For each={(props.embeds ?? []).filter((e) => (e.mode ?? "inline") === "inline")}>
					{(embed) => embedSection(embed)}
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

// 兼容保留：以前外部引用过 FieldRenderer。
// 新代码不应使用它，embed/嵌套请使用 FormFieldBlock。
export { isFkColumn };
