import { For, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import { getZodType } from "~/lib/utils/zod";
import type { Dic, EnumFieldDetail } from "~/locales/type";

export type FieldGenMap<T> = Partial<{
	[K in keyof T]: (data: T, key: K, dictionary: Dic<T>) => JSX.Element;
}>;

export function ObjRender<T extends Record<string, any>>(props: {
	data: T;
	dataSchema: ZodObject<Record<keyof T, ZodType>>;
	dictionary?: Dic<T>;
	hiddenFields?: Array<keyof T>;
	fieldGroupMap?: Record<string, Array<keyof T>>;
	fieldGenerator?: FieldGenMap<T>;
}) {
	return (
		<div class="FieldGroupContainer flex w-full flex-1 flex-col gap-3">
			<Show
				when={"fieldGroupMap" in props}
				fallback={
					<For each={Object.entries(props.data)}>
						{([key, val]) => {
							// 跳过需要隐藏的字段
							if (props.hiddenFields?.includes(key)) return null;
							const fieldName = props.dictionary?.fields[key].key ?? key;
							const fieldValue = val;
							const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];

							// 处理嵌套结构
							if (props.dataSchema?.shape[key].type === "array") {
								const content = Object.entries(val as Record<string, unknown>);
								return props.dictionary && hasGenerator ? (
									props.fieldGenerator?.[key]?.(props.data, key, props.dictionary)
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

							return props.dictionary && hasGenerator ? (
								props.fieldGenerator?.[key]?.(props.data, key, props.dictionary)
							) : (
								<div class="Field flex gap-2">
									<span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
									<span class="font-bold">
										{props.dataSchema?.shape[key].type === "enum"
											? (props.dictionary?.fields[key] as EnumFieldDetail<any>).enumMap[val]
											: String(fieldValue)}
									</span>
									{/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
								</div>
							);
						}}
					</For>
				}
			>
				<For
					each={Object.entries(props.fieldGroupMap!).filter(([_, keys]) =>
						keys.some((key) => !props.hiddenFields?.includes(key)),
					)}
				>
					{([groupName, keys]) => (
						<section class="FieldGroup flex w-full flex-col gap-2">
							<h3 class="text-accent-color flex items-center gap-2 font-bold">
								{groupName}
								<div class="Divider bg-dividing-color h-px w-full flex-1" />
							</h3>
							<div class="Content flex flex-col gap-3 p-1">
								<For each={keys}>
									{(key) => {
										const val = props.data[key];
										const schemaField = props.dataSchema?.shape[key];
										const kind = schemaField ? getZodType(schemaField) : "string";
										const fieldName = props.dictionary?.fields[key].key ?? key;
										let fieldValue = val;
										const hasGenerator = "fieldGenerator" in props && props.fieldGenerator?.[key];
										try {
											fieldValue = (props.dictionary?.fields[key] as EnumFieldDetail<any>).enumMap[
												val
											] as unknown as T[keyof T];
										} catch (error) {}

										// 处理嵌套结构
										if (kind === "object" || kind === "array") {
											const content = Object.entries(val as Record<string, unknown>);
											return props.dictionary && hasGenerator ? (
												props.fieldGenerator?.[key]?.(props.data, key, props.dictionary)
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

										return props.dictionary && hasGenerator ? (
											props.fieldGenerator?.[key]?.(props.data, key, props.dictionary)
										) : (
											<div class="Field flex gap-2">
												<span class="text-main-text-color text-nowrap">{String(fieldName)}</span>:
												<span class="font-bold">{String(fieldValue)}</span>
												{/* <span class="text-dividing-color w-full text-right">{`[${kind}]`}</span> */}
											</div>
										);
									}}
								</For>
							</div>
						</section>
					)}
				</For>
			</Show>
		</div>
	);
}
