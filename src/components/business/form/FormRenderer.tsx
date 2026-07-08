import { getFkRefByColumn, listFkColumns } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import type { DB } from "@db/generated/zod";
import { createId } from "@paralleldrive/cuid2";
import { type AnyFieldApi, createForm, type DeepKeys } from "@tanstack/solid-form";
import { createMemo, createResource, For, Index, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { useDictionary } from "~/contexts/Dictionary";
import type { Dic, FieldDetail } from "~/locales/type";
import { DATA_CONFIG, type EmbedsDecl, type InheritsFromDecl } from "../data-config";
import {
	DefaultFieldClass,
	type FormRendererFormApi,
	type FormRendererPath,
	type FormRenderers,
	hasFieldRenderer,
	SchemaFieldNode,
} from "./SchemaFieldRenderer";

export { DefaultFieldClass } from "./SchemaFieldRenderer";

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
	// 表单节点渲染器：fields 完全接管节点，containers 只接管对象/数组/union 容器层。
	renderers?: FormRenderers<T>;
	// 继承关系（合并父表字典/渲染器）
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
 * - dataSchema / dictionary / renderers 都对应这组字段实际所属的表（父表或子表）
 */
function FormFieldBlock<TFormData extends Record<string, unknown>, TItem extends Record<string, unknown>>(props: {
	form: FormRendererFormApi<TFormData>;
	pathPrefix: string;
	fieldKey: keyof TItem & string;
	dataSchema: ZodObject<{ [K in keyof TItem]: ZodType }>;
	dictionary: Dic<TItem>;
	renderers?: FormRenderers<TItem>;
	foreignKeyFieldMap: Map<string, ForeignKeyRenderInfo>;
	fkOptionsByTable: () => Partial<Record<keyof DB, unknown[]>> | undefined;
}) {
	const key = props.fieldKey;
	const fullName = (props.pathPrefix ? `${props.pathPrefix}.${key}` : key) as unknown as DeepKeys<
		Record<string, unknown>
	>;
	const schemaField = props.dataSchema.shape[key];
	const fkInfo = props.foreignKeyFieldMap.get(String(key));
	const fieldDic = (props.dictionary.fields as Record<string, FieldDetail | undefined>)[String(key)];
	const inputTitle = fieldDic?.key ?? String(key);
	const inputDescription = fieldDic?.formFieldDescription ?? "";

	if (!schemaField) return null;

	if (!hasFieldRenderer(props.renderers, String(key)) && fkInfo) {
		return (
			<props.form.Field
				name={fullName}
				validators={{
					onChangeAsyncDebounceMs: 500,
					onChangeAsync: schemaField,
				}}
			>
				{(field: () => AnyFieldApi) => {
					const options = () =>
						(props.fkOptionsByTable()?.[fkInfo.referencedTable] ?? []) as Array<Record<string, unknown>>;
					return (
						<Input
							title={inputTitle !== String(key) ? inputTitle : fkInfo.referencedTable}
							description={inputDescription || `选择 ${fkInfo.referencedTable} 记录`}
							validationMessage={fieldInfo(field())}
							class={DefaultFieldClass}
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
				}}
			</props.form.Field>
		);
	}

	return (
		<SchemaFieldNode<TFormData, TItem>
			form={props.form}
			name={String(fullName)}
			path={String(key) as FormRendererPath<TItem>}
			schema={schemaField}
			dictionary={fieldDic}
			renderers={props.renderers}
		/>
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

	// 新建记录的默认数据通常带有 defaultXXX 主键占位值；当主键字段在表单内隐藏时，
	// 用户没有机会手动替换它，因此这里在进入 form state 前生成真实 id。
	// 设计目标：保持“默认主键 == 新建态”的判断语义，同时避免提交时把 defaultXXX 写入数据流。
	const initialValue = createMemo(() => {
		if (isNew() && props.hiddenFields?.includes(props.primaryKey)) {
			return {
				...props.value,
				[props.primaryKey]: createId(),
			};
		}
		return props.value;
	});

	// ---------- 合并 inheritsFrom 带来的父表字典/节点渲染器 ----------

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

	const mergedRenderers = createMemo<FormRenderers<T> | undefined>(() => {
		const own = props.renderers;
		if (!props.inheritsFrom) return own;
		const parentForm = DATA_CONFIG[props.inheritsFrom.table]?.(dictionary).form;
		return {
			fields: {
				...((parentForm?.renderers?.fields as object) ?? {}),
				...((own?.fields as object) ?? {}),
			},
			containers: {
				...((parentForm?.renderers?.containers as object) ?? {}),
				...((own?.containers as object) ?? {}),
			},
		} as FormRenderers<T>;
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
		defaultValues: initialValue(),
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
						renderers={mergedRenderers()}
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
					<h3 class="text-accent-color py-2">未找到子表配置：{embed.table}</h3>
				</section>
			);
		}
		const childTableName = embed.table;
		return (
			<section class="FieldGroup flex w-full flex-col gap-2 p-2 bg-primary-color rounded">
				<h3 class="text-accent-color font-bold flex items-center gap-2 py-2">{childConfig.dictionary.selfName}</h3>
				<form.Field name={embed.field} mode="array">
					{(arrayField: () => AnyFieldApi) => {
						const items = () => (arrayField().state.value as Array<Record<string, unknown>>) ?? [];
						return (
							<div class="EmbedArray flex w-full flex-col gap-4">
								<Index each={items()}>
									{(_item, index) => (
										<div class="EmbedItem bg-area-color border-dividing-color flex flex-col gap-1 rounded-md border p-1">
											<div class="flex items-center justify-between p-2 ">
												<span class="text-accent-color font-bold">
													{childConfig.dictionary.selfName} #{index + 1}
												</span>
												<Button
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
																	renderers={childConfig.form.renderers}
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
															<section class="SubFieldGroup flex portrait:flex-col w-full gap-2 bg-primary-color rounded p-2">
																<h4 class="text-main-text-color p-2 portrait:w-full w-fit flex-none landscape:border-r border-dividing-color">
																	{groupName}
																</h4>
																<div class="Content flex flex-col gap-2 w-full">
																	<For each={visibleKeys}>
																		{(childKey) => (
																			<FormFieldBlock
																				form={form}
																				pathPrefix={`${embed.field}[${index}]`}
																				fieldKey={childKey as never}
																				dataSchema={childConfig.dataSchema}
																				dictionary={childConfig.dictionary}
																				renderers={childConfig.form.renderers}
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
									onClick={() => {
										const childPrimaryKey = childConfig.primaryKey;
										const newItem = {
											...(childConfig.defaultData as Record<string, unknown>),
											[embed.via]: initialValue()[props.primaryKey],
										};
										// 内嵌子表新增同样不能保留 defaultXXX 主键；否则后续独立编辑时会被误判为“添加”，
										// 或在更新父表时尝试更新一条不存在的 defaultXXX 子记录。
										if (childConfig.form.hiddenFields?.includes(childPrimaryKey as never)) {
											newItem[String(childPrimaryKey)] = createId();
										}
										arrayField().pushValue(newItem as never);
									}}
								>
									新增 {childConfig.dictionary.selfName}
								</Button>
							</div>
						);
					}}
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
								keys.some((key) => !props.hiddenFields?.includes(key) && !embedFieldNames().has(String(key))),
							)}
						>
							{([groupName, keys]) => (
								<section class="FieldGroup flex w-full flex-col gap-2 p-2 bg-primary-color rounded">
									<h3 class="text-accent-color font-bold flex items-center gap-2 py-2">{groupName}</h3>
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
