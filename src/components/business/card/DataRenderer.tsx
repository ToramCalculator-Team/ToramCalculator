import { createResource, createSignal, For, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary"
import type { Dic, EnumFieldDetail } from "~/locales/type";
import { setStore } from "~/store";

export type DataRendererProps<T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>> = {
	// 数据名称
	tableName: string;
	// 数据值
	data: T;
	// 数据Schema
	dataSchema: TSchema;
	// 主键
	primaryKey: keyof T;
	// 字典
	dictionary: Dic<T>;
	// 隐藏字段
	hiddenFields?: Array<keyof T>;
	// 字段分组
	fieldGroupMap?: Record<string, Array<keyof T>>;
	// 字段生成器
	fieldGenerator?:Partial<{
		[K in keyof T]: (data: T, key: K, dictionary: Dic<T>) => JSX.Element
	}>;
	// 删除回调
	deleteCallback: (id: string) => Promise<T | undefined>;
	// 编辑回调
	openEditor: (data: T) => void;
	// 编辑权限计算回调
	editAbleCallback: (data: T) => Promise<boolean>;
	// 前置内容，通常是卡片数据控制器
	before?: (
		data: T,
		setData: (data: T) => void,
	) => JSX.Element;
	// 后置内容，通常是外键关联数据弹出按钮组
	after?: JSX.Element;
};

export function DataRenderer<T extends Record<string, unknown>, TSchema extends ZodObject<{ [K in keyof T]: ZodType }>>(props: DataRendererProps<T, TSchema>) {
	// UI文本字典
	const dictionary = useDictionary();

	// 类似怪物这样的数据，需要根据显示时的额外配置来决定卡片展示数据实际情况，因此需要额外控制
	const [data, setData] = createSignal<T>(props.data);
	const [canEdit] = createResource(async () => props.editAbleCallback(data()));

	const isGroupdHidden = (groupName: string) => {
		let isHidden = false;
		// 当group内的field都被隐藏时，group也隐藏
		const fields = props.fieldGroupMap?.[groupName];
		isHidden = fields?.every((fieldName) => props.hiddenFields?.some((hiddenField) => hiddenField === fieldName)) ?? false;
		// console.log("组可见性", groupName, !isHidden);
		return isHidden;
	};

	const fieldRenderer = (key: keyof T, val: T[typeof key]) => {
		if (props.hiddenFields?.some((hiddenField) => hiddenField === key)) return null;
		const fieldName = props.dictionary.fields[key].key ?? key;
		const fieldValue = val;
		const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

		// 处理嵌套结构
		if (props.dataSchema.shape[key].type === "array") {
			const content = Object.entries(val as Record<string, unknown>);
			return hasGenerator ? (
				props.fieldGenerator?.[key]?.(data(), key, props.dictionary)
			) : (
				<div class="Field flex flex-col gap-2">
					<span class="Title text-main-text-color text-nowrap">{String(fieldName)}</span>
					<Show when={content.length > 0}>
						<div class="List bg-area-color rounded-md p-2">
							<For each={content}>
								{([key, val]) => (
									<div class="Field flex gap-1">
										<span class="text-boundary-color w-3 text-sm text-nowrap">{key}</span>
										&nbsp;:&nbsp;
										<span class="text-sm text-nowrap">{String(val)}</span>
									</div>
								)}
							</For>
						</div>
					</Show>
				</div>
			);
		}

		return hasGenerator ? (
			props.fieldGenerator?.[key]?.(data(), key, props.dictionary)
		) : (
			<div class="Field flex gap-2">
				<span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
				<span class="font-bold">
					{props.dataSchema.shape[key].type === "enum"
						? (props.dictionary.fields[key] as EnumFieldDetail<any>).enumMap[val]
						: String(fieldValue)}
				</span>
				{/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
			</div>
		);
	};

	return (
		<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
			<div class="Image bg-area-color h-[18vh] w-full rounded"></div>
			{/* 前置内容 */}
			<Show when={props.before}>
				{(before) => before()(data(), setData)}
			</Show>
			{/* 主内容 */}
			<Show
				when={"fieldGroupMap" in props && Object.keys(props.fieldGroupMap ?? {}).length > 0}
				fallback={
					<For each={Object.entries(data())}>
						{([key, val]) => fieldRenderer(key as keyof T, val as T[keyof T])}
					</For>
				}
			>
				<For each={Object.entries(props.fieldGroupMap ?? {})}>
					{([groupName, keys]) => {
						// console.log("------------当前组:", groupName);
						if (isGroupdHidden(groupName)) return null;
						return (
							<section class="FieldGroup flex w-full flex-col gap-2">
								<h3 class="text-accent-color flex items-center gap-2 font-bold">
									{groupName}
									<div class="Divider bg-dividing-color h-px w-full flex-1" />
								</h3>
								<div class="Content flex flex-col gap-3 p-1">
									<For each={keys}>{(key) => <>{fieldRenderer(key, data()[key])}</>}</For>
								</div>
							</section>
						);
					}}
				</For>
			</Show>
			{/* 后置内容 */}
			{props.after}
			{/* 操作按钮 */}
			<Show when={canEdit()}>
				<section class="FunFieldGroup flex w-full flex-col gap-2">
					<h3 class="text-accent-color flex items-center gap-2 font-bold">
						{dictionary().ui.actions.operation}
						<div class="Divider bg-dividing-color h-px w-full flex-1" />
					</h3>
					<div class="FunGroup flex gap-1">
						<Button
							class="w-fit"
							icon={<Icons.Outline.Trash />}
							onclick={async () => {
								// 执行删除方法
								props.deleteCallback(data()[props.primaryKey] as string);
								// 关闭当前卡片
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
							}}
						/>
						<Button
							class="w-fit"
							icon={<Icons.Outline.Edit />}
							onclick={() => {
								// 关闭当前卡片
								setStore("pages", "cardGroup", (pre) => pre.slice(0, -1));
								// 打开表单
								props.openEditor(data());
							}}
						/>
					</div>
				</section>
			</Show>
		</div>
	);
}
