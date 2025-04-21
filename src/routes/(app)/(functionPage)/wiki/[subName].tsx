import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { Button } from "~/components/controls/button";
import { Portal } from "solid-js/web";
import { Dialog } from "~/components/controls/dialog";
import { LoadingBar } from "~/components/loadingBar";
import { defaultData } from "~/../db/defaultData";
import { DB } from "~/../db/kysely/kyesely";
import { WikiPageConfig } from "./utils";
import { mobPageConfig } from "./mob/config";
import { Form } from "~/components/module/form";
import { VirtualTable } from "~/components/module/virtualTable";

export default function WikiPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // url 参数
  const params = useParams();
  const subName = params.subName;
  // 状态管理参数
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
  const [pageConfig, setPageConfig] = createSignal<WikiPageConfig<keyof DB>>(mobPageConfig(dictionary));

  // 地址有效性判断
  if (subName in defaultData) {
    const wikiType = subName as keyof DB;

    // card
    // 1. 等待 store.database.tableSyncState[wikiType] 为 true
    const readyDataId = createMemo(() => {
      if (store.database.tableSyncState[wikiType] && store.wiki[wikiType]?.id) {
        return store.wiki[wikiType].id;
      }
      return undefined; // 未就绪返回 undefined，createResource 将忽略
    });

    // 2. 异步加载wiki表 数据，仅当 readyDataId 有值时才触发 fetch
    const [cardData, { refetch: refetchCardData }] = createResource(readyDataId, pageConfig().card.dataFetcher);

    const dialogContet = createMemo(() => {
      switch (store.wiki[wikiType]?.dialogType) {
        case "form":
          return Form({
            tableName: pageConfig().tableName,
            defaultItem: pageConfig().form.defaultData,
            item: pageConfig().form.data,
            itemSchema: pageConfig().form.dataSchema,
            formHiddenFields: pageConfig().form.hiddenFields,
            fieldGenerator: pageConfig().form.fieldGenerator,
            createItem: pageConfig().form.createData,
            refetchItemList: pageConfig().form.refetchItemList,
          });
        case "card":
          return <></>;
      }
    });

    switch (wikiType) {
      case "_armorTocrystal":
      case "_avatarTocharacter":
      case "_BackRelation":
      case "_campA":
      case "_campB":
      case "_characterToconsumable":
      case "_crystalTooption":
      case "_crystalToplayer_armor":
      case "_crystalToplayer_option":
      case "_crystalToplayer_special":
      case "_crystalToplayer_weapon":
      case "_crystalTospecial":
      case "_crystalToweapon":
      case "_FrontRelation":
      case "_mobTozone":
      case "account":
      case "account_create_data":
      case "account_update_data":
      case "activity":
      case "address":
      case "armor":
      case "avatar":
      case "character":
      case "character_skill":
      case "combo":
      case "combo_step":
      case "consumable":
      case "crystal":
      case "drop_item":
      case "image":
      case "item":
      case "material":
      case "member":
      case "mercenary":
      case "mob":
      case "npc":
      case "option":
      case "player":
      case "player_armor":
      case "player_option":
      case "player_pet":
      case "player_special":
      case "player_weapon":
      case "post":
      case "recipe":
      case "recipe_ingredient":
      case "session":
      case "simulator":
      case "skill":
      case "skill_effect":
      case "special":
      case "statistic":
      case "task":
      case "task_collect_require":
      case "task_kill_requirement":
      case "task_reward":
      case "team":
      case "user":
      case "verification_token":
      case "weapon":
      case "world":
      case "zone":
      default:
        break;
    }

    onMount(() => {
      console.log(`--${wikiType} Page Mount`);
    });

    onCleanup(() => {
      console.log(`--${wikiType} Page Unmount`);
    });

    return (
      <Show
        when={store.database.tableSyncState[wikiType]}
        fallback={
          <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
            <LoadingBar class="w-1/2 min-w-[320px]" />
            <h1 class="animate-pulse">awaiting DB-{wikiType} sync...</h1>
          </div>
        }
      >
        <Presence exitBeforeEnter>
          <Show when={!isTableFullscreen()}>
            <Motion.div
              class="Title hidden flex-col p-3 lg:flex lg:pt-12"
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            >
              <div class="Content flex flex-row items-center justify-between gap-4 py-3">
                <h1 class="Text lg: text-left text-[2.5rem] leading-[50px] lg:bg-transparent lg:leading-[48px]">
                  {dictionary().db[wikiType].selfName}
                </h1>
                <input
                  id="DataSearchBox"
                  type="search"
                  placeholder={dictionary().ui.searchPlaceholder}
                  class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                />
                <Button // 仅移动端显示
                  size="sm"
                  icon={<Icon.Line.CloudUpload />}
                  class="flex lg:hidden"
                  onClick={() => {
                    setStore("wiki", wikiType, {
                      dialogType: "form",
                      dialogIsOpen: true,
                    });
                  }}
                ></Button>
                <Button // 仅PC端显示
                  icon={<Icon.Line.CloudUpload />}
                  class="hidden lg:flex"
                  onClick={() => {
                    setStore("wiki", wikiType, {
                      dialogType: "form",
                      dialogIsOpen: true,
                    });
                  }}
                >
                  {dictionary().ui.actions.add}
                </Button>
              </div>
            </Motion.div>
          </Show>
        </Presence>
        <Presence exitBeforeEnter>
          <Show when={!isTableFullscreen()}>
            <Motion.div
              class="Banner hidden h-[260px] flex-initial gap-3 p-3 opacity-0 lg:flex"
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: [1, 0] }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            >
              <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
                <For each={[0, 1, 2]}>
                  {(_, index) => {
                    const brandColor = {
                      1: "1st",
                      2: "2nd",
                      3: "3rd",
                    }[1 + (index() % 3)];
                    return (
                      <div
                        class={`Banner-${index} flex-none overflow-hidden rounded border-2 ${activeBannerIndex() === index() ? "active shadow-card shadow-dividing-color border-primary-color" : "border-transparent"}`}
                        onMouseEnter={() => setActiveBannerIndex(index())}
                        style={{
                          // "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                          "background-position": "center center",
                        }}
                      >
                        <div
                          class={`mask ${activeBannerIndex() === index() ? `bg-brand-color-${brandColor}` : `bg-area-color`} text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex`}
                        >
                          <span
                            class={`text-3xl font-bold ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                          >
                            TOP.{index() + 1}
                          </span>
                          <div
                            class={`h-[1px] w-[110px] ${activeBannerIndex() === index() ? `bg-primary-color` : `bg-accent-color`}`}
                          ></div>
                          <span
                            class={`text-xl ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                          >
                            {"name" in defaultData[wikiType] ? pageConfig().table.dataList?.latest?.[index()].name : ""}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Motion.div>
          </Show>
        </Presence>
        <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
          <div class="TableModule flex flex-1 flex-col overflow-hidden">
            <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
              <div class={`Text text-xl ${isTableFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
                {dictionary().db[wikiType].selfName}
              </div>
              <div
                class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isTableFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
              >
                {dictionary().db[wikiType].description}
              </div>
              <Button
                level="quaternary"
                onClick={() => {
                  setTableFilterIsOpen(!tableFilterIsOpen());
                }}
              >
                <Icon.Line.Filter />
              </Button>
              <Button
                level="quaternary"
                onClick={() => {
                  setIsTableFullscreen(!isTableFullscreen());
                }}
              >
                {isTableFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
              </Button>
            </div>
            <VirtualTable
              tableName={pageConfig().tableName}
              dataList={pageConfig().table.dataList}
              dataDic={dictionary().db[wikiType]}
              tableColumns={pageConfig().table.columnDef}
              tableHiddenColumns={pageConfig().table.hiddenColumnDef}
              tableTdGenerator={pageConfig().table.tdGenerator}
              filterIsOpen={tableFilterIsOpen}
              setFilterIsOpen={setTableFilterIsOpen}
            />
          </div>
          <Presence exitBeforeEnter>
            <Show when={!isTableFullscreen()}>
              <Motion.div
                animate={{ opacity: [0, 1] }}
                exit={{ opacity: 0 }}
                class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
              >
                <div class="Title flex h-12 text-xl">{dictionary().ui.mob.news.title}</div>
                <div class="Content flex flex-1 flex-col gap-3">
                  <For each={[0, 1, 2]}>
                    {() => {
                      return <div class="Item bg-area-color h-full w-full flex-1 rounded"></div>;
                    }}
                  </For>
                </div>
              </Motion.div>
            </Show>
          </Presence>
        </div>

        <Portal>
          <Dialog
            state={store.wiki.mob?.dialogIsOpen ?? false}
            setState={(state: boolean) => setStore("wiki", "mob", "dialogIsOpen", state)}
          >
            {dialogContet()}
          </Dialog>
        </Portal>
      </Show>
    );
  }

  const navigate = useNavigate();
  navigate(`/404`);
}
