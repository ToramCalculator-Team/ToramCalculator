import type { DB } from "@db/generated/zod/index";
import type { Compilable, Kysely } from "kysely";
import { type Accessor, createMemo, For, Index, type JSX, Show } from "solid-js";
import type { ZodType } from "zod/v4";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import { findRenderer } from "~/lib/utils/rendererPath";
import {
	arrayElement,
	getZodType,
	literalValue,
	objectShape,
	unionDiscriminator,
	unionOptions,
	unwrapSchema,
	type ZodSchemaFor,
} from "~/lib/utils/zod";
import type { Dic, FieldDetail } from "~/locales/type";

export type ObjContainerFrameOptions = {
	/** 只替换容器内部布局，标题和默认外框继续由 ObjRenderer 负责。 */
	children?: () => JSX.Element;
};

export type ObjFieldRendererContext<TData extends object> = {
	/** 根数据用于计算跨字段派生展示；当前字段值仍通过 value 读取。 */
	data: Accessor<TData>;
	/** 配置路径命中后传入实际运行路径；数组项会带有真实下标。 */
	path: string;
	value: Accessor<unknown>;
	schema: ZodType;
	dictionary?: FieldDetail;
	renderDefault: () => JSX.Element;
};

export type ObjContainerRendererContext<TData extends object> = ObjFieldRendererContext<TData> & {
	kind: "object" | "array" | "union";
	children: () => JSX.Element;
	renderFrame: (options?: ObjContainerFrameOptions) => JSX.Element;
};

export type ObjRenderers<TData extends object> = {
	fields?: Record<string, (context: ObjFieldRendererContext<TData>) => JSX.Element>;
	containers?: Record<string, (context: ObjContainerRendererContext<TData>) => JSX.Element>;
};

export interface ObjRendererProps<T extends object> {
	title?: string;
	query: (db: Kysely<DB>) => Compilable<T> | null | undefined;
	dataSchema: ZodSchemaFor<T>;
	dictionary: Dic<T>;
	hiddenFields?: Array<keyof T>;
	fieldGroupMap?: Record<string, Array<keyof T>>;
	renderers?: ObjRenderers<T>;
	before?: (data: Accessor<T | undefined>) => JSX.Element;
	after?: (data: Accessor<T | undefined>) => JSX.Element;
}

function titleFromPath(path: string): string {
	const lastSegment = path.split(".").at(-1) ?? path;
	return lastSegment.replace(/\[(\d+)\]$/, (_match, index: string) => `#${Number(index) + 1}`);
}

function nodeTitle(path: string, dictionary?: FieldDetail): string {
	return dictionary?.key ?? titleFromPath(path);
}

function formatJson(value: unknown): string {
	if (value === undefined) return "";
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}

type SchemaValueNodeProps<TData extends object> = {
	data: Accessor<TData>;
	path: string;
	value: Accessor<unknown>;
	schema: ZodType;
	dictionary?: FieldDetail;
	renderers?: ObjRenderers<TData>;
};

/**
 * 只读 schema tree 的唯一递归入口。
 * 职责：让普通字段、JSON 对象、数组和判别联合共享同一种路径、字典和 renderer 解析规则。
 */
