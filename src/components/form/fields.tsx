import type {
	AnyFieldApi,
	DeepKeys,
	DeepValue,
	FormAsyncValidateOrFn,
	FormValidateOrFn,
	SolidFormExtendedApi,
} from "@tanstack/solid-form";
import { createEffect, createMemo, createSignal, For, Index, Show, untrack } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Toggle } from "~/components/controls/toggle";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { findRenderer } from "~/lib/utils/rendererPath";
import {
	arrayElement,
	enumOptions,
	getZodType,
	isComplexType,
	literalValue,
	objectShape,
	unionDiscriminator,
	unionOptions,
	unwrapSchema,
} from "~/lib/utils/zod";
import type { EnumFieldDetail, FieldDetail } from "~/locales/type";

type StringDeepKeys<TFormData> = Extract<DeepKeys<TFormData>, string>;

/** 配置中的数组项使用稳定的 `[]`，TanStack Form 的运行路径使用具体数字下标。 */
type NormalizeFormArrayPath<TPath extends string> = TPath extends `${infer Head}[${number}]${infer Tail}`
	? `${Head}[]${NormalizeFormArrayPath<Tail>}`
	: TPath;

type DenormalizeFormArrayPath<TPath extends string> = TPath extends `${infer Head}[]${infer Tail}`
	? `${Head}[${number}]${DenormalizeFormArrayPath<Tail>}`
	: TPath;

export type FormRendererPath<TFormData> =
	StringDeepKeys<TFormData> extends infer TPath extends string ? TPath | NormalizeFormArrayPath<TPath> : never;

export type FormRendererPathValue<
	TFormData,
	TPath extends string,
> = DenormalizeFormArrayPath<TPath> extends DeepKeys<TFormData>
	? DeepValue<TFormData, DenormalizeFormArrayPath<TPath>>
	: never;

export type FormRendererRuntimePath<TPath extends string> = DenormalizeFormArrayPath<TPath>;

type FormContainerValue = readonly unknown[] | Record<string, unknown>;

export type FormContainerRendererPath<TFormData> = {
	[TPath in FormRendererPath<TFormData>]: NonNullable<
		FormRendererPathValue<TFormData, TPath>
	> extends FormContainerValue
		? TPath
		: never;
}[FormRendererPath<TFormData>];

type FormValidateSlot<TFormData> = FormValidateOrFn<TFormData> | undefined;
type FormAsyncValidateSlot<TFormData> = FormAsyncValidateOrFn<TFormData> | undefined;

export type FormRendererFormApi<TFormData> = Pick<
	SolidFormExtendedApi<
		TFormData,
		FormValidateSlot<TFormData>,
		FormValidateSlot<TFormData>,
		FormAsyncValidateSlot<TFormData>,
		FormValidateSlot<TFormData>,
		FormAsyncValidateSlot<TFormData>,
		FormValidateSlot<TFormData>,
		FormAsyncValidateSlot<TFormData>,
		FormValidateSlot<TFormData>,
		FormAsyncValidateSlot<TFormData>,
		FormAsyncValidateSlot<TFormData>,
		unknown
	>,
	"Field"
>;

export type FormContainerFrameOptions = {
	/**
	 * 只替换容器内部的子节点布局。外层标题、描述、校验信息、清空按钮仍由默认表单框架负责。
	 */
	children?: () => JSX.Element;
};

export type FormFieldRendererContext<TFormData, TPath extends FormRendererPath<TFormData>> = {
	/** 配置路径命中后传入实际运行路径；数组项会带有真实下标。 */
	path: FormRendererRuntimePath<TPath>;
	/** TanStack Form 实际字段路径；embed 场景会包含父级数组索引。 */
	name: string;
	schema: ZodType;
	value: () => FormRendererPathValue<TFormData, TPath>;
	setValue: (value: FormRendererPathValue<TFormData, TPath>) => void;
	validationMessage: string;
	dictionary?: FieldDetail;
	renderDefault: () => JSX.Element;
};

export type FormContainerRendererContext<
	TFormData,
	TPath extends FormContainerRendererPath<TFormData>,
> = FormFieldRendererContext<TFormData, TPath> & {
	kind: "object" | "array" | "union";
	children: () => JSX.Element;
	renderFrame: (options?: FormContainerFrameOptions) => JSX.Element;
};

