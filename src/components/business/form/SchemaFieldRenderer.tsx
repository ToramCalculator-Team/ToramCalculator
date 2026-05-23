import type { AnyFieldApi, DeepKeys } from "@tanstack/solid-form";
import { createMemo, For, Index, Show } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Toggle } from "~/components/controls/toggle";
import { fieldInfo } from "~/components/dataDisplay/utils";
import type { EnumFieldDetail, FieldDetail } from "~/locales/type";
import { JsonValueEditor } from "./JsonValueEditor";
import {
	type FormContainerFrameOptions,
	type FormContainerRendererContext,
	type FormContainerRendererPath,
	type FormFieldRendererContext,
	type FormRendererFormApi,
	type FormRendererPath,
	type FormRendererPathValue,
	type FormRendererRuntimePath,
	type FormRenderers,
	findRenderer,
} from "./rendererTypes";
import {
	arrayElement,
	createSchemaDefaultValue,
	enumOptions,
	isComplexType,
	literalValue,
	objectShape,
	schemaType,
	unionDiscriminator,
	unionOptions,
	unwrapSchema,
} from "./schemaTree";

export {
	type FormContainerFrameOptions,
	type FormContainerRendererContext,
	type FormContainerRendererPath,
	type FormFieldRendererContext,
	type FormRendererFormApi,
	type FormRendererPath,
	type FormRendererPathValue,
	type FormRendererRuntimePath,
	type FormRenderers,
	hasFieldRenderer,
	normalizeRendererPath,
} from "./rendererTypes";
export { createSchemaDefaultValue } from "./schemaTree";

// 顶层字段沿用原表单的分隔样式；嵌套节点使用更紧凑的无分隔布局。
export const DefaultFieldClass = "border-dividing-color border-t pt-3 w-full";

function titleFromPath(path: string): string {
	const lastSegment = path.split(".").at(-1) ?? path;
	return lastSegment.replace(/\[(\d+)\]$/, (_match, index: string) => ` #${Number(index) + 1}`);
}

function nodeTitle(path: string, dictionary?: FieldDetail): string {
	return dictionary?.key ?? titleFromPath(path);
}

function nodeClass(depth: number): string {
	return depth === 0 ? DefaultFieldClass : "w-full";
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
								<Button
									class="w-full"
									onClick={() => field().setValue(createSchemaDefaultValue(unwrapped) as never)}
								>
									创建
								</Button>
							</Input>
						);
					}

					const clearButton = () => (
						<Show when={wrapper.nullable || wrapper.optional}>
							<Button
								onClick={() => field().setValue((wrapper.nullable ? null : undefined) as never)}
							>
								清空
							</Button>
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
									<div class="flex w-full flex-col gap-3">
										<div class="flex justify-end">{clearButton()}</div>
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
											<div class="border-dividing-color flex w-full flex-col gap-2 rounded border p-2">
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
									<div class="flex w-full flex-col gap-3">
										<div class="flex justify-end">{clearButton()}</div>
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
									<div class="flex w-full flex-col gap-3">
										<div class="flex justify-end">{clearButton()}</div>
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
