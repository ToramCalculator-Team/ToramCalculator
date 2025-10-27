/**
 * 卡片组组件
 *
 * 用于展示DB内的数据，card是特化的dialog
 */
import { DB, DBSchema } from "@db/generated/zod/index";
import { createResource, Show, Index, createMemo, createEffect, createSignal, JSX, on } from "solid-js";
import { Presence, Motion } from "solid-motionone";
import { type WikiConfig, wikiConfig } from "~/routes/(app)/(features)/wiki/wikiConfig";
import { setStore, Store, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import { repositoryMethods } from "@db/generated/repositories";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { Card } from "./Card";
import { DBdataRenderer } from "./DBdataRenderer";

const cardDataCache = new Map<string, any>();

/**
 * 获取单个卡片数据，带临时缓存
 */
async function getCardData(type: keyof DB, id: string, forceRefresh: boolean = false) {
  const key = `${type}-${id}`;
  if (!forceRefresh && cardDataCache.has(key)) {
    return cardDataCache.get(key);
  }
  const data = await repositoryMethods[type].select?.(id);
  cardDataCache.set(key, data);
  return data;
}

/**
 * 获取卡片组数据，批量带缓存
 */
async function getCardDatas(cardGroup: Store["pages"]["cardGroup"], forceRefresh: boolean = false): Promise<any[]> {
  return await Promise.all(cardGroup.map(({ type, id }) => getCardData(type, id, forceRefresh)));
}

export const CardGroup = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const [cachedCardDatas, { refetch }] = createResource(
    () => store.pages.cardGroup.length, // 不添加length的话，似乎不会追踪到素组元素新增，只会追踪数组本身是否变化
    () => {
      return getCardDatas(store.pages.cardGroup);
    },
  );

  return (
    <Presence exitBeforeEnter>
      <Show when={cachedCardDatas()?.length}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
          onClick={() => setStore("pages", "cardGroup", (pre) => pre.slice(0, -1))}
        >
          <Index each={cachedCardDatas()}>
            {(cardData, index) => {
              const cardGroupItem = store.pages.cardGroup[index];
              return (
                <Card
                  display={cachedCardDatas()!.length - index < 5}
                  title={cardData()?.name ?? dictionary().db[cardGroupItem.type].selfName}
                  index={index}
                  total={cachedCardDatas()!.length}
                >
                  <Show when={cardData()} fallback={<pre>{JSON.stringify(cardData(), null, 2)}</pre>}>
                    {(cardData) => (
                      <DBdataRenderer
                        data={cardData()}
                        dataSchema={DBSchema[cardGroupItem.type]}
                        dictionary={dictionary().db[cardGroupItem.type]}
                        hiddenFields={wikiConfig[cardGroupItem.type]?.card.hiddenFields}
                        fieldGroupMap={wikiConfig[cardGroupItem.type]?.fieldGroupMap}
                        fieldGenerator={wikiConfig[cardGroupItem.type]?.card.fieldGenerator}
                      />
                    )}
                  </Show>
                </Card>
              );
            }}
          </Index>
        </Motion.div>
      </Show>
    </Presence>
  );
};
