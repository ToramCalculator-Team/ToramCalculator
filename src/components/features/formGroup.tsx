import { DB } from "@db/generated/zod/index";
import { createResource, Show, Index, createMemo } from "solid-js";
import { Presence, Motion } from "solid-motionone";
import { DBDataConfig } from "~/routes/(app)/(features)/wiki/dataConfig/dataConfig";
import { setStore, Store, store } from "~/store";
import { Form } from "~/components/dataDisplay/form";
import { getDictionary } from "~/locales/i18n";
import { repositoryMethods } from "@db/generated/repository";

const formDataCache = new Map<string, any>();

/**
 * 获取单个卡片数据，带临时缓存
 */
async function getFormData(type: keyof DB, id: string, forceRefresh: boolean = false) {
  const key = `${type}-${id}`;
  if (!forceRefresh && formDataCache.has(key)) {
    return formDataCache.get(key);
  }
  const data = await repositoryMethods[type].select?.(id);
  formDataCache.set(key, data);
  return data;
}

/**
 * 获取卡片组数据，批量带缓存
 */
async function getFormDatas(formGroup: Store["pages"]["formGroup"], forceRefresh: boolean = false): Promise<any[]> {
  return await Promise.all(formGroup.map(({ type, id }) => getFormData(type, id, forceRefresh)));
}

/**
 * 清空缓存（如需强制刷新全部）
 */
function clearFormDataCache() {
  formDataCache.clear();
}

export const FormGroup = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const [cachedFormDatas, { refetch }] = createResource(
    () => store.pages.formGroup.length, // 不添加length的话，似乎不会追踪到素组元素新增，只会追踪数组本身是否变化
    () => {
      return getFormDatas(store.pages.formGroup);
    },
  );

  return (
    <Presence exitBeforeEnter>
      <Show when={cachedFormDatas()?.length}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
          onClick={() => setStore("pages", "formGroup", (pre) => pre.slice(0, -1))}
        >
          <Index each={cachedFormDatas()}>
            {(formData, index) => {
              const formGroupItem = store.pages.formGroup[index];
              return (
                <Form
                  display={cachedFormDatas()!.length - index < 5}
                  title={
                    formData() && "name" in formData()
                      ? (formData()["name"] as string)
                      : formGroupItem?.type
                        ? dictionary().db[formGroupItem.type].selfName
                        : "" // 关闭时Index还在渲染，可能获取到undefined
                  }
                  index={index}
                  total={cachedFormDatas()!.length}
                >
                  <Show when={formGroupItem?.type}>
                    {(type) => {
                      return DBDataConfig[type()]?.form({
                        dic: dictionary(),
                        data: formData(),
                      });
                    }}
                  </Show>
                </Form>
              );
            }}
          </Index>
        </Motion.div>
      </Show>
    </Presence>
  );
};
