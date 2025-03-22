import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show, useContext } from "solid-js";
import { MetaProvider, Title } from "@solidjs/meta";
import * as _ from "lodash-es";

import { getDictionary, Locale } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { defaultMob, findMobById, findMobsLike, type Mob } from "~/repositories/mob";
import { findSkillById, type Skill } from "~/repositories/skill";
import { findCrystalById, type Crystal } from "~/repositories/crystal";
import Filing from "~/components/module/filing";

import { type SkillEffect } from "~/repositories/skillEffect";
import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { useNavigate } from "@solidjs/router";
import { dictionary } from "~/locales/dictionaries/type";
import Dialog from "~/components/controls/dialog";
import { DB } from "../../../db/clientDB/kysely/kyesely";
import { findZoneById } from "~/repositories/zone";
import { MediaContext } from "~/contexts/Media";
import { setStore, store } from "~/store";
import { pgWorker } from "~/initialWorker";
import { User } from "~/repositories/user";

type Result = Mob["Select"];

type FinalResult = Partial<Record<keyof DB, Result[]>>;

export default function Index() {
  let searchButtonRef!: HTMLButtonElement;
  let searchInputRef!: HTMLInputElement;

  const navigate = useNavigate();
  const [dialogState, setDialogState] = createSignal(false);
  const [searchInputValue, setSearchInputValue] = createSignal("");
  const [searchResult, setSearchResult] = createSignal<FinalResult>({
    mob: [],
    skill: [],
    crystal: [],
  });
  const [searchResultOpened, setSearchResultOpened] = createSignal(false);
  const [isNullResult, setIsNullResult] = createSignal(true);
  const [resultListSate, setResultListState] = createSignal<boolean[]>([]);
  const [currentCardId, setCurrentCardId] = createSignal<string>(defaultMob.id);
  const [currentCardType, setCurrentCardType] = createSignal<keyof DB>("mob");
  const { width, height, orientation } = useContext(MediaContext);

  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 自定义首页导航配置
  const [customMenuConfig] = createSignal<
    {
      href: string;
      title: keyof dictionary["ui"]["nav"];
      icon: keyof typeof Icon.Filled;
    }[]
  >([
    {
      href: "/wiki/mob",
      title: "mobs",
      icon: "Browser",
    },
    {
      href: "/wiki/skill",
      title: "skills",
      icon: "Basketball",
    },
    {
      href: "/wiki/equipment",
      title: "equipments",
      icon: "Category2",
    },
    {
      href: "/wiki/crystal",
      title: "crystals",
      icon: "Box2",
    },
    {
      href: "/wiki/pet",
      title: "pets",
      icon: "Heart",
    },
    {
      href: "/wiki/building",
      title: "items",
      icon: "Layers",
    },
    {
      href: "/character/defaultCharacterId",
      title: "character",
      icon: "User",
    },
    {
      href: "simulator/defaultSimulatorId",
      title: "simulator",
      icon: "Gamepad",
    },
  ]);
  // const [UserList, { refetch: refetchUserList }] = createResource(
  //   async () =>
  //     await pgWorker.live.query<User>(`select * from public.user`, [], (res) => {
  //       console.log(res);
  //     }),
  // );

  const [data, { refetch: refetchData }] = createResource(currentCardId(), async () => {
    switch (currentCardType()) {
      case "crystal":
        return findCrystalById(currentCardId());
      case "player_pet":
      case "player_weapon":
      case "drop_item":
      case "image":
      case "item":
      case "material":
      case "member":
      case "mercenary":
      case "mob":
        return findMobById(currentCardId());
      case "npc":
      case "player":
      case "post":
      case "recipe":
      case "recipe_ingredient":
      case "reward":
      case "session":
      case "simulator":
      case "skill":
        return findSkillById(currentCardId());
      case "skill_effect":
      case "statistic":
      case "task":
      case "task_collect_require":
      case "task_kill_requirement":
      case "team":
      case "user":
      case "weapon":
      case "world":
      case "zone":
        return findZoneById(currentCardId());
    }
  });

  // 搜索时需要放弃检查的列
  const mobHiddenData: Array<keyof Mob["Select"]> = ["id", "updatedByAccountId", "createdByAccountId"];
  const skillHiddenData: Array<keyof (Skill & SkillEffect)> = [
    "id",
    "belongToskillId",
    "updatedByAccountId",
    "createdByAccountId",
  ];
  const crystalHiddenData: Array<keyof Crystal> = [];

  const search = async () => {
    setIsNullResult(true);
    if (searchInputValue() === "" || searchInputValue() === null) {
      // console.log("输入值为空，不处理");
      setSearchResultOpened(false);
      return;
    }
    if (!searchResultOpened()) {
      // console.log("搜索结果列表未打开，打开列表，并添加前进历史记录");
      setSearchResultOpened(true);
      history.pushState({ popup: true }, "");
    }

    // 将数字字符串转换成数字
    // const parsedInput = parseFloat(searchInputValue());
    // const isNumber = !isNaN(parsedInput) && searchInputValue().trim() !== "";
    // const searchValue = isNumber ? parsedInput : searchInputValue();

    const finalResult: FinalResult = {
      mob: await findMobsLike(searchInputValue()),
    };
    setSearchResult(finalResult);

    // 所有部分结果都为空时，显示无结果提示
    const resultListSate: boolean[] = [];
    Object.entries(finalResult).forEach(([_key, value]) => {
      if (value.length > 0) {
        setIsNullResult(false);
      }
      resultListSate.push(true);
    });
    setResultListState(resultListSate);
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
            } else if (searchResultOpened()) {
              setSearchResultOpened(false);
              e.stopPropagation();
            }
            if (document.activeElement === searchInputRef) {
              searchInputRef.blur();
            }
          }
          break;
        case "s":
        case "S":
          {
            if (document.activeElement !== searchInputRef) {
              setStore("settingsDialogState", true);
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
      setSearchResultOpened(false);
      history.replaceState(null, "", location.href);
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
        <div
          class={`Config absolute top-3 right-3 flex gap-1 duration-700! ${searchResultOpened() ? `z-0 opacity-0` : `z-10 opacity-100`}`}
        >
          <Button
            class="outline-hidden focus-within:outline-hidden"
            level="quaternary"
            onClick={() => {
              navigate("repl");
            }}
          >
            <Icon.Line.Basketball />
          </Button>
          <Button
            class="outline-hidden focus-within:outline-hidden"
            level="quaternary"
            onClick={() => setStore("theme", store.theme == "dark" ? "light" : "dark")}
          >
            <Icon.Line.Light />
          </Button>
          <Button
            class="outline-hidden focus-within:outline-hidden"
            level="quaternary"
            onClick={() => setStore("settingsDialogState", !store.settingsDialogState)}
          >
            <Icon.Line.Settings />
          </Button>
        </div>
        <div
          class={`Top flex flex-1 flex-col justify-center overflow-hidden ${searchResultOpened() ? "p-3" : "p-6"} w-full landscape:mx-auto landscape:max-w-[1536px] landscape:p-3`}
        >
          <Presence exitBeforeEnter>
            <Show when={!searchResultOpened()}>
              <Motion.div
                animate={{
                  opacity: [0, 1],
                  paddingBottom: [0, orientation === "landscape" ? "3rem" : "0rem"],
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
                  class={`LogoBox mb-2 self-end overflow-hidden rounded backdrop-blur-sm landscape:mb-0 dark:backdrop-blur-none`}
                >
                  <Icon.LogoText class="h-12 landscape:h-auto" />
                </div>
                <h1 class={`text-main-text-color self-start py-4 landscape:hidden`}>
                  {getGreetings() + ",  " + dictionary().ui.index.adventurer}
                </h1>
              </Motion.div>
            </Show>
          </Presence>

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
                searchResultOpened() ? `pointer-events-auto mt-3 opacity-100` : `pointer-events-none -mt-12 opacity-0`
              }`}
            >
              <Button
                level="quaternary"
                onClick={() => {
                  setSearchResultOpened(false);
                }}
                class="w-full outline-hidden focus-within:outline-hidden"
              >
                <Icon.Line.Back />
                <span class="w-full text-left">{dictionary().ui.actions.back}</span>
              </Button>
            </div>
            <div
              class={`SearchBox border-b-none group border-dividing-color focus-within:border-accent-color hover:border-accent-color box-content flex w-full gap-1 p-0.5 duration-700! landscape:border-b-2 landscape:focus-within:px-4 landscape:hover:px-4 ${searchResultOpened() ? `landscape:basis-[100%]` : `landscape:basis-[426px]`}`}
            >
              <input
                id="searchInput"
                ref={searchInputRef!}
                type="text"
                placeholder={
                  orientation === "landscape"
                    ? getGreetings() + "," + dictionary().ui.index.adventurer
                    : dictionary().ui.searchPlaceholder
                }
                value={searchInputValue()}
                tabIndex={1}
                onInput={(e) => {
                  setSearchInputValue(e.target.value);
                }}
                class="focus:placeholder:text-accent-color bg-area-color placeholder:text-boundary-color w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-hidden! placeholder:text-base placeholder:font-normal focus-within:outline-hidden landscape:flex landscape:bg-transparent dark:mix-blend-normal"
              />
              <Button
                ref={(el) => (searchButtonRef = el)}
                class="group-hover:text-accent-color landscape:bg-transparent"
                onClick={search}
                tabindex={1}
              >
                <Icon.Line.Search />
              </Button>
            </div>
            <div class="hidden w-60 flex-none landscape:flex"></div>
          </Motion.div>
          <Presence exitBeforeEnter>
            <Show when={searchResultOpened()}>
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
                    orientation === "landscape"
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
                  when={!isNullResult()}
                  fallback={
                    <div
                      class={`NullResult } flex h-full flex-1 flex-col items-center justify-center gap-12 p-6 landscape:p-0`}
                    >
                      <span class="NullResultWarring text-xl leading-loose font-bold landscape:text-2xl">
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
                    </div>
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
                      <For each={Object.entries(searchResult())}>
                        {([key, groupResultValue], groupIndex) => {
                          const groupType = key as keyof DB;
                          let icon: JSX.Element = null;
                          let groupName = "未知分类";
                          switch (groupType) {
                            case "skill":
                              icon = <Icon.Line.Basketball />;
                              groupName = dictionary().ui.nav.skills;
                              break;
                            case "crystal":
                              icon = <Icon.Line.Box2 />;
                              groupName = dictionary().ui.nav.crystals;
                              break;
                            case "mob":
                              icon = <Icon.Line.Calendar />;
                              groupName = dictionary().ui.nav.mobs;
                              break;
                            default:
                              break;
                          }

                          return (
                            <Show when={groupResultValue.length > 0}>
                              <div class={`ResultGroup flex flex-col gap-1`}>
                                <button
                                  onClick={() =>
                                    setResultListState([
                                      ...resultListSate().slice(0, groupIndex()),
                                      !resultListSate()[groupIndex()],
                                      ...resultListSate().slice(groupIndex() + 1),
                                    ])
                                  }
                                  class={`Group bg-primary-color flex cursor-pointer justify-center gap-2 outline-hidden focus-within:outline-hidden ${resultListSate()[groupIndex()] ? "" : ""} rounded px-3 py-4`}
                                >
                                  {icon}
                                  <span class="w-full text-left">
                                    {groupName} [{groupResultValue.length}]
                                  </span>
                                  {resultListSate()[groupIndex()] ? (
                                    <Icon.Line.Left class="rotate-[360deg]" />
                                  ) : (
                                    <Icon.Line.Left class="rotate-[270deg]" />
                                  )}
                                </button>
                                <div class="Content flex flex-col gap-1">
                                  <For each={groupResultValue}>
                                    {(resultItem, index) => {
                                      return (
                                        <Motion.button
                                          class={`Item group flex flex-col gap-1 ${resultListSate()[groupIndex()] ? "" : "hidden"} border-dividing-color bg-primary-color focus-within:bg-area-color rounded border p-3 outline-hidden focus-within:outline-hidden`}
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
                                            setCurrentCardId(resultItem.id ?? defaultMob.id);
                                            setCurrentCardType(groupType);
                                            await refetchData();
                                            setDialogState(true);
                                          }}
                                        >
                                          <div class="Name group-hover:border-accent-color border-b-2 border-transparent p-1 text-left font-bold">
                                            {resultItem?.name}
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
                    </OverlayScrollbarsComponent>
                  </div>
                </Show>
              </Motion.div>
            </Show>
          </Presence>
        </div>

        <Presence exitBeforeEnter>
          <Show when={!searchResultOpened()}>
            <Motion.div
              animate={{
                opacity: [0, 1],
                gridTemplateRows: ["0fr", "1fr"],
                paddingBottom: ["0rem", orientation === "landscape" ? (width > 1024 ? "5rem" : "3.5rem") : "1.5rem"],
                paddingTop: ["0rem", orientation === "landscape" ? (width > 1024 ? "5rem" : "3.5rem") : "1.5rem"],
                filter: ["blur(20px)", "blur(0px)"],
              }}
              exit={{
                opacity: [1, 0],
                gridTemplateRows: ["1fr", "0fr"],
                paddingBottom: "0rem",
                paddingTop: "0rem",
                filter: ["blur(0px)", "blur(20px)"],
              }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
              class={`Bottom bg-accent-color dark:bg-area-color grid w-full shrink-0 self-center p-6 landscape:grid landscape:w-fit landscape:bg-transparent landscape:pb-14 lg:landscape:py-20 dark:landscape:bg-transparent`}
            >
              <div
                class={`Content lg:landscape:bg-area-color flex flex-wrap gap-3 overflow-hidden rounded landscape:flex-1 landscape:justify-center landscape:backdrop-blur-sm lg:landscape:p-3`}
              >
                <For each={customMenuConfig()}>
                  {(menuItem, index) => {
                    const IconComponent = Icon.Filled[menuItem.icon];
                    const brandColor = {
                      1: "1st",
                      2: "2nd",
                      3: "3rd",
                    }[1 + (index() % 3)];
                    return (
                      <Presence exitBeforeEnter>
                        <Show when={!searchResultOpened()}>
                          <Motion.a
                            tabIndex={2}
                            href={menuItem.href}
                            class={`flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded landscape:basis-auto`}
                            animate={{
                              opacity: [0, 1],
                              transform: ["scale(0.2)", "scale(1)"],
                            }}
                            exit={{
                              opacity: [1, 0],
                              transform: ["scale(1)", "scale(0.2)"],
                            }}
                            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0, delay: index() * 0.04 }}
                          >
                            <Button
                              class="group bg-primary-color-10 dark:bg-primary-color dark:text-accent-color landscape:bg-accent-color w-full flex-col landscape:w-fit landscape:flex-row"
                              level="primary"
                              tabIndex={-1}
                              icon={
                                <IconComponent
                                  class={`text-brand-color-${brandColor} group-hover:text-primary-color dark:group-hover:text-accent-color h-10 w-10 landscape:h-6 landscape:w-6`}
                                />
                              }
                            >
                              <span class="text-sm text-nowrap text-ellipsis landscape:hidden landscape:text-base lg:landscape:block">
                                {dictionary().ui.nav[menuItem.title]}
                              </span>
                            </Button>
                          </Motion.a>
                        </Show>
                      </Presence>
                    );
                  }}
                </For>
              </div>
            </Motion.div>
          </Show>
        </Presence>
      </Motion.div>

      <Dialog state={dialogState()} setState={setDialogState}>
        <OverlayScrollbarsComponent element="div" class="w-full" options={{ scrollbars: { autoHide: "scroll" } }} defer>
          <pre class="p-3">{JSON.stringify(data(), null, 2)}</pre>
        </OverlayScrollbarsComponent>
      </Dialog>
      <Filing />
    </MetaProvider>
  );
}
