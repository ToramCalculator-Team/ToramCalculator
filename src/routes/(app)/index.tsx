import { createMemo, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { MetaProvider, Title } from "@solidjs/meta";
import * as _ from "lodash-es";
import { evaluate } from "mathjs";

import { getDictionary } from "~/i18n";
import { setStore, store } from "~/store";
import * as Icon from "~/components/icon";
import Button from "~/components/button";
import { testMonsterQueryData, type SelectMonster } from "~/schema/monster";
import { testSkillQueryData, type SelectSkill } from "~/schema/skill";
import { testCrystalQueryData, type SelectCrystal } from "~/schema/crystal";
import RandomBallBackground from "~/components/randomBallBg";
import Filing from "~/components/filing";

import { type SelectSkillEffect } from "~/schema/skill_effect";
import { type SelectSkillCost } from "~/schema/skill_cost";
import { type ConvertToAllString } from "../../dictionaries/type";
import { Motion } from "solid-motionone";

type Related =
  | {
      key: string;
      value: string | number;
    }
  | undefined;

type Result =
  | {
      name: string;
      relateds: Related[];
      data: SelectMonster | SelectSkill | SelectCrystal;
    }
  | undefined;

export default function App() {
  let searchButtonRef: HTMLButtonElement;

  type FinalResult = Partial<Record<"monsters" | "skills" | "crystals", Result[]>>;

  const [searchInputFocused, setSearchInputFocused] = createSignal(false);
  const [searchInputValue, setSearchInputValue] = createSignal("");
  const [searchResult, setSearchResult] = createSignal<FinalResult>({
    monsters: [],
    skills: [],
    crystals: [],
  });
  const [resultDialogOpened, setResultDialogOpened] = createSignal(false);
  const [isNullResult, setIsNullResult] = createSignal(true);
  const [resultListSate, setResultListState] = createSignal<boolean[]>([]);
  const [currentCardId, setCurrentCardId] = createSignal<string>("defaultId");
  const dictionary = createMemo(() => getDictionary(store.location));

  // 搜索函数
  const monsterHiddenData: Array<keyof SelectMonster> = ["id", "updatedAt", "updatedByUserId", "createdByUserId"];
  const skillHiddenData: Array<keyof (SelectSkill & SelectSkillEffect & SelectSkillCost)> = [
    "id",
    "skillEffectId",
    "belongToskillId",
    "updatedAt",
    "updatedByUserId",
    "createdAt",
    "createdByUserId",
  ];
  const crystalHiddenData: Array<keyof SelectCrystal> = [
    "id",
    "front",
    "updatedAt",
    "updatedByUserId",
    "createdAt",
    "createdByUserId",
    "modifiersListId",
  ];

  // 对象属性字符串匹配方法
  const keyWordSearch = <T extends Record<string, unknown>>(
    obj: T,
    keyWord: string | number,
    hiddenData: string[],
    path: string[] = [],
    relateds: Related[] = [],
  ): Related[] | undefined => {
    Object.keys(obj).forEach((key) => {
      const currentPath = [...path, key];
      if (hiddenData.some((data) => data === key)) return;
      if (_.isArray(obj[key])) {
        const currentArr = obj[key] as unknown[];
        currentArr.forEach((item) => {
          const subRealateds = keyWordSearch(item as Record<string, unknown>, keyWord, hiddenData, currentPath);
          if (subRealateds) relateds = relateds.concat(subRealateds);
        });
      } else if (_.isObject(obj[key])) {
        const currentObj = obj[key] as Record<string, unknown>;
        const subRealateds = keyWordSearch(currentObj, keyWord, hiddenData, currentPath);
        if (subRealateds) relateds = relateds.concat(subRealateds);
      } else if (_.isNumber(obj[key])) {
        // console.log("数字类型：", currentPath.join("."), obj[key]);
        const value = obj[key] as number;
        if (value === keyWord) {
          relateds.push({ key: currentPath.join("."), value: value });
        } else if (typeof keyWord === "string") {
          try {
            // const node = parse(keyWord);
            // const nodeString = node.toString();
            // math表达式匹配
            // console.log("准备评估：", keyWord, "上下文为：", { [`${key}`]: value }, "节点类型为：", node.type);
            if (evaluate(keyWord, { [`${key}`]: value })) {
              relateds.push({ key: currentPath.join("."), value: value });
            }
          } catch (error) {}
        }
      } else if (_.isString(obj[key])) {
        const value = obj[key] as string;
        // console.log("字符串类型：", currentPath.join("."), obj[key]);
        if (typeof keyWord === "string") {
          // console.log("在：", value, "中寻找：", keyWord);
          if (value.match(keyWord)) {
            // console.log("符合条件");
            // 常规字符串匹配
            relateds.push({ key: currentPath.join("."), value: value });
          }
        }
      } else {
        // console.log("未知类型：", currentPath.join("."), obj[key]);
      }
    });
    if (relateds.length > 0) {
      // console.log("在：", path.join("."), "匹配的结果：", relateds);
      return relateds;
    }
  };

  // 变量对象，返回所有字符串属性值组成的数组
  function getAllValues(obj: Record<string, unknown>) {
    const values: string[] = [];

    function collectValues(o: object) {
      _.forOwn(o, (value) => {
        if (_.isObject(value) && !_.isArray(value)) {
          collectValues(value);
        } else if (_.isString(value)) {
          values.push(value);
        }
      });
    }

    collectValues(obj);
    return values;
  }

  const searchInList = <T extends SelectMonster | SelectSkill | SelectCrystal>(
    list: T[],
    key: string | number,
    dictionary: ConvertToAllString<T>,
    hiddenData: string[],
  ) => {
    if (!key) return;
    if (typeof key === "string") {
      // 字典替换
      // 获取所有字典值
      console.log(getAllValues(dictionary));
    }
    const result: Result[] = [];
    list.forEach((item) => {
      keyWordSearch(item, key, hiddenData)
        ? result.push({
            name: item.name,
            relateds: keyWordSearch(item, key, hiddenData)!,
            data: item,
          })
        : null;
    });
    // console.log("搜索结果：", result);
    return result;
  };

  // 生成搜索结果列表DOM
  const generateSearchResultDom = (dialogStatus: boolean) => {
    return isNullResult() ? (
      <div
        class={`NullResult flex h-full flex-1 flex-col items-center justify-center gap-12 p-6 lg:p-0 ${
          dialogStatus ? "opacity-100" : "opacity-0"
        }`}
      >
        <span class="NullResultWarring text-xl font-bold leading-loose lg:text-2xl">
          {dictionary().ui.index.nullSearchResultWarring}
        </span>
        <p class={`NullResultTips text-center leading-loose text-accent-color-70`}>
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
    ) : (
      <div
        class={`ResultContent flex h-full flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-transition-color-8 p-2 backdrop-blur-md`}
      >
        {Object.entries(searchResult()).map(([key, value], groupIndex) => {
          let icon: JSX.Element = null;
          let groupName = "未知分类";
          switch (key) {
            case "skills":
              icon = <Icon.Line.Basketball />;
              groupName = dictionary().ui.nav.skills;
              break;
            case "crystals":
              icon = <Icon.Line.Box2 />;
              groupName = dictionary().ui.nav.crystals;
              break;
            case "monsters":
              icon = <Icon.Line.Calendar />;
              groupName = dictionary().ui.nav.monsters;
              break;
            default:
              break;
          }

          return (
            value.length > 0 && (
              <div class="RsultGroup flex flex-col gap-1">
                <button
                  onClick={() =>
                    setResultListState([
                      ...resultListSate().slice(0, groupIndex),
                      !resultListSate()[groupIndex],
                      ...resultListSate().slice(groupIndex + 1),
                    ])
                  }
                  class={`Group flex cursor-pointer justify-center gap-2 ${resultListSate()[groupIndex] ? "bg-transition-color-8" : "bg-primary-color"} rounded-md px-3 py-4`}
                >
                  {icon}
                  <span class="w-full text-left">
                    {groupName} [{value.length}]
                  </span>
                  {resultListSate()[groupIndex] ? (
                    <Icon.Line.Left class="rotate-[360deg]" />
                  ) : (
                    <Icon.Line.Left class="rotate-[270deg]" />
                  )}
                </button>
                <div class="Content flex flex-col gap-1">
                  {value.map((item, index) => {
                    return (
                      <Motion.button
                        class={`Item group flex flex-col gap-1 ${resultListSate()[groupIndex] ? "" : "hidden"} rounded-md border border-transition-color-20 bg-primary-color p-3`}
                        animate={{
                          opacity: [0, 1],
                          transform: ["translateY(10px)", "translateY(0)"],
                        }}
                        transition={{
                          duration: store.durtion ? 0.7 : 0,
                          delay: store.durtion ? 0 + index * 0.07 : 0,
                        }}
                        onClick={() => {
                          if (item?.data.id === currentCardId()) {
                            setCurrentCardId("defaultId");
                          } else {
                            setCurrentCardId(item?.data.id ?? "未知ID");
                          }
                        }}
                      >
                        <div class="Name border-b-2 border-transparent p-1 font-bold group-hover:border-accent-color">
                          {item?.name}
                        </div>
                        <div class="Value flex w-full flex-col flex-wrap p-1 text-sm text-accent-color-70 group-hover:text-accent-color">
                          {item?.relateds.map((related, index) => {
                            return (
                              <div class="Related w-fit pr-2">
                                <span>
                                  {related?.key}: {related?.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          class={`Data ${currentCardId() === item?.data.id ? "flex" : "hidden"} w-full flex-1 flex-wrap rounded-md bg-transition-color-8 p-1`}
                        >
                          {JSON.stringify(item?.data, null, 2)
                            .split(",")
                            .map((line, index) => (
                              <span class="text-left lg:basis-1/4">
                                {line}
                                <br />
                              </span>
                            ))}
                        </div>
                      </Motion.button>
                    );
                  })}
                </div>
              </div>
            )
          );
        })}
      </div>
    );
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
    // enter键监听
    const handleEnterKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && searchInputFocused()) {
        searchButtonRef.click();
      }
    };

    // esc键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setResultDialogOpened(false);
      }
    };

    // 浏览器后退事件监听
    const handlePopState = () => {
      setResultDialogOpened(false);
      history.replaceState(null, "", location.href);
    };

    // 监听绑带与清除
    document.addEventListener("keydown", handleEnterKeyPress);
    document.addEventListener("keydown", handleEscapeKeyPress);
    window.addEventListener("popstate", handlePopState);

    onCleanup(() => {
      document.removeEventListener("keydown", handleEnterKeyPress);
      document.removeEventListener("keydown", handleEscapeKeyPress);
      window.removeEventListener("popstate", handlePopState);
    });
  });

  return (
    <MetaProvider>
      <Title>ToramCalculator 首页</Title>
      <RandomBallBackground />
      <div class={`Client flex h-dvh w-dvw flex-col justify-between lg:mx-auto lg:max-w-[1536px] lg:p-8`}>
        <div class="QueryStarus pointer-events-none fixed left-10 top-10 hidden flex-col text-xs text-accent-color-30 lg:flex">
          <span>MonsterList: 测试数据</span>
          <span>SkillList: 测试数据</span>
          <span>CrystalList: 测试数据</span>
          <span>searchInputFocused: {searchInputFocused().toString()}</span>
          <span>resultDialogOpened: {resultDialogOpened().toString()}</span>
        </div>
        <div class="Config fixed flex gap-1 lg:right-8 lg:top-8">
          <Button
            class="outline-none duration-150 focus-within:outline-none"
            level="quaternary"
            onClick={() => setStore("theme", store.theme == "dark" ? "light" : "dark")}
          >
            <Icon.Line.Light />
          </Button>
          <Button
            class="outline-none duration-150 focus-within:outline-none"
            level="quaternary"
            onClick={() => setStore("settingsDialogState", !store.settingsDialogState)}
          >
            <Icon.Line.Settings />
          </Button>
        </div>
        <div
          class={`Top flex flex-1 flex-col justify-center overflow-hidden duration-700 ${
            resultDialogOpened() ? `p-3 lg:p-0 lg:pb-3` : `p-6 lg:px-0 lg:pt-20`
          }`}
        >
          <div
            class={`Greetings flex flex-1 flex-col items-center justify-center gap-2 overflow-hidden duration-700 ${
              resultDialogOpened() ? `basis-[0%] pb-0 opacity-0` : `basis-[100%] pb-12 opacity-100 lg:flex-none`
            }`}
          >
            <div class={`LogoBox mb-2 overflow-hidden rounded-md backdrop-blur dark:backdrop-blur-none lg:mb-0`}>
              <Icon.LogoText class="h-12 w-fit lg:h-auto" />
            </div>
            <h1 class={`py-4 text-accent-color-70 lg:hidden`}>
              {getGreetings() + ",  " + dictionary().ui.index.adventurer}
            </h1>
          </div>
          <div
            class={`ResultMo flex flex-1 flex-col gap-1 overflow-hidden py-3 lg:hidden lg:flex-row ${
              resultDialogOpened()
                ? `flex-shrink-1 flex-grow-1 basis-[100%]`
                : `flex-shrink-0 flex-grow-0 basis-[0%] opacity-0`
            }`}
            style={
              resultDialogOpened()
                ? {
                    "clip-path": "inset(0% 0% 0% 0% round 12px)",
                    "transition-duration": "0.3s",
                    "transition-timing-function": "ease-out",
                  }
                : {
                    "clip-path": "inset(10% 5% 90% 5% round 12px)",
                    "transition-duration": "0.7s",
                    "transition-timing-function": "ease-out",
                  }
            }
          >
            {generateSearchResultDom(resultDialogOpened())}
          </div>
          <div class={`FunctionBox flex w-full flex-col justify-between lg:flex-row`}>
            <div
              class={`BackButton m-0 hidden w-full flex-none self-start lg:m-0 lg:flex lg:w-60 ${
                resultDialogOpened() ? `pointer-events-auto mt-3 opacity-100` : `pointer-events-none -mt-12 opacity-0`
              }`}
            >
              <Button
                level="quaternary"
                onClick={() => {
                  setResultDialogOpened(false);
                }}
                class="w-full outline-none focus-within:outline-none"
              >
                <Icon.Line.Back />
                <span class="w-full text-left">{dictionary().ui.actions.back}</span>
              </Button>
            </div>
            <div
              class={`SearchBox border-b-none box-content flex w-full gap-1 border-transition-color-20 p-0.5 duration-500 ease-linear focus-within:border-accent-color hover:border-accent-color lg:border-b-2 lg:focus-within:px-4 lg:hover:px-4 ${resultDialogOpened() ? `lg:basis-[100%]` : `lg:basis-[426px]`}`}
            >
              <input
                id="searchInput-PC"
                type="text"
                placeholder={getGreetings() + "," + dictionary().ui.index.adventurer}
                onFocus={() => setSearchInputFocused(true)}
                onBlur={() => setSearchInputFocused(false)}
                value={searchInputValue()}
                tabIndex={1}
                onInput={(e) => {
                  setSearchInputValue(e.target.value);
                }}
                class="hidden w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply outline-none placeholder:text-base placeholder:font-normal placeholder:text-accent-color-50 focus-within:outline-none dark:mix-blend-normal lg:flex lg:bg-transparent"
              />
              <input
                id="searchInput-Mobile"
                type="text"
                placeholder={dictionary().ui.searchPlaceholder}
                onFocus={() => setSearchInputFocused(true)}
                onBlur={() => setSearchInputFocused(false)}
                value={searchInputValue()}
                tabIndex={1}
                onInput={(e) => {
                  setSearchInputValue(e.target.value);
                }}
                class="w-full flex-1 rounded bg-transition-color-8 px-4 py-2 text-lg font-bold mix-blend-multiply backdrop-blur placeholder:font-normal placeholder:text-accent-color-50 dark:mix-blend-normal lg:hidden"
              />
              <Button
                ref={(el) => (searchButtonRef = el)}
                level="tertiary"
                icon={<Icon.Line.Search />}
                class="flex outline-none focus-within:outline-none lg:bg-transparent"
                onClick={() => {
                  setIsNullResult(true);
                  if (searchInputValue() === "" || searchInputValue() === null) {
                    // console.log("输入值为空，不处理");
                    setResultDialogOpened(false);
                    return;
                  }
                  if (!resultDialogOpened()) {
                    // console.log("搜索结果列表未打开，打开列表，并添加前进历史记录");
                    setResultDialogOpened(true);
                    history.pushState({ popup: true }, "");
                  }

                  const parsedInput = parseFloat(searchInputValue());
                  const isNumber = !isNaN(parsedInput) && searchInputValue().trim() !== "";
                  const searchValue = isNumber ? parsedInput : searchInputValue();

                  const finalResult: FinalResult = {
                    monsters: searchInList(
                      testMonsterQueryData,
                      searchValue,
                      dictionary().db.models.monster,
                      monsterHiddenData,
                    ),
                    skills: searchInList(
                      testSkillQueryData,
                      searchValue,
                      dictionary().db.models.skill,
                      skillHiddenData,
                    ),
                    crystals: searchInList(
                      testCrystalQueryData,
                      searchValue,
                      dictionary().db.models.crystal,
                      crystalHiddenData,
                    ),
                  };
                  setSearchResult(finalResult);
                  // 动态初始化列表状态
                  const resultListSate: boolean[] = [];
                  Object.entries(finalResult).forEach(([_key, value]) => {
                    if (value.length > 0) {
                      setIsNullResult(false);
                    }
                    resultListSate.push(true);
                  });
                  setResultListState(resultListSate);
                }}
              ></Button>
            </div>
            <div class="hidden w-60 flex-none lg:flex"></div>
          </div>
          <div
            class={`ResultPC hidden h-full flex-1 gap-1 overflow-hidden py-3 ease-linear lg:flex lg:flex-row ${
              resultDialogOpened() ? `flex-grow-1 basis-[100%] opacity-100` : `flex-grow-0 basis-[0%] opacity-100`
            }`}
            style={
              resultDialogOpened()
                ? {
                    "clip-path": "inset(0% 0% 0% 0% round 12px)",
                    "transition-duration": "0.7s",
                    "transition-timing-function": "ease-out",
                  }
                : {
                    "clip-path": "inset(10% 25% 90% 25% round 12px)",
                    "transition-duration": "0.5s",
                    "transition-timing-function": "ease-out",
                  }
            }
          >
            {generateSearchResultDom(resultDialogOpened())}
          </div>
        </div>
        <div
          class={`Bottom grid self-center bg-accent-color p-6 duration-700 dark:bg-transition-color-8 lg:bg-transparent dark:lg:bg-transparent ${resultDialogOpened() ? `py-0 opacity-0` : `opacity-100 lg:py-20`}`}
          style={{
            "grid-template-rows": resultDialogOpened() ? "0fr" : "1fr",
          }}
        >
          <div
            class={`Content flex flex-wrap justify-center gap-3 overflow-hidden rounded-md backdrop-blur lg:flex-1 lg:bg-transition-color-8 ${resultDialogOpened() ? `lg:p-0` : `lg:p-3`}`}
          >
            <a
              tabIndex={2}
              href={"/monster"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Browser class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.monsters}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/skill"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Basketball class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.skills}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/equipment"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Category2 class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.equipments}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/crystal"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Box2 class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.crystals}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/pet"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Heart class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.pets}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/building"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Layers class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.items}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/character"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.User class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.character}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/analyze"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded-md lg:basis-auto"
            >
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Gamepad class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.comboAnalyze}</span>
              </Button>
            </a>
          </div>
        </div>
      </div>
      <Filing />
    </MetaProvider>
  );
}
