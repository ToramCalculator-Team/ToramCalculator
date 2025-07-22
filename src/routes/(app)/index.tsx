import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
  useContext,
  on,
  Index,
} from "solid-js";
import { MetaProvider, Title } from "@solidjs/meta";
import * as _ from "lodash-es";
import { useMachine } from "@xstate/solid";
import { indexPageMachine } from "../../machines/indexPageMachine";

import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { Button } from "~/components/controls/button";
import { Filing } from "~/components/module/filing";

import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { useNavigate } from "@solidjs/router";
import { dictionary } from "~/locales/type";
import { DB } from "../../../db/generated/kysely/kyesely";
import { MediaContext } from "~/contexts/Media";
import { setStore, store } from "~/store";
import { LoginDialog } from "~/components/module/loginDialog";
import { LoadingBar } from "~/components/loadingBar";
import { Portal } from "solid-js/web";
import { DBDataConfig } from "./(functionPage)/wiki/dataConfig/dataConfig";
import { searchAllTables } from "~/routes/(app)/search";
import { Decorate } from "~/components/icon";
import { setWikiStore, wikiStore } from "./(functionPage)/wiki/store";
import { getCardDatas } from "~/utils/cardDataCache";

type Result = DB[keyof DB];

type FinalResult = Partial<Record<keyof DB, Result[]>>;

