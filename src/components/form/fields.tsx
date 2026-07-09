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
import type { EnumFieldDetail, FieldDetail } from "~/locales/type";

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

type StringDeepKeys<TFormData> = Extract<DeepKeys<TFormData>, string>;

/**
 * TanStack Form 的 DeepKeys 使用 `[${number}]` 表达数组项；配置侧额外允许 `[]`。
 * 语义约定：`items` 指数组容器，`items[]` 指数组项；运行时具体下标会被归一化为 `[]` 做匹配。
 */
export type NormalizeArrayPath<TPath extends string> = TPath extends `${infer Head}[${number}]${infer Tail}`
	? `${Head}[]${NormalizeArrayPath<Tail>}`
	: TPath;

export type DenormalizeArrayPath<TPath extends string> = TPath extends `${infer Head}[]${infer Tail}`
	? `${Head}[${number}]${DenormalizeArrayPath<Tail>}`
	: TPath;

export type FormRendererPath<TFormData> =
	StringDeepKeys<TFormData> extends infer TPath extends string ? TPath | NormalizeArrayPath<TPath> : never;

export type FormRendererPathValue<
	TFormData,
	TPath extends string,
> = DenormalizeArrayPath<TPath> extends DeepKeys<TFormData> ? DeepValue<TFormData, DenormalizeArrayPath<TPath>> : never;

type NonNullablePathValue<TFormData, TPath extends FormRendererPath<TFormData>> = NonNullable<
	FormRendererPathValue<TFormData, TPath>
>;

export type FormContainerRendererPath<TFormData> = {
	[TPath in FormRendererPath<TFormData>]: NonNullablePathValue<TFormData, TPath> extends
		| readonly unknown[]
		| Record<string, unknown>
		? TPath
		: never;
}[FormRendererPath<TFormData>];

export type FormRendererRuntimePath<TPath extends string> = DenormalizeArrayPath<TPath>;

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

/**
 * 渲染器配置以实体内的稳定逻辑路径表达；运行中的数组下标只影响 form name，
 * 不应该迫使配置方为第 0、1、2 项分别注册 renderer。
 */
export function normalizeRendererPath(path: string): string {
	return path.replace(/\[\d+\]/g, "[]");
}

export function findRenderer<T>(renderers: Partial<Record<string, T>> | undefined, path: string): T | undefined {
	return renderers?.[path] ?? renderers?.[normalizeRendererPath(path)];
}

export type SchemaWrapperInfo = {
	schema: ZodType;
	nullable: boolean;
	optional: boolean;
	hasDefault: boolean;
};

type SchemaWithPublicParts = ZodType & {
	type: string;
	unwrap?: () => ZodType;
	in?: ZodType;
	shape?: Record<string, ZodType>;
	element?: ZodType;
	options?: readonly ZodType[] | readonly string[];
	values?: Set<unknown>;
	def?: {
		discriminator?: string;
	};
};

export function schemaType(schema: ZodType): string {
	return (schema as SchemaWithPublicParts).type;
}

/**
 * 表单只消费 Zod v4 的公开 schema tree 结构，不把 nullable/default 等 wrapper
 * 当成真实 UI 节点。wrapper 信息单独返回，用于“创建/清空”和默认值生成。
 */
export function unwrapSchema(schema: ZodType): SchemaWrapperInfo {
	let current = schema as SchemaWithPublicParts;
	let nullable = false;
	let optional = false;
	let hasDefault = false;

	while (true) {
		switch (current.type) {
			case "nullable":
				nullable = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "optional":
				optional = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "default":
				hasDefault = true;
				current = current.unwrap?.() as SchemaWithPublicParts;
				continue;
			case "pipe":
				current = current.in as SchemaWithPublicParts;
				continue;
			default:
				return { schema: current, nullable, optional, hasDefault };
		}
	}
}

export function objectShape(schema: ZodType): Record<string, ZodType> {
	return ((schema as SchemaWithPublicParts).shape ?? {}) as Record<string, ZodType>;
}

export function arrayElement(schema: ZodType): ZodType {
	return (schema as SchemaWithPublicParts).element as ZodType;
}

export function unionOptions(schema: ZodType): ZodType[] {
	return ((schema as SchemaWithPublicParts).options ?? []) as ZodType[];
}

export function unionDiscriminator(schema: ZodType): string | undefined {
	return (schema as SchemaWithPublicParts).def?.discriminator;
}

export function literalValue(schema: ZodType): unknown {
	const values = (schema as SchemaWithPublicParts).values;
	return values ? Array.from(values)[0] : undefined;
}

export function enumOptions(schema: ZodType): string[] {
	return ((schema as SchemaWithPublicParts).options ?? []).map(String);
}

export function isComplexType(type: string): boolean {
	return type === "object" || type === "array" || type === "union" || type === "record";
}

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
	switch (schemaType(unwrapped)) {
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
	TFormData extends Record<string, unknown>,
	TRenderData,
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
 */
export function SchemaFieldNode<
	TFormData extends Record<string, unknown>,
	TRenderData extends Record<string, unknown>,
	TPath extends FormRendererPath<TRenderData> = FormRendererPath<TRenderData>,
>(props: SchemaFieldNodeProps<TFormData, TRenderData, TPath>) {
	const depth = () => props.depth ?? 0;

	return (
		<props.form.Field
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
					return renderer
						? renderer({
								...baseContext(renderDefault),
								kind,
								children,
								renderFrame,
							} as FormContainerRendererContext<TRenderData, FormContainerRendererPath<TRenderData>>)
						: renderDefault();
				};

				const renderNode = (): JSX.Element => {
					const wrapper = unwrapSchema(props.schema);
					const unwrapped = wrapper.schema;
					const type = schemaType(unwrapped);
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
