import { A, useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Index,
  JSX,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
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
import { dataDisplayConfig } from "./dataConfig/dataConfig";
import { VirtualTable } from "~/components/module/virtualTable";
import { MediaContext } from "~/contexts/Media";
import { Dialog } from "~/components/controls/dialog";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { DBDataConfig } from "./dataConfig/dataConfig";
import { Decorate } from "~/components/icon";
import { setWikiStore, wikiStore } from "./store";
import { getCardDatas } from '~/utils/cardDataCache';

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
  const [isMainContentFullscreen, setIsMainContentFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);

  const [dataConfig, setDataConfig] = createSignal<dataDisplayConfig<any, any, any>>();

  const [wikiSelectorIsOpen, setWikiSelectorIsOpen] = createSignal(false);

  const [cachedCardDatas, { refetch }] = createResource(
    () => wikiStore.cardGroup,
    (cardGroup) => getCardDatas(cardGroup)
  );

  // 监听url参数变化, 初始化页面状态
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
          setWikiStore("type", wikiType);
          setWikiStore("table", {
            globalFilterStr: "",
            columnVisibility: {},
            configSheetIsOpen: false,
          });
          setWikiStore("form", {
            data: undefined,
            isOpen: false,
          });
          setIsMainContentFullscreen(false);
          setActiveBannerIndex(0);
          setDataConfig(DBDataConfig[wikiType]);
        } else {
          navigate(`/404`);
        }
        // console.log("Effect end", performance.now() - start);
      },
    ),
  );

  // wiki 选择器(弹出层)配置
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
          name: "zone",
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
    <Show when={dataConfig()}>
      {(validDataConfig) => (
        <Show
          when={store.database.tableSyncState[wikiStore.type]}
          fallback={
            <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
              <LoadingBar class="w-1/2 min-w-[320px]" />
              <h1 class="animate-pulse">awaiting DB-{wikiStore.type} sync...</h1>
            </div>
          }
        >
          {/* 标题 */}
          <Presence exitBeforeEnter>
            <Show when={!isMainContentFullscreen()}>
              <Motion.div
                class="Title flex flex-col lg:pt-12 landscape:p-3"
                animate={{ opacity: [0, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
              >
                <div class="Content flex flex-row items-center justify-between gap-4 px-6 py-0 lg:px-0 lg:py-3">
                  <h1
                    onClick={() => setWikiSelectorIsOpen((pre) => !pre)}
                    class="Text flex cursor-pointer items-center gap-3 text-left text-2xl font-black lg:bg-transparent lg:text-[2.5rem] lg:leading-[48px] lg:font-normal"
                  >
                    {dictionary().db[wikiStore.type].selfName}
                    <Icon.Line.Swap />
                  </h1>
                  <input
                    id="DataSearchBox"
                    type="search"
                    placeholder={dictionary().ui.searchPlaceholder}
                    class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color hidden h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:block lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                    onInput={(e) => {
                      setWikiStore("table", {
                        globalFilterStr: e.target.value,
                      });
                    }}
                  />
                  <Button // 仅移动端显示
                    size="sm"
                    icon={<Icon.Line.InfoCircle />}
                    class="flex bg-transparent lg:hidden"
                    onClick={() => {}}
                  ></Button>
                  <Show when={store.session.user.id}>
                    <Button // 仅PC端显示
                      icon={<Icon.Line.CloudUpload />}
                      class="hidden lg:flex"
                      onClick={() => {
                        setWikiStore("form", {
                          isOpen: true,
                        });
                      }}
                    >
                      {dictionary().ui.actions.add}
                    </Button>
                  </Show>
                </div>
              </Motion.div>
            </Show>
          </Presence>

          {/* 轮播图 */}
          <Presence exitBeforeEnter>
            <Show when={!isMainContentFullscreen()}>
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
                          <Show when={!isMainContentFullscreen()}>
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

          {/* 表格和新闻 */}
          <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
            <div class="TableModule flex flex-1 flex-col overflow-hidden">
              <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
                <div class={`Text px-6 text-xl`}>{dictionary().db[wikiStore.type].selfName}</div>
                <div
                  class={`Description ${!isMainContentFullscreen() ? "opacity-0" : "opacity-100"} bg-area-color flex-1 rounded p-3`}
                >
                  {dictionary().db[wikiStore.type].description}
                </div>
                <Button
                  level="quaternary"
                  icon={isMainContentFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
                  onClick={() => {
                    setIsMainContentFullscreen((pre) => !pre);
                  }}
                />
              </div>
              <Show
                when={validDataConfig().main}
                fallback={VirtualTable({
                  dataFetcher: validDataConfig().table.dataFetcher,
                  columnsDef: validDataConfig().table.columnsDef,
                  hiddenColumnDef: validDataConfig().table.hiddenColumnDef,
                  tdGenerator: validDataConfig().table.tdGenerator,
                  defaultSort: validDataConfig().table.defaultSort,
                  dictionary: validDataConfig().table.dictionary(dictionary()),
                  globalFilterStr: () => wikiStore.table.globalFilterStr,
                  columnHandleClick: (id) => setWikiStore("cardGroup", (pre) => [...pre, { type: wikiStore.type, id }]),
                  columnVisibility: wikiStore.table.columnVisibility,
                  onColumnVisibilityChange: (updater) => {
                    if (typeof updater === "function") {
                      setWikiStore("table", {
                        columnVisibility: updater(wikiStore.table.columnVisibility),
                      });
                    }
                  },
                })}
              >
                {validDataConfig().main?.(dictionary(), (id) =>
                  setWikiStore("cardGroup", (pre) => [...pre, { type: wikiStore.type, id }]),
                )}
              </Show>
            </div>
            <Presence exitBeforeEnter>
              <Show when={!isMainContentFullscreen()}>
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

          {/* 控制栏 */}
          <Presence exitBeforeEnter>
            <Show when={isMainContentFullscreen() || media.width < 1024}>
              <Motion.div
                class="Control bg-primary-color shadow-dividing-color shadow-dialog absolute bottom-3 left-1/2 z-10 flex w-1/2 min-w-80 gap-1 rounded p-1 lg:min-w-2xl landscape:bottom-6"
                animate={{
                  opacity: [0, 1],
                  transform: ["translateX(-50%)", "translateX(-50%)"],
                }}
                exit={{ opacity: 0, transform: "translateX(-50%)" }}
                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
              >
                <Show when={store.session.user.id}>
                  <Button
                    size="sm"
                    class="bg-transparent"
                    icon={<Icon.Line.CloudUpload />}
                    onClick={() => {
                      setWikiStore("form", {
                        isOpen: true,
                      });
                    }}
                  ></Button>
                </Show>
                <input
                  id="filterInput"
                  type="text"
                  placeholder={dictionary().ui.actions.filter}
                  value={wikiStore.table.globalFilterStr}
                  tabIndex={1}
                  onInput={(e) => {
                    setWikiStore("table", {
                      globalFilterStr: e.target.value,
                    });
                  }}
                  class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden landscape:flex landscape:bg-transparent dark:mix-blend-normal"
                />
                <Button
                  size="sm"
                  class="bg-transparent"
                  onclick={() => {
                    setWikiStore("table", {
                      configSheetIsOpen: !wikiStore.table.configSheetIsOpen,
                    });
                  }}
                  icon={<Icon.Line.Settings />}
                />
              </Motion.div>
            </Show>
          </Presence>

          {/* 表单 */}
          <Portal>
            <Sheet state={wikiStore.form.isOpen} setState={(state) => setWikiStore("form", { isOpen: state })}>
              {validDataConfig().form({
                data: wikiStore.form.data,
                dic: dictionary(),
              })}
            </Sheet>
          </Portal>

          {/* 卡片组 */}
          <Portal>
            <Presence exitBeforeEnter>
              <Show when={cachedCardDatas()?.length}>
                <Motion.div
                  animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
                  exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
                  transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
                  onClick={() => setWikiStore("cardGroup", (pre) => pre.slice(0, -1))}
                >
                  <Index each={cachedCardDatas()}>
                    {(cardData, index) => {
                      return (
                        <Show when={cachedCardDatas()!.length - index < 5}>
                          <Motion.div
                            animate={{
                              transform: [
                                `rotate(0deg)`,
                                `rotate(${(cachedCardDatas()!.length - index - 1) * 2}deg)`,
                              ],
                              opacity: [0, 1],
                            }}
                            exit={{
                              transform: [
                                `rotate(${(cachedCardDatas()!.length - index - 1) * 2}deg)`,
                                `rotate(0deg)`,
                              ],
                              opacity: [1, 0],
                            }}
                            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                            class="DialogBox drop-shadow-dividing-color bg-primary-color fixed top-1/2 left-1/2 z-10 flex h-[70vh] w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded p-2 drop-shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              "z-index": `${index}`,
                            }}
                          >
                            <Show when={wikiStore.cardGroup[index]?.type}>
                              {(type) => {
                                return (
                                  <>
                                    <div class="DialogTitle drop-shadow-dividing-color absolute -top-3 z-10 flex items-center drop-shadow-xl">
                                      <svg
                                        width="30"
                                        height="48"
                                        viewBox="0 0 30 48"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M13.8958 -6.07406e-07L-1.04907e-06 24L13.8958 48L29 48L29 -1.26763e-06L13.8958 -6.07406e-07Z"
                                          fill="rgb(var(--primary))"
                                        />
                                        <path
                                          d="M19 6.99999L9 24L19 41L29 41L29 6.99999L19 6.99999Z"
                                          fill="currentColor"
                                        />
                                        <path
                                          d="M29.5 3.49999L29.5 44.5L16.2109 44.5L16.0664 44.249L4.56641 24.249L4.42285 24L4.56641 23.751L16.0664 3.75097L16.2109 3.49999L29.5 3.49999Z"
                                          stroke="currentColor"
                                          stroke-opacity="0.55"
                                        />
                                      </svg>

                                      <div class="bg-primary-color z-10 -mx-[1px] py-[3px]">
                                        <div class="border-boundary-color border-y py-[3px]">
                                          <h1 class="text-primary-color bg-accent-color py-[3px] text-xl font-bold">
                                            {cardData() && "name" in cardData()
                                              ? (cardData()["name"] as string)
                                              : dictionary().db[type()].selfName}
                                          </h1>
                                        </div>
                                      </div>
                                      <svg
                                        width="30"
                                        height="48"
                                        viewBox="0 0 30 48"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M16.1042 -6.07406e-07L30 24L16.1042 48L0.999998 48L1 -1.26763e-06L16.1042 -6.07406e-07Z"
                                          fill="rgb(var(--primary))"
                                        />
                                        <path
                                          d="M0.500063 3.49999L0.500061 44.5L13.7891 44.5L13.9337 44.249L25.4337 24.249L25.5772 24L25.4337 23.751L13.9337 3.75097L13.7891 3.49999L0.500063 3.49999Z"
                                          stroke="currentColor"
                                          stroke-opacity="0.55"
                                        />
                                        <path
                                          d="M11 6.99999L21 24L11 41L1.00003 41L1.00003 6.99999L11 6.99999Z"
                                          fill="currentColor"
                                        />
                                      </svg>
                                    </div>
                                    <div class="Content flex h-full w-full justify-center overflow-hidden">
                                      <div class="Left z-10 flex flex-none flex-col">
                                        <Decorate class="" />
                                        <div class="Divider bg-boundary-color ml-1 h-full w-[1px] flex-1 rounded-full"></div>
                                        <Decorate class="-scale-y-100" />
                                      </div>
                                      <div class="Center -mx-10 flex w-full flex-1 flex-col items-center">
                                        <div
                                          class="Divider bg-boundary-color mt-1 h-[1px] w-full rounded-full"
                                          style={{
                                            width: "calc(100% - 80px)",
                                          }}
                                        ></div>

                                        <OverlayScrollbarsComponent
                                          element="div"
                                          options={{ scrollbars: { autoHide: "scroll" } }}
                                          class="border-primary-color h-full w-full flex-1 rounded border-8"
                                        >
                                          <div class="Childern mx-3 my-6 flex flex-col gap-3">
                                            {DBDataConfig[type()]?.card({
                                              dic: dictionary(),
                                              data: cardData(),
                                            })}
                                          </div>
                                        </OverlayScrollbarsComponent>
                                        <div
                                          class="Divider bg-boundary-color mb-1 h-[1px] w-full rounded-full"
                                          style={{
                                            width: "calc(100% - 80px)",
                                          }}
                                        ></div>
                                      </div>
                                      <div class="Right z-10 flex flex-none -scale-x-100 flex-col">
                                        <Decorate />
                                        <div class="Divider bg-boundary-color ml-1 h-full w-[1px] flex-1 rounded-full"></div>
                                        <Decorate class="-scale-y-100" />
                                      </div>
                                    </div>
                                  </>
                                );
                              }}
                            </Show>
                          </Motion.div>
                        </Show>
                      );
                    }}
                  </Index>
                </Motion.div>
              </Show>
            </Presence>
          </Portal>

          {/* 表格配置 */}
          <Portal>
            <Dialog
              state={wikiStore.table.configSheetIsOpen}
              setState={(state) => setWikiStore("table", { configSheetIsOpen: state })}
              title={dictionary().ui.wiki.tableConfig.title}
            >
              <div class="flex h-52 w-2xs flex-col gap-3"></div>
            </Dialog>
          </Portal>

          {/* wiki选择器 */}
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
                                <A
                                  href={`/wiki/${field.name}`}
                                  onClick={() => {
                                    setWikiSelectorIsOpen(false);
                                  }}
                                  class="border-dividing-color flex w-[calc(33.333333%-8px)] flex-col items-center gap-2 rounded border px-2 py-3"
                                >
                                  {field.icon}
                                  <span class="text-nowrap overflow-ellipsis">
                                    {dictionary().db[field.name].selfName}
                                  </span>
                                </A>
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
  );
}
