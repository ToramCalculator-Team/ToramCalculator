import type {
	DeepKeys,
	DeepValue,
	FormAsyncValidateOrFn,
	FormValidateOrFn,
	SolidFormExtendedApi,
} from "@tanstack/solid-form";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodType } from "zod/v4";
import type { FieldDetail } from "~/locales/type";

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

export function hasFieldRenderer<TFormData>(renderers: FormRenderers<TFormData> | undefined, path: string): boolean {
	return !!findRenderer(renderers?.fields as Partial<Record<string, unknown>> | undefined, path);
}
