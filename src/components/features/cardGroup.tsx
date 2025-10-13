import { DB } from "@db/generated/kysely/kysely";
import { createResource, Show, Index, createMemo } from "solid-js";
import { Portal } from "solid-js/web";
import { Presence, Motion } from "solid-motionone";
import { DBDataConfig } from "~/routes/(app)/(features)/wiki/dataConfig/dataConfig";
import { setStore, store } from "~/store";
import { Card } from "../containers/card";
import { getDictionary } from "~/locales/i18n";
import { Transaction } from "kysely";
import { repositoryMethods } from "@db/generated/repository";

interface CardGroupItem {
  type: keyof DB;
  id: string;
}

const cardDataCache = new Map<string, any>();

/**
 * 获取单个卡片数据，带临时缓存
 */
async function getCardData(
  type: keyof DB,
  id: string,
  forceRefresh: boolean = false,
) {
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
async function getCardDatas(cardGroup: CardGroupItem[], forceRefresh: boolean = false): Promise<any[]> {
  return await Promise.all(cardGroup.map(({ type, id }) => getCardData(type, id, forceRefresh)));
}

/**
 * 清空缓存（如需强制刷新全部）
 */
function clearCardDataCache() {
  cardDataCache.clear();
}

export const CardGroup = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const [cachedCardDatas, { refetch }] = createResource(
    () => store.pages.cardGroup,
    (cardGroup) => getCardDatas(cardGroup),
  );

  return (
    <Portal>
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
                return (
                  <Card
                    display={cachedCardDatas()!.length - index < 5}
                    title={
                      cardData() && "name" in cardData()
                        ? (cardData()["name"] as string)
                        : dictionary().db[store.pages.cardGroup[index]?.type as keyof DB].selfName
                    }
                    index={index}
                    total={cachedCardDatas()!.length}
                  >
                    <Show when={store.pages.cardGroup[index]?.type}>
                      {(type) => {
                        return DBDataConfig[type() as keyof typeof DBDataConfig]?.card({
                          dic: dictionary(),
                          data: cardData(),
                        });
                      }}
                    </Show>
                  </Card>
                );
              }}
            </Index>
          </Motion.div>
        </Show>
      </Presence>
    </Portal>
  );
};
