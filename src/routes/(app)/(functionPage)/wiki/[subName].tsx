import { useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
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
import { mobPageConfig } from "./subPageConfig/mobPageConfig";
import { Form } from "~/components/module/form";
import { VirtualTable } from "~/components/module/virtualTable";
import { skillPageConfig } from "./subPageConfig/skilPageConfig";

export default function WikiSubPage() {
  // const start = performance.now();
  // console.log("WikiSubPage start", start);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // url 参数
  const params = useParams();
  const navigate = useNavigate();

  // 状态管理参数
  const [tableName, setTableName] = createSignal<keyof DB>("mob");
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
  const [cardId, setCardId] = createSignal<string | undefined>(undefined);
  const [virtualTable, setVirtualTable] = createSignal<JSX.Element>();
  const [form, setForm] = createSignal<JSX.Element>();
  const [pageConfig, setPageConfig] = createSignal<WikiPageConfig<any>>(mobPageConfig());
  const [cardData, { refetch: refetchCardData }] = createResource(cardId, pageConfig().card.dataFetcher);

  createEffect(
    on(
      () => params.subName,
      () => {
        // const start = performance.now();
        // console.log("Effect start", start);
        // console.log("Url参数：", params.subName);
        if (params.subName in defaultData) {
          const wikiType = params.subName as keyof DB;
          // 初始化页面状态
          setIsTableFullscreen(false);
          setActiveBannerIndex(0);
          setTableFilterIsOpen(false);
          if (store.database.tableSyncState[wikiType] && store.wiki[wikiType]?.id) {
            setCardId(store.wiki[wikiType].id);
          } else {
            setCardId(undefined);
          }
          switch (wikiType) {
            case "_armorTocrystal":
              {
              }
              break;
            case "_avatarTocharacter":
              {
              }
              break;
            case "_BackRelation":
              {
              }
              break;
            case "_campA":
              {
              }
              break;
            case "_campB":
              {
              }
              break;
            case "_characterToconsumable":
              {
              }
              break;
            case "_crystalTooption":
              {
              }
              break;
            case "_crystalToplayer_armor":
              {
              }
              break;
            case "_crystalToplayer_option":
              {
              }
              break;
            case "_crystalToplayer_special":
              {
              }
              break;
            case "_crystalToplayer_weapon":
              {
              }
              break;
            case "_crystalTospecial":
              {
              }
              break;
            case "_crystalToweapon":
              {
              }
              break;
            case "_FrontRelation":
              {
              }
              break;
            case "_mobTozone":
              {
              }
              break;
            case "account":
              {
              }
              break;
            case "account_create_data":
              {
              }
              break;
            case "account_update_data":
              {
              }
              break;
            case "activity":
              {
              }
              break;
            case "address":
              {
              }
              break;
            case "armor":
              {
              }
              break;
            case "avatar":
              {
              }
              break;
            case "character":
              {
              }
              break;
            case "character_skill":
              {
              }
              break;
            case "combo":
              {
              }
              break;
            case "combo_step":
              {
              }
              break;
            case "consumable":
              {
              }
              break;
            case "crystal":
              {
              }
              break;
            case "drop_item":
              {
              }
              break;
            case "image":
              {
              }
              break;
            case "item":
              {
              }
              break;
            case "material":
              {
              }
              break;
            case "member":
              {
              }
              break;
            case "mercenary":
              {
              }
              break;
            case "mob":
              {
                setTableName("mob");
                setPageConfig(mobPageConfig());
              }
              break;
            case "npc":
              {
              }
              break;
            case "option":
              {
              }
              break;
            case "player":
              {
              }
              break;
            case "player_armor":
              {
              }
              break;
            case "player_option":
              {
              }
              break;
            case "player_pet":
              {
              }
              break;
            case "player_special":
              {
              }
              break;
            case "player_weapon":
              {
              }
              break;
            case "post":
              {
              }
              break;
            case "recipe":
              {
              }
              break;
            case "recipe_ingredient":
              {
              }
              break;
            case "session":
              {
              }
              break;
            case "simulator":
              {
              }
              break;
            case "skill":
              {
                setTableName("skill");
                setPageConfig(skillPageConfig());
              }
              break;
            case "skill_effect":
              {
              }
              break;
            case "special":
              {
              }
              break;
            case "statistic":
              {
              }
              break;
            case "task":
              {
              }
              break;
            case "task_collect_require":
              {
              }
              break;
            case "task_kill_requirement":
              {
              }
              break;
            case "task_reward":
              {
              }
              break;
            case "team":
              {
              }
              break;
            case "user":
              {
              }
              break;
            case "verification_token":
              {
              }
              break;
            case "weapon":
              {
              }
              break;
            case "world":
              {
              }
              break;
            case "zone":
              {
              }
              break;
            default:
              break;
          }
          setVirtualTable(
            VirtualTable({
              tableName: pageConfig().tableName,
              dataList: pageConfig().table.dataList,
              defaultSort: pageConfig().table.defaultSort,
              tableColumns: pageConfig().table.columnDef,
              tableHiddenColumns: pageConfig().table.hiddenColumnDef,
              tableTdGenerator: pageConfig().table.tdGenerator,
              filterIsOpen: tableFilterIsOpen,
              setFilterIsOpen: setTableFilterIsOpen,
            }),
          );
          setForm(
            Form({
              tableName: pageConfig().tableName,
              defaultItem: pageConfig().form.defaultData,
              item: pageConfig().form.data,
              itemSchema: pageConfig().form.dataSchema,
              formHiddenFields: pageConfig().form.hiddenFields,
              fieldGenerator: pageConfig().form.fieldGenerator,
              createItem: pageConfig().form.createData,
              refetchItemList: pageConfig().form.refetchItemList,
            }),
          );
        } else {
          navigate(`/404`);
        }
        // console.log("Effect end", performance.now() - start);
      },
    ),
  );

  onMount(() => {
    console.log(`--Wiki Page Mount`);
  });

  onCleanup(() => {
    console.log(`--Wiki Page Unmount`);
  });

  return (
    <Show
      when={store.database.tableSyncState[tableName()]}
      fallback={
        <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
          <LoadingBar class="w-1/2 min-w-[320px]" />
          <h1 class="animate-pulse">awaiting DB-{tableName()} sync...</h1>
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
                {dictionary().db[tableName()].selfName}
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
                  setStore("wiki", tableName(), {
                    dialogType: "form",
                    dialogIsOpen: true,
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setStore("wiki", tableName(), {
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
                          {/* {"name" in defaultData[tableName()] ? pageConfig().table.dataList?.latest?.[index()].name : ""} */}
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
              {dictionary().db[tableName()].selfName}
            </div>
            <div
              class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isTableFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().db[tableName()].description}
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
          {virtualTable()}
        </div>
        <Presence exitBeforeEnter>
          <Show when={!isTableFullscreen()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
            >
              <div class="Title flex h-12 text-xl">{dictionary().ui.wiki.news.title}</div>
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
          state={store.wiki[tableName()]?.dialogIsOpen ?? false}
          setState={(state: boolean) => setStore("wiki", tableName(), "dialogIsOpen", state)}
        >
          <Show when={store.wiki[tableName()]?.dialogType === "form"} fallback={<></>}>
            {form()}
          </Show>
        </Dialog>
      </Portal>
    </Show>
  );
}
