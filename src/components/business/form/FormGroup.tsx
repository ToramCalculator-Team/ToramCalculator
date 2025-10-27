/**
 * 表单组组件
 * 
 * 用于展示DB内的数据，form是特化的form
 */
import { DB, DBSchema } from "@db/generated/zod/index";
import { createResource, Show, Index, createMemo } from "solid-js";
import { Presence, Motion } from "solid-motionone";
import { DBDataConfig } from "~/routes/(app)/(features)/wiki/dataConfig/dataConfig";
import { setStore, Store, store } from "~/store";
import { Form } from "~/components/dataDisplay/form";
import { getDictionary } from "~/locales/i18n";
import { repositoryMethods } from "@db/generated/repositories";
import { DBForm } from "./Form";


export const FormGroup = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const formDatas = createMemo(() => {
    console.log(store.pages.formGroup.length);
    return store.pages.formGroup.map(({ data }) => data)
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={formDatas()?.length}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
          onClick={() => setStore("pages", "formGroup", (pre) => pre.slice(0, -1))}
        >
          <Index each={formDatas()}>
            {(formData, index) => {
              const formGroupItem = store.pages.formGroup[index];
              return (
                <DBForm
                  tableName={formGroupItem.type}
                  initialValue={formData() as any}
                  dataSchema={DBSchema[formGroupItem.type]}
                  dictionary={dictionary().db[formGroupItem.type]}
                  hiddenFields={[]}
                  fieldGroupMap={{}}
                  onSubmit={(values) => repositoryMethods[formGroupItem.type].insert?.(values as any) ?? undefined}
                >
                </DBForm>
              );
            }}
          </Index>
        </Motion.div>
      </Show>
    </Presence>
  );
};