export type FormFieldRendererMap<TFormData> = {
	[TPath in FormRendererPath<TFormData>]?: (context: FormFieldRendererContext<TFormData, TPath>) => JSX.Element;
};

export type FormContainerRendererMap<TFormData> = {
	[TPath in FormContainerRendererPath<TFormData>]?: (
		context: FormContainerRendererContext<TFormData, TPath>,
	) => JSX.Element;
};

export type FormRenderers<TFormData> = {
	fields?: FormFieldRendererMap<TFormData>;
	containers?: FormContainerRendererMap<TFormData>;
};

function arrayMinimumLength(schema: ZodType): number {
	const emptyResult = schema.safeParse([]);
	if (emptyResult.success) return 0;
	const minimums = emptyResult.error.issues.map((issue) => {
		if (issue.code !== "too_small" || issue.path.length !== 0) return 0;
		const detail = issue as { origin?: unknown; minimum?: unknown };
		return detail.origin === "array" && typeof detail.minimum === "number" ? detail.minimum : 0;
	});
	return Math.max(0, ...minimums);
}

/**
 * 根据 schema 构造“开始编辑”时的最小值。
 * `.default()` 优先交还给 Zod 计算；没有默认值时只补齐可编辑结构，
 * 数组会读取 Zod 的 min length 检查来补足必需项，让“创建”出来的对象尽量是合法起点。
 */
export function createSchemaDefaultValue(schema: ZodType): unknown {
	const defaultResult = schema.safeParse(undefined);
	if (defaultResult.success) return defaultResult.data;

	const { schema: unwrapped, optional } = unwrapSchema(schema);
	switch (getZodType(unwrapped)) {
		case "string":
			return "";
		case "number":
			return 0;
		case "boolean":
			return false;
		case "null":
			return null;
		case "enum":
			return enumOptions(unwrapped)[0] ?? "";
		case "literal":
			return literalValue(unwrapped);
		case "array":
			return Array.from({ length: arrayMinimumLength(unwrapped) }, () =>
				createSchemaDefaultValue(arrayElement(unwrapped)),
			);
		case "object": {
			const value: Record<string, unknown> = {};
			for (const [key, childSchema] of Object.entries(objectShape(unwrapped))) {
				const childValue = createSchemaDefaultValue(childSchema);
				const childInfo = unwrapSchema(childSchema);
				if (childValue !== undefined || !childInfo.optional) {
					value[key] = childValue;
				}
			}
			const parsed = schema.safeParse(value);
			return parsed.success ? parsed.data : value;
		}
		case "union":
			return createSchemaDefaultValue(unionOptions(unwrapped)[0] ?? unwrapped);
		case "record":
			return {};
		default:
			return optional ? undefined : null;
	}
}

function formatJson(value: unknown): string {
	if (value === undefined) return "";
	return JSON.stringify(value, null, 2);
}

export function JsonValueEditor(props: {
	title: string;
	description: string;
	value: () => unknown;
	setValue: (value: unknown) => void;
	validationMessage: string;
	class: string;
}) {
	const [draft, setDraft] = createSignal(formatJson(props.value()));
	const [localError, setLocalError] = createSignal<string>();

	createEffect(() => {
		// 非法 JSON 期间保留用户草稿；一旦恢复合法输入，再跟随外部 form state 格式化同步。
		if (localError()) return;
		const nextDraft = formatJson(props.value());
		if (untrack(draft) !== nextDraft) setDraft(nextDraft);
	});

	return (
		<Input
			title={props.title}
			description={props.description}
			validationMessage={localError() ?? props.validationMessage}
			class={props.class}
		>
			<textarea
				value={draft()}
				spellcheck={false}
				class="text-accent-color bg-area-color min-h-32 w-full resize-y rounded p-3 font-mono text-sm"
				onInput={(event) => {
					const nextDraft = event.currentTarget.value;
					setDraft(nextDraft);
					try {
						props.setValue(JSON.parse(nextDraft));
						setLocalError(undefined);
					} catch (error) {
						setLocalError(error instanceof Error ? error.message : String(error));
					}
				}}
			/>
		</Input>
	);
}

// 顶层字段沿用原表单的分隔样式；嵌套节点使用更紧凑的无分隔布局。
export const DefaultFieldClass = "first:border-none border-dividing-color border-t pt-3 w-full";

