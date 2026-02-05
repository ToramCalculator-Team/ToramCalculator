/**
 * 表单组组件
 *
 * 用于展示DB内的数据，form是特化的form
 */
import { repositoryMethods } from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import { Index, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { setStore, store } from "~/store";
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
					class={`FormGroup fixed top-0 left-0 z-50 h-dvh w-dvw`}
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
												childrenRelations={config().childrenRelations}
												hiddenFields={config()?.form.hiddenFields}
												fieldGroupMap={config().fieldGroupMap}
												fieldGenerator={config().form.fieldGenerator}
												onInsert={async (value) => {
													const result = await repositoryMethods[formGroupItem.type].insert?.(value as any);
													// 打印结果并关闭表单
													console.log("插入结果：", result);
													setStore("pages", "formGroup", (pre) => pre.slice(0, -1));
												}}
												onUpdate={async (primaryKeyValue, value) => {
													const result = await repositoryMethods[formGroupItem.type].update?.(
														primaryKeyValue,
														value as any,
													);
													// 打印结果并关闭表单
													console.log("更新结果：", result);
													setStore("pages", "formGroup", (pre) => pre.slice(0, -1));
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