function SchemaValueNode<TData extends object>(props: SchemaValueNodeProps<TData>) {
	const title = () => nodeTitle(props.path, props.dictionary);

	const baseContext = (renderDefault: () => JSX.Element): ObjFieldRendererContext<TData> => ({
		data: props.data,
		path: props.path,
		value: props.value,
		schema: props.schema,
		dictionary: props.dictionary,
		renderDefault,
	});

	const renderContainer = (
		kind: ObjContainerRendererContext<TData>["kind"],
		children: () => JSX.Element,
		renderFrame: (options?: ObjContainerFrameOptions) => JSX.Element,
	) => {
		const renderer = findRenderer(props.renderers?.containers, props.path);
		const renderDefault = () => renderFrame();
		return renderer
			? renderer({
					...baseContext(renderDefault),
					kind,
					children,
					renderFrame,
				})
			: renderDefault();
	};

	const renderNode = (): JSX.Element => {
		const unwrapped = unwrapSchema(props.schema).schema;
		const type = getZodType(unwrapped);
		const value = props.value();

		const renderValue = (displayValue: string) => (
			<div class="Field flex gap-2">
				<span class="text-main-text-color text-nowrap">{title()}</span>:
				<span class="font-bold break-all">{displayValue}</span>
			</div>
		);

		if (value === null || value === undefined) return renderValue(String(value));

		switch (type) {
			case "object": {
				const children = () => (
					<For each={Object.entries(objectShape(unwrapped))}>
						{([key, childSchema]) => (
							<SchemaValueNode
								data={props.data}
								path={`${props.path}.${key}`}
								value={() => (typeof value === "object" ? Reflect.get(value, key) : undefined)}
								schema={childSchema}
								dictionary={props.dictionary?.fields?.[key]}
								renderers={props.renderers}
							/>
						)}
					</For>
				);
				const renderFrame = (options?: ObjContainerFrameOptions) => (
					<div class="Field flex flex-col gap-2">
						<span class="Title text-main-text-color text-nowrap">{title()}</span>
						<div class="List bg-area-color flex flex-col gap-2 rounded-md p-2">{(options?.children ?? children)()}</div>
					</div>
				);
				return renderContainer("object", children, renderFrame);
			}
			case "array": {
				const items = (): unknown[] => {
					const current = props.value();
					return Array.isArray(current) ? current : [];
				};
				const children = () => (
					<Index each={items()}>
						{(item, index) => (
							<SchemaValueNode
								data={props.data}
								path={`${props.path}[${index}]`}
								value={item}
								schema={arrayElement(unwrapped)}
								dictionary={props.dictionary?.item}
								renderers={props.renderers}
							/>
						)}
					</Index>
				);
				const renderFrame = (options?: ObjContainerFrameOptions) => (
					<div class="Field flex flex-col gap-2">
						<span class="Title text-main-text-color text-nowrap">{title()}</span>
						<Show when={options?.children !== undefined || items().length > 0}>
							<div class="List bg-area-color flex flex-col gap-2 rounded-md p-2">
								{(options?.children ?? children)()}
							</div>
						</Show>
					</div>
				);
				return renderContainer("array", children, renderFrame);
			}
			case "union": {
				const discriminator = unionDiscriminator(unwrapped);
				if (!discriminator) {
					return (
						<div class="Field flex flex-col gap-2">
							<span class="Title text-main-text-color text-nowrap">{title()}</span>
							<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(value)}</pre>
						</div>
					);
				}

				const options = unionOptions(unwrapped);
				const optionByValue = new Map(
					options.map((option) => [String(literalValue(objectShape(option)[discriminator])), option]),
				);
				const currentValue = () => {
					const current = props.value();
					return typeof current === "object" && current !== null
						? String(Reflect.get(current, discriminator) ?? "")
						: "";
				};
				const selectedSchema = () => optionByValue.get(currentValue()) ?? options[0];
				const selectedDictionary = () => props.dictionary?.variants?.[currentValue()] ?? props.dictionary;
				const children = () => (
					<For each={selectedSchema() ? Object.entries(objectShape(selectedSchema())) : []}>
						{([key, childSchema]) => (
							<SchemaValueNode
								data={props.data}
								path={`${props.path}.${key}`}
								value={() => {
									const current = props.value();
									return typeof current === "object" && current !== null ? Reflect.get(current, key) : undefined;
								}}
								schema={childSchema}
								dictionary={selectedDictionary()?.fields?.[key]}
								renderers={props.renderers}
							/>
						)}
					</For>
				);
				const renderFrame = (options?: ObjContainerFrameOptions) => (
					<div class="Field flex flex-col gap-2">
						<span class="Title text-main-text-color text-nowrap">{title()}</span>
						<div class="List bg-area-color flex flex-col gap-2 rounded-md p-2">{(options?.children ?? children)()}</div>
					</div>
				);
				return renderContainer("union", children, renderFrame);
			}
			case "record":
			case "unknown":
			case "any":
				return (
					<div class="Field flex flex-col gap-2">
						<span class="Title text-main-text-color text-nowrap">{title()}</span>
						<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(value)}</pre>
					</div>
				);
			case "enum":
				return renderValue(props.dictionary?.enumMap?.[String(value)] ?? String(value));
			case "literal":
				return renderValue(String(value ?? literalValue(unwrapped) ?? ""));
			default:
				return renderValue(String(value));
		}
	};

	// 节点类型可能随 accessor 的值变化，尤其是判别联合；memo 保证默认分支保持响应式。
	const defaultNode = createMemo(renderNode);
	const renderDefault = () => <>{defaultNode()}</>;
	const fieldRenderer = findRenderer(props.renderers?.fields, props.path);
	return fieldRenderer ? fieldRenderer(baseContext(renderDefault)) : renderDefault();
}

export function ObjRenderer<T extends object>(props: ObjRendererProps<T>) {
	// 组件内部处理 live query
	const liveResult = createLiveKyselyQuery(props.query);
	const data = createMemo(() => liveResult.rows()[0]);

	const isFieldHidden = (key: keyof T): boolean => props.hiddenFields?.includes(key) ?? false;
	const visibleFieldGroups = () =>
		Object.entries(props.fieldGroupMap ?? {}).filter(([_, keys]) => keys.some((key) => !isFieldHidden(key)));

	const renderField = (key: keyof T) => {
		if (isFieldHidden(key)) return null;
		const schema = props.dataSchema.shape[key];
		if (!schema) return null;

		return (
			<SchemaValueNode
				data={data}
				path={String(key)}
				value={() => {
					const currentData = data();
					return currentData ? currentData[key] : undefined;
				}}
				schema={schema}
				dictionary={props.dictionary.fields[key]}
				renderers={props.renderers}
			/>
		);
	};

	return (
		<Show
			when={data()}
			fallback={
				<div class="LoadingState flex min-h-32 w-full flex-col items-center justify-center gap-3">
					<p>Loading...</p>
				</div>
			}
		>
			<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
				<Show when={props.title}>
					<div class="Title flex items-center p-2 portrait:p-6">
						<h1 class="FormTitle text-2xl font-black">{props.title ?? props.dictionary.selfName}</h1>
					</div>
				</Show>
				{props.before?.(data)}
				<Show
					when={visibleFieldGroups().length > 0}
					fallback={
						<For each={Object.keys(data() ?? {})}>
							{(key) => {
								// Object.keys 来自 T 的运行时实例，schema 检查会过滤额外属性。
								return renderField(key as keyof T);
							}}
						</For>
					}
				>
					<For each={visibleFieldGroups()}>
						{([groupName, keys]) => (
							<section class="FieldGroup flex w-full flex-col gap-2">
								<h3 class="text-accent-color flex items-center gap-2 font-bold">
									{groupName}
									<div class="Divider bg-dividing-color h-px w-full flex-1" />
								</h3>
								<div class="Content flex flex-col gap-3 p-1">
									<For each={keys}>{(key) => renderField(key)}</For>
								</div>
							</section>
						)}
					</For>
				</Show>
				{props.after?.(data)}
			</div>
		</Show>
	);
}