function titleFromPath(path: string): string {
	const lastSegment = path.split(".").at(-1) ?? path;
	return lastSegment.replace(/\[(\d+)\]$/, (_match, index: string) => ` #${Number(index) + 1}`);
}

function nodeTitle(path: string, dictionary?: FieldDetail): string {
	return dictionary?.key ?? titleFromPath(path);
}

function nodeClass(depth: number): string {
	return depth === 0 ? DefaultFieldClass : "w-full bg-primary-color p-2 rounded";
}

function childDictionary(dictionary: FieldDetail | undefined, key: string): FieldDetail | undefined {
	return dictionary?.fields?.[key];
}

type SchemaFieldNodeProps<
	TFormData extends object,
	TRenderData extends object,
	TPath extends FormRendererPath<TRenderData> = FormRendererPath<TRenderData>,
> = {
	form: FormRendererFormApi<TFormData>;
	/** TanStack Form 实际注册名。 */
	name: string;
	/** 相对当前 dataConfig 的 renderer/dictionary 查找路径。 */
	path: TPath;
	schema: ZodType;
	dictionary?: FieldDetail;
	renderers?: FormRenderers<TRenderData>;
	depth?: number;
};

type FieldRendererFn<TRenderData, TPath extends FormRendererPath<TRenderData>> = (
	context: FormFieldRendererContext<TRenderData, TPath>,
) => JSX.Element;

type ContainerRendererFn<TRenderData> = (
	context: FormContainerRendererContext<TRenderData, FormContainerRendererPath<TRenderData>>,
) => JSX.Element;

/** 配置入口按具体 path 保留 context 类型；运行时字符串查找只在这里擦除 mapped type 的键关联。 */
function getFieldRenderer<TRenderData, TPath extends FormRendererPath<TRenderData>>(
	renderers: FormRenderers<TRenderData> | undefined,
	path: string,
): FieldRendererFn<TRenderData, TPath> | undefined {
	return findRenderer(
		renderers?.fields as Partial<Record<string, FieldRendererFn<TRenderData, TPath>>> | undefined,
		path,
	);
}

function getContainerRenderer<TRenderData>(
	renderers: FormRenderers<TRenderData> | undefined,
	path: string,
): ContainerRendererFn<TRenderData> | undefined {
	return findRenderer(
		renderers?.containers as Partial<Record<string, ContainerRendererFn<TRenderData>>> | undefined,
		path,
	);
}

/**
 * Zod schema tree 的唯一默认渲染入口。
 * 职责：把数据库 JSON 字段与普通字段统一为同一种递归数据流，避免业务配置手写对象/数组表单。
 * schema 遍历保证拼接出的片段属于实际字段；TypeScript 无法把运行时 schema 与 DeepKeys 关联，
 * 因此路径和值只在这个递归边界恢复为 TanStack Form 类型。
 */
export function SchemaFieldNode<
	TFormData extends object,
	TRenderData extends object,
	TPath extends FormRendererPath<TRenderData> = FormRendererPath<TRenderData>,