export default function IndexPage() {
  let searchButtonRef!: HTMLButtonElement;
  let searchInputRef!: HTMLInputElement;

  const navigate = useNavigate();

  // 使用 @xstate/solid 的 useMachine 管理状态
  const [state, send] = useMachine(indexPageMachine);
  const context = () => state.context;

  const media = useContext(MediaContext);

  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 页面附加功能（右上角按钮组）配置
  const [extraFunctionConfig] = createSignal<
    {
      onClick: () => void;
      icon: JSX.Element;
    }[]
  >([
    {
      onClick: () => {
        navigate("queryBuilder");
      },
      icon: <Icon.Line.Basketball />,
    },
    {
      onClick: () => setStore("theme", store.theme == "dark" ? "light" : "dark"),
      icon: <Icon.Line.Light />,
    },
    {
      onClick: () => setStore("settingsDialogState", !store.settingsDialogState),
      icon: <Icon.Line.Settings />,
    },
  ]);

  type CustomMenuConfig = {
    groupType: "wiki" | "appPages";
    title: keyof dictionary["db"] | keyof dictionary["ui"]["nav"];
    icon: keyof typeof Icon.Filled;
  };

  // 自定义首页导航配置
  const [customMenuConfig] = createSignal<{
    top: CustomMenuConfig[];
    all: CustomMenuConfig[];
  }>({
    top: [
      {
        groupType: "wiki",
        title: "mob",
        icon: "Browser",
      },
      {
        groupType: "wiki",
        title: "skill",
        icon: "Basketball",
      },
      {
        groupType: "wiki",
        title: "weapon",
        icon: "Category2",
      },
      {
        groupType: "wiki",
        title: "crystal",
        icon: "Box2",
      },
      {
        groupType: "appPages",
        title: "character",
        icon: "User",
      },
      {
        groupType: "appPages",
        title: "simulator",
        icon: "Gamepad",
      },
    ],
    all: [
      {
        groupType: "wiki",
        title: "mob",
        icon: "Browser",
      },
      {
        groupType: "wiki",
        title: "skill",
        icon: "Basketball",
      },
      {
        groupType: "wiki",
        title: "weapon",
        icon: "Category2",
      },
      {
        groupType: "wiki",
        title: "crystal",
        icon: "Box2",
      },
      {
        groupType: "wiki",
        title: "player_pet",
        icon: "Heart",
      },
      {
        groupType: "wiki",
        title: "item",
        icon: "Layers",
      },
      {
        groupType: "appPages",
        title: "character",
        icon: "User",
      },
      {
        groupType: "appPages",
        title: "simulator",
        icon: "Gamepad",
      },
    ],
  });

  const [cachedCardDatas, { refetch }] = createResource(
    () => wikiStore.cardGroup,
    (cardGroup) => getCardDatas(cardGroup),
  );

  // 事件分发函数
  const handleSearchInput = (e: Event & { target: HTMLInputElement }) => {
    send({ type: "SEARCH_INPUT_CHANGE", value: e.target.value });
  };

  const handleSearch = () => {
    send({ type: "SEARCH_SUBMIT" });
  };

  const handleClearSearch = () => {
    send({ type: "SEARCH_CLEAR" });
  };

  const handleToggleSearchResults = () => {
    send({ type: "TOGGLE_SEARCH_RESULTS" });
  };

  const handleOpenLoginDialog = () => {
    send({ type: "OPEN_LOGIN_DIALOG" });
  };

  const handleCloseLoginDialog = () => {
    send({ type: "CLOSE_LOGIN_DIALOG" });
  };

  const handleToggleAnimation = () => {
    send({ type: "TOGGLE_ANIMATION" });
  };

  // 问候语计算方法
  const getGreetings = () => {
    const now = new Date().getHours();
    if (now >= 13 && now < 18) {
      return dictionary().ui.index.goodAfternoon;
    } else if ((now >= 18 && now < 24) || now < 5) {
      return dictionary().ui.index.goodEvening;
    } else {
      return dictionary().ui.index.goodMorning;
    }
  };

  // userName
  const [userName, setUserName] = createSignal(store.session.user.name);

  createEffect(
    on(
      () => store.session.user.name,
      () => {
        if (store.session.user.name) setUserName(store.session.user.name);
        else setUserName(dictionary().ui.index.adventurer);
      },
    ),
  );

  onMount(() => {
    // console.log("Index loaded");

    // 键盘事件
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
          {
            if (document.activeElement === searchInputRef) {
              searchButtonRef.click();
            }
          }
          break;
        case "Escape":
          {
            if (store.settingsDialogState) {
              setStore("settingsDialogState", false);
              e.stopPropagation();
            } else if (document.activeElement === searchInputRef) {
              searchInputRef.blur();
              e.stopPropagation();
            } else if (context().searchResultOpened) {
              handleToggleSearchResults();
              e.stopPropagation();
            }
            if (document.activeElement === searchInputRef) {
              searchInputRef.blur();
            }
          }
          break;
        case "·":
        case "`":
          {
            if (document.activeElement !== searchInputRef) {
              searchInputRef.focus();
              e.preventDefault(); // 阻止默认输入行为
            }
          }
          break;
        default:
          break;
      }
    };

    // 浏览器后退事件监听
    const handlePopState = (): void => {
      // 如果当前在搜索结果状态，后退时关闭搜索
      if (context().searchResultOpened) {
        send({ type: "TOGGLE_SEARCH_RESULTS" });
      }
    };

    // 监听绑带与清除
    document.addEventListener("keydown", handleKeyPress);
    window.addEventListener("popstate", handlePopState);

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("popstate", handlePopState);
    });
  });

  return (
    <MetaProvider>
      <Title>ToramCalculator 首页</Title>
      <Motion.div
        animate={{ opacity: [0, 1] }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        class={`Client relative flex h-full w-full flex-col justify-between opacity-0`}
      >
        {/* 右上角控件 */}
        <div
          class={`Config absolute top-3 right-3 flex gap-1 duration-700! ${context().searchResultOpened ? `z-0 opacity-0` : `z-10 opacity-100`}`}
        >
          <For each={extraFunctionConfig()}>
            {(config, index) => {
              return (
                <Button
                  class="outline-hidden focus-within:outline-hidden"
                  level="quaternary"
                  onClick={config.onClick}
                  icon={config.icon}
                ></Button>
              );
            }}
          </For>
        </div>

        {/* 顶部 */}
        <div
          class={`Top flex flex-1 flex-col justify-center overflow-hidden ${context().searchResultOpened ? "p-3" : "p-6"} w-full landscape:mx-auto landscape:max-w-[1536px] landscape:p-3`}
        >
          {/* 问候语 */}
          <Presence exitBeforeEnter>
            <Show when={!context().searchResultOpened}>
              <Motion.div
                animate={{
                  opacity: [0, 1],
                  paddingBottom: [
                    0,
                    media.orientation === "landscape" ? (media.width > 1024 ? "3rem" : "1rem") : "0rem",
                  ],
                  height: ["0px", "120px"], // 临时数值
                  filter: ["blur(20px)", "blur(0px)"],
                }}
                exit={{
                  opacity: [1, 0],
                  paddingBottom: 0,
                  height: 0, // 临时数值
                  filter: ["blur(0px)", "blur(20px)"],
                }}
                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
                class={`Greetings grid flex-1 justify-items-center gap-2 overflow-hidden landscape:flex-none`}
              >
                <div
                  class={`LogoBox mb-2 cursor-pointer self-end overflow-hidden rounded backdrop-blur-sm landscape:mb-0 dark:backdrop-blur-none`}
                  onClick={handleOpenLoginDialog}
                >
                  <Icon.LogoText class="h-12 landscape:h-auto" />
                </div>
                <h1 class={`text-main-text-color self-start py-4 landscape:hidden`}>
                  {getGreetings() + ",  " + userName()}
                </h1>
              </Motion.div>
            </Show>
          </Presence>

          {/* 搜索功能区 */}
          <Motion.div
            animate={{
              filter: ["blur(20px)", "blur(0px)"],
            }}
            exit={{
              filter: ["blur(0px)", "blur(20px)"],
            }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
            class={`FunctionBox flex w-full flex-col justify-center landscape:flex-row landscape:justify-between`}
          >
            <div
              class={`BackButton m-0 hidden w-full flex-none self-start landscape:m-0 landscape:flex landscape:w-60 ${
                context().searchResultOpened
                  ? `pointer-events-auto mt-3 opacity-100`
                  : `pointer-events-none -mt-12 opacity-0`
              }`}
            >
              <Button
                level="quaternary"
                onClick={handleClearSearch}
                class="w-full outline-hidden focus-within:outline-hidden"
              >
                <Icon.Line.Back />
                <span class="w-full text-left">{dictionary().ui.actions.back}</span>
              </Button>
            </div>
            <div
              class={`SearchBox border-b-none group border-dividing-color focus-within:border-accent-color hover:border-accent-color box-content flex w-full gap-1 p-0.5 duration-700! landscape:border-b-2 landscape:focus-within:px-4 landscape:hover:px-4 ${context().searchResultOpened ? `landscape:basis-[100%]` : `landscape:basis-[426px]`}`}
            >
              <input
                id="searchInput"
                ref={searchInputRef!}
                type="text"
                placeholder={
                  media.orientation === "landscape"
                    ? getGreetings() + "," + userName()
                    : dictionary().ui.searchPlaceholder
                }
                value={context().searchInputValue}
                tabIndex={1}
                disabled={context().isSearching}
                onInput={handleSearchInput}
                class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 landscape:flex landscape:bg-transparent dark:mix-blend-normal"
              />
              <Button
                ref={(el) => (searchButtonRef = el)}
                class="group-hover:text-accent-color landscape:bg-transparent"
                onClick={handleSearch}
                tabindex={1}
              >
                <Icon.Line.Search />
              </Button>
            </div>
            <div class="hidden w-60 flex-none landscape:flex"></div>
          </Motion.div>

          {/* 搜索结果 */}
          <Presence exitBeforeEnter>
            <Show when={context().searchResultOpened}>
              <Motion.div
                animate={{
                  clipPath: ["inset(10% 10% 90% 10% round 12px)", "inset(0% 0% 0% 0% round 12px)"],
                  opacity: [0, 1],
                  flexBasis: ["0%", "100%"],
                  flexGrow: [0, 1],
                }}
                exit={{
                  clipPath: [
                    "inset(0% 0% 0% 0% round 12px)",
                    media.orientation === "landscape"
                      ? "inset(30% 20% 70% 20% round 12px)"
                      : "inset(10% 10% 90% 10% round 12px)",
                  ],
                  opacity: [1, 0],
                  flexBasis: ["100%", "0%"],
                  flexGrow: [1, 0],
                }}
                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
                class={`Result mt-1 flex h-full gap-1 overflow-y-hidden`}
              >
                <Show
                  when={!context().isSearching}
                  fallback={
                    <Motion.div class="flex flex-1 flex-col items-center justify-center gap-4">
                      <LoadingBar class="w-1/2 min-w-[320px]" />
                      <span class="text-lg font-bold">{dictionary().ui.actions.searching}</span>
                    </Motion.div>
                  }
                >
                  <Show
                    when={!context().isNullResult}
                    fallback={
                      <Motion.div
                        class={`NullResult flex flex-1 flex-col gap-12 p-6 landscape:p-0`}
                        animate={{
                          opacity: [0, 1],
                          marginTop: ["0", "calc(50vh - 54px)"],
                          transform: ["translateY(0) scale(0.8)", "translateY(-50%) scale(1)"],
                        }}
                        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
                      >
                        <span class="NullResultWarring text-center text-xl leading-loose font-bold landscape:text-2xl">
                          {dictionary().ui.index.nullSearchResultWarring}
                        </span>
                        <p class={`NullResultTips text-main-text-color text-center leading-loose`}>
                          {dictionary()
                            .ui.index.nullSearchResultTips.split("\n")
                            .map((line, index) => (
                              <span>
                                {line}
                                <br />
                              </span>
                            ))}
                        </p>
                      </Motion.div>
                    }
                  >
                    <div
                      class={`ResultContent bg-area-color flex h-full flex-1 flex-col gap-2 rounded p-2 backdrop-blur-md`}
                    >
                      <OverlayScrollbarsComponent
                        element="div"
                        class="w-full"
                        options={{ scrollbars: { autoHide: "scroll" } }}
                        defer
                      >
                        <div class="ResultGroupContainer flex w-full flex-col gap-1">
                          <For each={Object.entries(context().searchResult)}>
                            {([key, groupResultValue], groupIndex) => {
                              const groupType = key as keyof DB;

                              return (
                                <Show when={groupResultValue.length > 0}>
                                  <div class={`ResultGroup flex flex-col gap-[2px]`}>
                                    <Motion.button
                                      onClick={() => {
                                        const newResultListState = [...context().resultListState];
                                        newResultListState[groupIndex()] = !newResultListState[groupIndex()];
                                        send({ type: "UPDATE_RESULT_LIST_STATE", resultListState: newResultListState });
                                      }}
                                      class={`Group bg-primary-color flex cursor-pointer justify-center gap-2 outline-hidden focus-within:outline-hidden ${context().resultListState[groupIndex()] ? "" : ""} rounded px-3 py-4`}
                                      animate={{
                                        opacity: [0, 1],
                                        transform: ["translateY(30px)", "translateY(0)"],
                                      }}
                                      transition={{
                                        duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                        delay: store.settings.userInterface.isAnimationEnabled ? groupIndex() * 0.3 : 0,
                                      }}
                                    >
                                      <Icon.Line.Basketball />
                                      <span class="w-full text-left font-bold">
                                        {dictionary().db[groupType].selfName} [{groupResultValue.length}]
                                      </span>
                                      {context().resultListState[groupIndex()] ? (
                                        <Icon.Line.Left class="rotate-[360deg]" />
                                      ) : (
                                        <Icon.Line.Left class="rotate-[270deg]" />
                                      )}
                                    </Motion.button>
                                    <div class="Content flex flex-col gap-1">
                                      <For each={groupResultValue}>
                                        {(resultItem, index) => {
                                          return (
                                            <Motion.button
                                              class={`Item group flex flex-col gap-1 ${context().resultListState[groupIndex()] ? "" : "hidden"} bg-primary-color focus-within:bg-area-color rounded p-3 outline-hidden focus-within:outline-hidden`}
                                              animate={{
                                                opacity: [0, 1],
                                                transform: ["translateY(30px)", "translateY(0)"],
                                              }}
                                              transition={{
                                                duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                                                delay: store.settings.userInterface.isAnimationEnabled
                                                  ? index() < 15
                                                    ? groupIndex() * 0.3 + index() * 0.07
                                                    : 0
                                                  : 0,
                                              }}
                                              onClick={async () => {
                                                // 设置卡片类型和ID
                                                "id" in resultItem
                                                  ? setWikiStore("cardGroup", (pre) => [
                                                      ...pre,
                                                      { type: groupType, id: resultItem.id },
                                                    ])
                                                  : null;
                                              }}
                                            >
                                              <div class="Name group-hover:border-accent-color border-b-2 border-transparent p-1 text-left">
                                                {"name" in resultItem ? resultItem.name : "此条目没有名称"}
                                              </div>
                                              {/* <div class="Value text-main-text-color group-hover:text-accent-color flex w-full flex-col flex-wrap p-1 text-sm">
                                              {resultItem?.relateds.map((related, index) => {
                                                return (
                                                  <div class="Related w-fit pr-2 text-left">
                                                    <span>
                                                      {related?.key}: {related?.value}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div> */}
                                            </Motion.button>
                                          );
                                        }}
                                      </For>
                                    </div>
                                  </div>
                                </Show>
                              );
                            }}
                          </For>
                        </div>
                      </OverlayScrollbarsComponent>
                    </div>
                  </Show>
                </Show>
              </Motion.div>
            </Show>
          </Presence>
        </div>

        {/* Bottom */}
        <Presence exitBeforeEnter>
          <Show when={!context().searchResultOpened}>
            <Motion.div
              animate={{
                opacity: [0, 1],
                gridTemplateRows: ["0fr", "1fr"],
                paddingBlockStart: [
                  "0rem",
                  media.orientation === "landscape" ? (media.width > 1024 ? "5rem" : "2.5rem") : "2.75rem",
                ],
                paddingBlockEnd: [
                  "0rem",
                  media.orientation === "landscape" ? (media.width > 1024 ? "5rem" : "2.5rem") : "1.5rem",
                ],
                filter: ["blur(20px)", "blur(0px)"],
              }}
              exit={{
                opacity: [1, 0],
                gridTemplateRows: ["1fr", "0fr"],
                paddingBlock: "0rem",
                filter: ["blur(0px)", "blur(20px)"],
              }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
              class={`Bottom bg-accent-color portrait:dark:bg-area-color grid w-full shrink-0 self-center px-6 portrait:rounded-t-[24px] landscape:grid landscape:w-fit landscape:bg-transparent`}
            >
              <div class="Btn bg-primary-color absolute top-3 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full landscape:hidden"></div>
              <Motion.div
                class={`Content landscape:bg-area-color flex flex-wrap gap-3 overflow-hidden rounded landscape:flex-1 landscape:justify-center landscape:px-3 landscape:backdrop-blur-sm`}
                animate={{
                  paddingBlock: ["0rem", media.orientation === "landscape" ? "0.75rem" : "0"],
                }}
                exit={{
                  paddingBlock: "0rem",
                }}
                transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
              >
                <For each={customMenuConfig().top}>
                  {(menuItem, index) => {
                    const IconComponent = Icon.Filled[menuItem.icon];
                    const brandColor = {
                      1: "1st",
                      2: "2nd",
                      3: "3rd",
                    }[1 + (index() % 3)];

                    return (
                      <Presence exitBeforeEnter>
                        <Show when={!context().searchResultOpened}>
                          <Motion.a
                            tabIndex={2}
                            href={menuItem.groupType === "wiki" ? `/wiki/${menuItem.title}` : menuItem.title}
                            class={`flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded landscape:basis-auto`}
                            animate={{
                              opacity: [0, 1],
                              transform: ["scale(0.1)", "scale(1)"],
                            }}
                            exit={{
                              opacity: [1, 0],
                              transform: ["scale(1)", "scale(0.1)"],
                            }}
                            transition={{
                              duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                              delay: index() * 0.05,
                            }}
                          >
                            <Button
                              class="group bg-primary-color-10 dark:bg-primary-color dark:text-accent-color landscape:bg-accent-color w-full flex-col landscape:w-fit landscape:flex-row"
                              level="primary"
                              tabIndex={-1}
                            >
                              <IconComponent
                                class={`text-brand-color-${brandColor} group-hover:text-primary-color dark:group-hover:text-accent-color h-10 w-10 landscape:h-6 landscape:w-6`}
                              />
                              <span class="text-sm text-nowrap text-ellipsis landscape:hidden landscape:text-base lg:landscape:block">
                                {menuItem.groupType === "wiki"
                                  ? dictionary().db[menuItem.title as keyof DB].selfName
                                  : dictionary().ui.nav[menuItem.title as keyof dictionary["ui"]["nav"]]}
                              </span>
                            </Button>
                          </Motion.a>
                        </Show>
                      </Presence>
                    );
                  }}
                </For>
              </Motion.div>
            </Motion.div>
          </Show>
        </Presence>
      </Motion.div>

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
                          transform: [`rotate(0deg)`, `rotate(${(cachedCardDatas()!.length - index - 1) * 2}deg)`],
                          opacity: [0, 1],
                        }}
                        exit={{
                          transform: [`rotate(${(cachedCardDatas()!.length - index - 1) * 2}deg)`, `rotate(0deg)`],
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
                                    <path d="M19 6.99999L9 24L19 41L29 41L29 6.99999L19 6.99999Z" fill="currentColor" />
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
                                        {DBDataConfig[type() as keyof typeof DBDataConfig]?.card({
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
      <Filing />
      <LoginDialog state={() => context().loginDialogIsOpen} setState={() => handleCloseLoginDialog()} />
    </MetaProvider>
  );
}
