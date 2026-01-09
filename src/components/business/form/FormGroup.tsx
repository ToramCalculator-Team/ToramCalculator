/**
 * 表单组组件
 *
 * 用于展示DB内的数据，form是特化的form
 */

import { defaultData } from "@db/defaultData";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import { repositoryMethods } from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import { Index, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { store } from "~/store";
import { DBForm } from "./DBFormRenderer";
import { FormSheet } from "./FormSheet";

export const FormGroup = () => {
	return (
		<Presence exitBeforeEnter>
			{/* 此处包装是为了最后一层消失时先展示动画 */}
			<Show when={store.pages.formGroup.length > 0}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class={`SheetBox fixed top-0 left-0 z-50 h-dvh w-dvw`}
				>
					<Index each={store.pages.formGroup}>
						{(formData, index) => {
							const formGroupItem = store.pages.formGroup[index];
							const config = DATA_CONFIG[formGroupItem.type];
							const initialValue = formData().data as DB[typeof formGroupItem.type];
							return (
								<FormSheet display={true} index={index} total={store.pages.formGroup.length}>
									<Show when={config}>
										{(config) => (
											<DBForm
												tableName={formGroupItem.type}
												initialValue={initialValue}
												dataSchema={DBSchema[formGroupItem.type]}
												// @ts-expect-error-next-line
												// config 是联合类型（所有表配置的并集），TS 无法自动断言为与 DBForm<T> 的 T 匹配,
												// Array<keyof DB[T]> 会将联合展开为 Array<keyof DB[表1]> | Array<keyof DB[表2]> | ...；Array<type1> 和 Array<type2> 不兼容。
												hiddenFields={config()?.form.hiddenFields}
												// @ts-expect-error-next-line  问题同上，暂时忽略
												fieldGroupMap={config().fieldGroupMap}
												fieldGenerator={config().form.fieldGenerator}
												onSubmit={(value) => {
													if (formData()) {
														const primaryKeyFields = getPrimaryKeys(formGroupItem.type);
														const primaryKeyValue = value[primaryKeyFields[0] as keyof typeof value];
														console.log("主键值：", primaryKeyValue);
														if (primaryKeyValue === defaultData[primaryKeyFields[0] as keyof typeof defaultData]) {
															repositoryMethods[formGroupItem.type].insert?.(value as any);
														} else {
															repositoryMethods[formGroupItem.type].update?.(String(primaryKeyValue), value as any);
														}
													} else {
														repositoryMethods[formGroupItem.type].insert?.(value as any);
													}
												}}
											></DBForm>
										)}
									</Show>
								</FormSheet>
							);
						}}
					</Index>
				</Motion.div>
			</Show>
		</Presence>
	);
};
