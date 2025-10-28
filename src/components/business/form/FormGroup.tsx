/**
 * 表单组组件
 *
 * 用于展示DB内的数据，form是特化的form
 */
import { DB, DBSchema } from "@db/generated/zod/index";
import { createResource, Show, Index, createMemo } from "solid-js";
import { Presence, Motion } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { setStore, Store, store } from "~/store";
import { Form } from "~/components/dataDisplay/form";
import { getDictionary } from "~/locales/i18n";
import { repositoryMethods } from "@db/generated/repositories";
import { DBForm } from "./DBFormRenderer";
import { Sheet } from "~/components/containers/sheet";
import { FormSheet } from "./FormSheet";
import { getPrimaryKeyFields } from "@db/generated/database-schema";

export const FormGroup = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const formDatas = createMemo(() => {
    console.log(store.pages.formGroup.length);
    return store.pages.formGroup.map(({ data }) => data);
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={formDatas()?.length}>
        <Motion.div
          animate={{ opacity: [0, 1] }}
          exit={{ opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SheetBox bg-primary-color-90 fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row-reverse portrait:flex-col-reverse`}
          onClick={() => setStore("pages", "formGroup", (pre) => pre.slice(0, -1))}
        >
          <Index each={formDatas()}>
            {(formData, index) => {
              const formGroupItem = store.pages.formGroup[index];
              const config = DATA_CONFIG[formGroupItem.type];
              return (
                <FormSheet display={true} index={index} total={formDatas()?.length}>
                  <Show when={config}>
                    {(config) => (
                      <DBForm
                        tableName={formGroupItem.type}
                        initialValue={formData() as any}
                        dataSchema={DBSchema[formGroupItem.type]}
                        dictionary={dictionary().db[formGroupItem.type]}
                        // @ts-ignore-next-line
                        // config 是联合类型（所有表配置的并集），TS 无法自动断言为与 DBForm<T> 的 T 匹配,
                        // Array<keyof DB[T]> 会将联合展开为 Array<keyof DB[表1]> | Array<keyof DB[表2]> | ...；Array<type1> 和 Array<type2> 不兼容。
                        hiddenFields={config()?.form.hiddenFields}
                        // @ts-ignore-next-line  问题同上，暂时忽略
                        fieldGroupMap={config().fieldGroupMap}
                        fieldGenerator={config().form.fieldGenerator}
                        onSubmit={(values) => {
                          if (formData()) {
                            const primaryKeyFields = getPrimaryKeyFields(formGroupItem.type);
                            repositoryMethods[formGroupItem.type].update?.(values[primaryKeyFields[0] as keyof typeof values], values as any)
                          } else {
                            repositoryMethods[formGroupItem.type].insert?.(values as any)
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