>(props: SchemaFieldNodeProps<TFormData, TRenderData, TPath>) {
	const depth = () => props.depth ?? 0;

	return (
		<props.form.Field
			// embed 的完整名称由运行时父路径拼接；schema 递归保证每个片段均来自实际字段。
			name={props.name as unknown as DeepKeys<Record<string, unknown>>}
			validators={{
				onChangeAsyncDebounceMs: 500,
				onChangeAsync: props.schema,
			}}
		>
			{(field: () => AnyFieldApi) => {
				const validationMessage = () => fieldInfo(field());
				const baseContext = (renderDefault: () => JSX.Element): FormFieldRendererContext<TRenderData, TPath> => ({
					path: props.path as FormRendererRuntimePath<TPath>,
					name: props.name,
					schema: props.schema,
					value: () => field().state.value as FormRendererPathValue<TRenderData, TPath>,
					setValue: (value) => field().setValue(value as never),
					validationMessage: validationMessage(),
					dictionary: props.dictionary,
					renderDefault,
				});

				const renderContainer = (
					kind: FormContainerRendererContext<TRenderData, FormContainerRendererPath<TRenderData>>["kind"],
					children: () => JSX.Element,
					renderFrame: (options?: FormContainerFrameOptions) => JSX.Element,
				) => {
					const renderer = getContainerRenderer(props.renderers, props.path);
					const renderDefault = () => renderFrame();
					// 运行时 schema 已确认当前节点是容器；泛型 path 无法根据该分支自动收窄，因此在调用边界恢复容器上下文。
					return renderer
						? renderer({
								...baseContext(renderDefault),
								kind,
								children,
								renderFrame,
							} as unknown as FormContainerRendererContext<TRenderData, FormContainerRendererPath<TRenderData>>)
						: renderDefault();
				};

				const renderNode = (): JSX.Element => {
					const wrapper = unwrapSchema(props.schema);
					const unwrapped = wrapper.schema;
					const type = getZodType(unwrapped);
					const title = nodeTitle(props.path, props.dictionary);
					const description = props.dictionary?.formFieldDescription ?? "";
					const className = nodeClass(depth());

					if ((field().state.value === null || field().state.value === undefined) && isComplexType(type)) {
						return (
							<Input title={title} description={description} validationMessage={validationMessage()} class={className}>
								<Button class="w-full" onClick={() => field().setValue(createSchemaDefaultValue(unwrapped) as never)}>
									创建
								</Button>
							</Input>
						);
					}

					const clearButton = () => (
						<Show when={wrapper.nullable || wrapper.optional}>
							<div class="flex justify-end">
								<Button onClick={() => field().setValue((wrapper.nullable ? null : undefined) as never)}>清空</Button>
							</div>
						</Show>
					);

					switch (type) {
						case "object": {
							const children = () => (
								<For each={Object.entries(objectShape(unwrapped))}>
									{([key, childSchema]) => (
										<SchemaFieldNode<TFormData, TRenderData>
											form={props.form}
											name={`${props.name}.${key}`}
											path={`${props.path}.${key}` as FormRendererPath<TRenderData>}
											schema={childSchema}
											dictionary={childDictionary(props.dictionary, key)}
											renderers={props.renderers}
											depth={depth() + 1}
										/>
									)}
								</For>
							);
							const renderFrame = (options?: FormContainerFrameOptions) => (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
								>
									<div class="flex w-full flex-col gap-1 hover:outline-brand-color-1st p-1 rounded bg-area-color">
										{clearButton()}
										{(options?.children ?? children)()}
									</div>
								</Input>
							);
							return renderContainer("object", children, renderFrame);
						}
						case "array": {
							const elementSchema = arrayElement(unwrapped);
							const items = () => (Array.isArray(field().state.value) ? field().state.value : []) as unknown[];
							const children = () => (
								<>
									<Index each={items()}>
										{(_item, index) => (
											<div class="border-dividing-color flex w-full flex-col gap-2 bg-area-color rounded border p-2">
												<div class="flex justify-end">
													<Button onClick={() => field().removeValue(index)}>移除</Button>
												</div>
												<SchemaFieldNode<TFormData, TRenderData>
													form={props.form}
													name={`${props.name}[${index}]`}
													path={`${props.path}[${index}]` as FormRendererPath<TRenderData>}
													schema={elementSchema}
													dictionary={props.dictionary?.item}
													renderers={props.renderers}
													depth={depth() + 1}
												/>
											</div>
										)}
									</Index>
									<Button
										class="w-full"
										onClick={() => field().pushValue(createSchemaDefaultValue(elementSchema) as never)}
									>
										新增
									</Button>
								</>
							);
							const renderFrame = (options?: FormContainerFrameOptions) => (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
								>
									<div class="flex w-full flex-col gap-3 hover:outline-brand-color-4st rounded">
										{clearButton()}
										{(options?.children ?? children)()}
									</div>
								</Input>
							);
							return renderContainer("array", children, renderFrame);
						}
						case "union": {
							const discriminator = unionDiscriminator(unwrapped);
							if (!discriminator) {
								return (
									<JsonValueEditor
										title={title}
										description={description}
										value={() => field().state.value}
										setValue={(value) => field().setValue(value as never)}
										validationMessage={validationMessage()}
										class={className}
									/>
								);
							}

							const options = unionOptions(unwrapped);
							const optionByValue = new Map(
								options.map((option) => [String(literalValue(objectShape(option)[discriminator])), option]),
							);
							const currentValue = () =>
								String((field().state.value as Record<string, unknown> | undefined)?.[discriminator] ?? "");
							const selectedSchema = () => optionByValue.get(currentValue()) ?? options[0];
							const selectedDictionary = () => props.dictionary?.variants?.[currentValue()] ?? props.dictionary;
							const children = () => (
								<>
									<Input
										title={childDictionary(props.dictionary, discriminator)?.key ?? discriminator}
										description={childDictionary(props.dictionary, discriminator)?.formFieldDescription ?? ""}
										class="w-full"
									>
										<Select
											value={currentValue()}
											setValue={(value) => {
												const selected = optionByValue.get(value);
												if (selected) field().setValue(createSchemaDefaultValue(selected) as never);
											}}
											options={Array.from(optionByValue.keys()).map((value) => ({
												label: props.dictionary?.variants?.[value]?.key ?? value,
												value,
											}))}
											placeholder={currentValue()}
										/>
									</Input>
									<For each={Object.entries(objectShape(selectedSchema())).filter(([key]) => key !== discriminator)}>
										{([key, childSchema]) => (
											<SchemaFieldNode<TFormData, TRenderData>
												form={props.form}
												name={`${props.name}.${key}`}
												path={`${props.path}.${key}` as FormRendererPath<TRenderData>}
												schema={childSchema}
												dictionary={childDictionary(selectedDictionary(), key)}
												renderers={props.renderers}
												depth={depth() + 1}
											/>
										)}
									</For>
								</>
							);
							const renderFrame = (options?: FormContainerFrameOptions) => (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
								>
									<div class="flex w-full flex-col gap-1 hover:outline-brand-color-2nd p-1 rounded">
										{clearButton()}
										{(options?.children ?? children)()}
									</div>
								</Input>
							);
							return renderContainer("union", children, renderFrame);
						}
						case "enum": {
							const options = enumOptions(unwrapped);
							const enumMap = (props.dictionary as EnumFieldDetail<string> | undefined)?.enumMap ?? {};
							return (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
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
											setValue={(value) => field().setValue(value as never)}
											options={options.map((value) => ({ label: enumMap[value] ?? value, value }))}
											placeholder={field().state.value as string}
										/>
									</Show>
								</Input>
							);
						}
						case "literal":
							return (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
								>
									<div class="text-accent-color bg-area-color w-full rounded p-3">
										{String(field().state.value ?? literalValue(unwrapped) ?? "")}
									</div>
								</Input>
							);
						case "number":
							return (
								<Input
									title={title}
									description={description}
									autocomplete="off"
									type="number"
									id={field().name}
									name={field().name}
									value={(field().state.value ?? "") as number}
									onBlur={field().handleBlur}
									onChange={(event) => {
										const value = event.target.value;
										field().handleChange((value === "" && wrapper.nullable ? null : Number.parseFloat(value)) as never);
									}}
									validationMessage={validationMessage()}
									class={className}
								/>
							);
						case "boolean":
							return (
								<Input
									title={title}
									description={description}
									validationMessage={validationMessage()}
									class={className}
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
						case "record":
						case "unknown":
						case "any":
							return (
								<JsonValueEditor
									title={title}
									description={description}
									value={() => field().state.value}
									setValue={(value) => field().setValue(value as never)}
									validationMessage={validationMessage()}
									class={className}
								/>
							);
						default:
							return (
								<Input
									title={title}
									description={description}
									autocomplete="off"
									type="text"
									id={field().name}
									name={field().name}
									value={(field().state.value ?? "") as string}
									onBlur={field().handleBlur}
									onChange={(event) => field().handleChange(event.target.value as never)}
									validationMessage={validationMessage()}
									class={className}
								/>
							);
					}
				};

				// Field 的 children 只会构造一次；复杂节点的“空态 -> 对象/数组/union”切换
				// 必须通过 memo 重新计算，否则 setValue 已写入 form state，但 UI 分支仍停在创建按钮。
				const defaultNode = createMemo(renderNode);
				const DefaultNode = () => <>{defaultNode()}</>;
				const renderDefault = () => <DefaultNode />;
				const fieldRenderer = getFieldRenderer<TRenderData, TPath>(props.renderers, props.path);
				return fieldRenderer ? fieldRenderer(baseContext(renderDefault)) : <DefaultNode />;
			}}
		</props.form.Field>
	);
}
