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
  useContext,
} from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { Button } from "~/components/controls/button";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/controls/sheet";
import { LoadingBar } from "~/components/loadingBar";
import { defaultData } from "~/../db/defaultData";
import { DB } from "~/../db/kysely/kyesely";
import { DBdataDisplayConfig } from "./utils";
import { mobDataConfig } from "./dataConfig/mobDataConfig";
import { Form } from "~/components/module/form";
import { VirtualTable } from "~/components/module/virtualTable";
import { skillDataConfig } from "./dataConfig/skillDataConfig";
import { MediaContext } from "~/contexts/Media";
import { ObjDisplayer } from "~/components/module/objectDisplayer";
import { ObjRender } from "~/components/module/objRender";
import { FieldDetail } from "~/locales/type";
import { VisibilityState } from "@tanstack/solid-table";
import { Dialog } from "~/components/controls/dialog";
import { MobDifficultyFlag } from "../../../../../db/kysely/enums";
import { generateBossDataByFlag } from "~/lib/mob";

export default function WikiSubPage() {
  // const start = performance.now();
  // console.log("WikiSubPage start", start);
  const media = useContext(MediaContext);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // url 参数
  const params = useParams();
  const navigate = useNavigate();

  // 状态管理参数
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);

  const [tableName, setTableName] = createSignal<keyof DB>();
  const [dataConfig, setDataConfig] = createSignal<DBdataDisplayConfig<any, any>>();

  const [virtualTable, setVirtualTable] = createSignal<JSX.Element>();
  const [wikiSelectorIsOpen, setWikiSelectorIsOpen] = createSignal(false);

  // form
  const [form, setForm] = createSignal<JSX.Element>();
  const [formSheetIsOpen, setFormSheetIsOpen] = createSignal(false);

  // table
  const [tableFilterInputRef, setTableFilterInputRef] = createSignal<HTMLInputElement>();
  const [tableGlobalFilterStr, setTableGlobalFilterStr] = createSignal<string>("");
  const [tableColumnVisibility, setTableColumnVisibility] = createSignal<VisibilityState>({});
  const [tableConfigSheetIsOpen, setTableConfigSheetIsOpen] = createSignal(false);

  // card
  const [cardGroupIsOpen, setCardGroupIsOpen] = createSignal(false);
  const [cardDataIds, setCardDataIds] = createSignal<string[]>([]);
  const [cardDatas, { refetch: refetchCardDatas }] = createResource(cardDataIds, async (ids) => {
    const results: (object | undefined)[] = [];
    for (const id of ids) {
      results.push(await dataConfig()?.card.dataFetcher(id));
    }
    console.log("time", Date.now());
    return results;
  });
  const [cardGroup, setCardGroup] = createSignal<JSX.Element>();
  createEffect(() => {
    if (!cardGroupIsOpen()) {
      console.log("清空卡牌组数据");
      setCardDataIds([]);
    }
  });

  createEffect(
    on(
      () => params.subName,
      () => {
        // const start = performance.now();
        // console.log("Effect start", start);
        console.log("Url参数：", params.subName);
        if (params.subName in defaultData) {
          const wikiType = params.subName as keyof DB;
          // 初始化页面状态
          setIsTableFullscreen(false);
          setActiveBannerIndex(0);
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
                setDataConfig(mobDataConfig);
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
                setDataConfig(skillDataConfig);
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
          const validDataConfig = dataConfig();
          if (validDataConfig) {
            setVirtualTable(
              VirtualTable({
                dataFetcher: validDataConfig.table.dataFetcher,
                columnsDef: validDataConfig.table.columnDef,
                hiddenColumnDef: validDataConfig.table.hiddenColumnDef,
                tdGenerator: validDataConfig.table.tdGenerator,
                defaultSort: validDataConfig.table.defaultSort,
                globalFilterStr: tableGlobalFilterStr,
                dictionary: dictionary().db[wikiType],
                columnVisibility: tableColumnVisibility(),
                onColumnVisibilityChange: (updater) => {
                  if (typeof updater === "function") {
                    setTableColumnVisibility((prev) => (prev ? updater(prev) : updater({})));
                  } else {
                    setTableColumnVisibility(() => updater);
                  }
                },
                columnHandleClick: (id) => {
                  setCardDataIds((pre) => [...pre, id]);
                  setCardGroupIsOpen(true);
                },
              }),
            );
            setForm(
              Form({
                data: validDataConfig.form.data,
                dataSchema: validDataConfig.form.dataSchema,
                hiddenFields: validDataConfig.form.hiddenFields,
                fieldGenerator: validDataConfig.form.fieldGenerator,
                title: dictionary().db[wikiType].selfName,
                dictionary: dictionary().db[wikiType],
              }),
            );
          }
        } else {
          navigate(`/404`);
        }
        // console.log("Effect end", performance.now() - start);
      },
    ),
  );

  const wikiSelectorConfig: {
    groupName: string;
    groupFields: {
      name: keyof DB;
      icon: JSX.Element;
    }[];
  }[] = [
    {
      groupName: dictionary().ui.wiki.selector.groupName.combat,
      groupFields: [
        {
          name: "mob",
          icon: <Icon.Filled.Browser />,
        },
        {
          name: "skill",
          icon: <Icon.Filled.Basketball />,
        },
        {
          name: "weapon",
          icon: <Icon.Filled.Box2 />,
        },
        {
          name: "armor",
          icon: <Icon.Filled.Category2 />,
        },
        {
          name: "option",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "special",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "crystal",
          icon: <Icon.Filled.Layers />,
        },
      ],
    },
    {
      groupName: dictionary().ui.wiki.selector.groupName.daily,
      groupFields: [
        {
          name: "address",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "npc",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "consumable",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "material",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "task",
          icon: <Icon.Filled.Layers />,
        },
        {
          name: "activity",
          icon: <Icon.Filled.Layers />,
        },
        
      ],
    },
  ];

  onMount(() => {
    console.log(`--Wiki Page Mount`);
  });

  onCleanup(() => {
    console.log(`--Wiki Page Unmount`);
  });

  return (
    <Show when={tableName()} fallback={"init"}>
      {(validTableName) => (
        <Show when={dataConfig()}>
          {(validDataConfig) => (
            <Show
              when={store.database.tableSyncState[validTableName()]}
              fallback={
                <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
                  <LoadingBar class="w-1/2 min-w-[320px]" />
                  <h1 class="animate-pulse">awaiting DB-{validTableName()} sync...</h1>
                </div>
              }
            >
              <Presence exitBeforeEnter>
                <Show when={!isTableFullscreen()}>
                  <Motion.div
                    class="Title flex flex-col lg:pt-12 landscape:p-3"
                    animate={{ opacity: [0, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  >
                    <div class="Content flex flex-row items-center justify-between gap-4 px-6 py-0 lg:px-0 lg:py-3">
                      <h1
                        onClick={() => setWikiSelectorIsOpen((pre) => !pre)}
                        class="Text cursor-pointer flex items-center gap-3 text-left text-2xl font-black lg:bg-transparent lg:text-[2.5rem] lg:leading-[48px] lg:font-normal"
                      >
                        {dictionary().db[validTableName()].selfName}
                        <Icon.Line.Swap />
                      </h1>
                      <input
                        id="DataSearchBox"
                        type="search"
                        placeholder={dictionary().ui.searchPlaceholder}
                        class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color hidden h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:block lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                      />
                      <Button // 仅移动端显示
                        size="sm"
                        icon={<Icon.Line.InfoCircle />}
                        class="flex bg-transparent lg:hidden"
                        onClick={() => {}}
                      ></Button>
                      <Button // 仅PC端显示
                        icon={<Icon.Line.CloudUpload />}
                        class="hidden lg:flex"
                        onClick={() => {
                          setFormSheetIsOpen(true);
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
                            <Presence exitBeforeEnter>
                              <Show when={!isTableFullscreen()}>
                                <Motion.div
                                  class={`Banner-${index} flex-none overflow-hidden rounded border-2 ${activeBannerIndex() === index() ? "active shadow-card shadow-dividing-color border-primary-color" : "border-transparent"}`}
                                  onMouseEnter={() => setActiveBannerIndex(index())}
                                  style={{
                                    // "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                                    "background-position": "center center",
                                  }}
                                  animate={{
                                    opacity: [0, 1],
                                    transform: ["scale(0.9)", "scale(1)"],
                                  }}
                                  exit={{
                                    opacity: [1, 0],
                                    transform: ["scale(1)", "scale(0.9)"],
                                  }}
                                  transition={{
                                    duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                    delay: index() * 0.05,
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
                                      {/* {"name" in defaultData[tableName()] ? dataConfig().table.dataList?.latest?.[index()].name : ""} */}
                                    </span>
                                  </div>
                                </Motion.div>
                              </Show>
                            </Presence>
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
                    <div class={`Text px-6 text-xl`}>{dictionary().db[validTableName()].selfName}</div>
                    <div
                      class={`Description ${!isTableFullscreen() ? "opacity-0" : "opacity-100"} bg-area-color flex-1 rounded p-3`}
                    >
                      {dictionary().db[validTableName()].description}
                    </div>
                    <Button
                      level="quaternary"
                      icon={isTableFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
                      onClick={() => {
                        setIsTableFullscreen((pre) => !pre);
                      }}
                    />
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
                          {(_, index) => {
                            return (
                              <Motion.div
                                class="Item bg-area-color h-full w-full flex-1 rounded"
                                animate={{
                                  opacity: [0, 1],
                                  transform: ["scale(0.9)", "scale(1)"],
                                }}
                                exit={{
                                  opacity: [1, 0],
                                  transform: ["scale(1)", "scale(0.9)"],
                                }}
                                transition={{
                                  duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                  delay: index() * 0.05,
                                }}
                              ></Motion.div>
                            );
                          }}
                        </For>
                      </div>
                    </Motion.div>
                  </Show>
                </Presence>
              </div>

              <Presence exitBeforeEnter>
                <Show when={isTableFullscreen() || media.width < 1024}>
                  <Motion.div
                    class="Control bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex w-1/2 min-w-80 gap-1 rounded p-1 lg:min-w-2xl landscape:bottom-6"
                    animate={{
                      opacity: [0, 1],
                      transform: ["translateX(-50%)", "translateX(-50%)"],
                    }}
                    exit={{ opacity: 0, transform: "translateX(-50%)" }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  >
                    <Button
                      size="sm"
                      class="bg-transparent"
                      icon={<Icon.Line.CloudUpload />}
                      onClick={() => {
                        setFormSheetIsOpen(true);
                      }}
                    ></Button>
                    <input
                      id="filterInput"
                      ref={setTableFilterInputRef}
                      type="text"
                      placeholder={dictionary().ui.actions.filter}
                      value={tableGlobalFilterStr()}
                      tabIndex={1}
                      onInput={(e) => {
                        setTableGlobalFilterStr(e.target.value);
                      }}
                      class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden landscape:flex landscape:bg-transparent dark:mix-blend-normal"
                    />
                    <Button
                      size="sm"
                      class="bg-transparent"
                      onclick={() => {
                        setTableConfigSheetIsOpen((pre) => !pre);
                      }}
                      icon={<Icon.Line.Settings />}
                    />
                  </Motion.div>
                </Show>
              </Presence>
              <Portal>
                <Sheet state={formSheetIsOpen()} setState={setFormSheetIsOpen}>
                  {form()}
                </Sheet>
              </Portal>

              <Portal>
                <Show when={cardDatas.state === "ready"} fallback={"..."}>
                  <For each={cardDatas()}>
                    {(cardData, index) => {
                      if(!cardData) return null;
                      const [mobDifficultyFlag, setMobDifficultyFlag] = createSignal<MobDifficultyFlag>(MobDifficultyFlag.Easy);
                      // 这里的退出动画存在缺失
                      return (
                        <Dialog
                          state={cardGroupIsOpen()}
                          setState={setCardGroupIsOpen}
                          title={
                            "name" in cardData
                              ? (cardData["name"] as string)
                              : dictionary().db[validTableName()].selfName
                          }
                        >
                          {ObjRender({
                            data: cardData,
                            dictionary: dictionary().db[validTableName()],
                            dataSchema: validDataConfig().card.dataSchema,
                            deepHiddenFields: validDataConfig().card.deepHiddenFields,
                            fieldGroupMap: validDataConfig().card.fieldGroupMap,
                            fieldGenerator: validDataConfig().card.fieldGenerator,
                          })}
                        </Dialog>
                      );
                    }}
                  </For>
                </Show>
              </Portal>

              <Portal>
                <Dialog
                  state={tableConfigSheetIsOpen()}
                  setState={setTableConfigSheetIsOpen}
                  title={dictionary().ui.wiki.tableConfig.title}
                >
                  <div class="flex h-52 w-2xs flex-col gap-3"></div>
                </Dialog>
              </Portal>

              <Portal>
                <Dialog
                  state={wikiSelectorIsOpen()}
                  setState={setWikiSelectorIsOpen}
                  title={dictionary().ui.wiki.selector.title}
                >
                  <div class="flex flex-col gap-3">
                    <For each={wikiSelectorConfig}>
                      {(group, index) => {
                        return (
                          <div class="Group flex flex-col gap-2">
                            <div class="GroupTitle flex flex-col gap-3">
                              <h3 class="text-accent-color flex items-center gap-2 font-bold">
                                {group.groupName}
                                <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
                              </h3>
                            </div>
                            <div class="GroupContent flex flex-wrap gap-2">
                              <For each={group.groupFields}>
                                {(field, index) => {
                                  return (
                                    <a
                                      href={`/wiki/${field.name}`}
                                      class="border-dividing-color flex w-[calc(33.333333%-8px)] items-center flex-col gap-2 rounded border px-2 py-3"
                                    >
                                      {field.icon}
                                      <span class="text-nowrap overflow-ellipsis">{dictionary().db[field.name].selfName}</span>
                                    </a>
                                  );
                                }}
                              </For>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Dialog>
              </Portal>
            </Show>
          )}
        </Show>
      )}
    </Show>
  );
}
