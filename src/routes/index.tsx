"use client";
import { getDictionary } from "~/i18n";
import { store } from "~/store";
import * as Icon from "~/components/icon";
import Button from "~/components/button";
import * as _ from "lodash-es";
import { Motion } from "solid-motionone";
import { evaluate } from "mathjs";
import { testMonsterQueryData, type SelectMonster } from "~/schema/monster";
import { testSkillQueryData, type SelectSkill } from "~/schema/skill";
import { testCrystalQueryData, type SelectCrystal } from "~/schema/crystal";
import { type SelectSkillEffect } from "~/schema/skill_effect";
import { type SelectSkillCost } from "~/schema/skill_cost";
import { type ConvertToAllString } from "../dictionaries/type";
import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import RandomBallBackground from "~/components/randomBallBg";
import Filing from "~/components/filing";
import { MetaProvider, Title } from "@solidjs/meta";

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

export default function Home() {
  const dictionary = getDictionary(store.location);
  let searchButtonRef: HTMLButtonElement;

  type FinalResult = Partial<Record<"monsters" | "skills" | "crystals", Result[]>>;

  const [greetings, setGreetings] = createSignal(dictionary.ui.index.goodMorning);
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

  onMount(() => {
    // 问候语计算
    const now = new Date().getHours();
    if (now >= 13 && now < 18) {
      setGreetings(dictionary.ui.index.goodAfternoon);
    } else if ((now >= 18 && now < 24) || now < 5) {
      setGreetings(dictionary.ui.index.goodEvening);
    }
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
      <Motion.div
        initial={false}
        // animate={resultDialogOpened() ? "open" : "closed"}
        class={`Client flex max-h-[100dvh] max-w-[100dvw] flex-1 flex-col justify-between lg:mx-auto lg:max-w-[1536px] lg:p-8`}
      >
        <Motion.div class="QueryStarus fixed left-10 top-10 hidden flex-col text-xs text-accent-color-30 lg:flex pointer-events-none">
          <Motion.span>MonsterList: 测试数据</Motion.span>
          <Motion.span>SkillList: 测试数据</Motion.span>
          <Motion.span>CrystalList: 测试数据</Motion.span>
        </Motion.div>
        <Motion.div
          initial={false}
          class={`Top flex flex-col items-center justify-center lg:px-0 ${
            resultDialogOpened()
              ? `p-3 lg:p-0 lg:pb-3`
              : `flex-1 p-6 pb-6 pt-6 lg:pt-20`
          }`}
          // animate={resultDialogOpened() ? "open" : "closed"}
          // variants={{
          //   open: {
          //     flex: "0 0 auto",
          //     padding: isPC() ? "0rem" : "0.75rem",
          //     paddingTop: isPC() ? "0rem" : "0.75rem",
          //     paddingBottom: "0.75rem",
          //   },
          //   closed: {
          //     flex: "1 1 0%",
          //     padding: "1.5rem",
          //     paddingTop: isPC() ? "5rem" : "1.5rem",
          //     paddingBottom: "1.5rem",
          //   },
          // }}
        >
          <Motion.div
            class={`Greetings flex-col items-center justify-center gap-2 overflow-hidden lg:flex-none ${
              resultDialogOpened()
                ? `hidden flex-auto pb-0 opacity-0`
                : `flex pb-12 opacity-100 flex-1`
            }`}
            // animate={resultDialogOpened() ? "open" : "closed"}
            // variants={{
            //   open: {
            //     opacity: 0,
            //     paddingBottom: "0rem",
            //     flex: "0 0 auto",
            //     display: "none",
            //   },
            //   closed: {
            //     opacity: 1,
            //     paddingBottom: "3rem",
            //     flex: isPC() ? "0 0 auto" : "1 1 0%",
            //     display: "flex",
            //   },
            // }}
          >
            <Motion.div class={`LogoBox mb-2 overflow-hidden rounded-md backdrop-blur lg:mb-0`}>
              <Icon.LogoText class="h-12 w-fit lg:h-auto" />
            </Motion.div>
            <h1 class={`py-4 text-accent-color-70 lg:hidden`}>{greetings() + ",  " + dictionary.ui.adventurer}</h1>
          </Motion.div>
          <Motion.div class="FunctionBox flex w-full flex-col items-center justify-center lg:flex-row">
            <Motion.div
              class={`BackButton m-0 hidden w-full flex-none self-start lg:m-0 lg:flex lg:w-60 ${
                resultDialogOpened()
                  ? `pointer-events-auto opacity-100 mt-3`
                  : `pointer-events-none opacity-0 -mt-12`
              }`}
              // animate={resultDialogOpened() ? "open" : "closed"}
              // variants={{
              //   open: {
              //     opacity: 1,
              //     margin: isPC() ? "0rem 0rem 0rem 0rem" : "0rem 0rem 0.75rem 0rem",
              //     pointerEvents: "auto",
              //   },
              //   closed: {
              //     opacity: 0,
              //     margin: isPC() ? "0rem 0rem 0rem 0rem" : "0rem 0rem -3rem 0rem",
              //     pointerEvents: "none",
              //   },
              // }}
            >
              <Button
                level="quaternary"
                onClick={() => {
                  setResultDialogOpened(false);
                }}
                class="w-full"
              >
                <Icon.Line.Back />
                <span class="w-full text-left">{dictionary.ui.back}</span>
              </Button>
            </Motion.div>
            <Motion.div
              class={`SearchBox border-b-none box-content flex w-full items-center gap-1 border-transition-color-20 p-0.5 focus-within:border-accent-color hover:border-accent-color lg:border-b-2 lg:focus-within:px-4 lg:hover:px-4 
                ${resultDialogOpened() ? `` : `lg:w-[426px]`}`}
              // animate={resultDialogOpened() ? "open" : "closed"}
              // variants={{
              //   open: {
              //     width: `100%`,
              //   },
              //   closed: {
              //     width: isPC() ? `426px` : `100%`,
              //   },
              // }}
            >
              <input
                id="searchInput-PC"
                type="text"
                placeholder={greetings() + "," + dictionary.ui.adventurer}
                onFocus={() => setSearchInputFocused(true)}
                onBlur={() => setSearchInputFocused(false)}
                value={searchInputValue()}
                onChange={(e) => setSearchInputValue(e.target.value)}
                class="hidden w-full flex-1 rounded px-4 py-2 text-lg font-bold mix-blend-multiply placeholder:text-base placeholder:font-normal placeholder:text-accent-color-50 focus-within:outline-none dark:mix-blend-normal lg:flex lg:bg-transparent"
              />
              <input
                id="searchInput-Mobile"
                type="text"
                placeholder={dictionary.ui.searchPlaceholder}
                onFocus={() => setSearchInputFocused(true)}
                onBlur={() => setSearchInputFocused(false)}
                value={searchInputValue()}
                onChange={(e) => setSearchInputValue(e.target.value)}
                class="w-full flex-1 rounded bg-transition-color-8 px-4 py-2 text-lg font-bold mix-blend-multiply backdrop-blur placeholder:font-normal placeholder:text-accent-color-50 dark:mix-blend-normal lg:hidden"
              />
              <Button
                ref={(el) => (searchButtonRef = el)}
                level="tertiary"
                icon={<Icon.Line.Search />}
                class="flex focus-within:outline-none lg:bg-transparent"
                onClick={() => {
                  setIsNullResult(true);
                  if (searchInputValue() === "" || searchInputValue() === null) {
                    setResultDialogOpened(false);
                    return;
                  }
                  if (!resultDialogOpened()) {
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
                      dictionary.db.models.monster,
                      monsterHiddenData,
                    ),
                    skills: searchInList(testSkillQueryData, searchValue, dictionary.db.models.skill, skillHiddenData),
                    crystals: searchInList(
                      testCrystalQueryData,
                      searchValue,
                      dictionary.db.models.crystal,
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
            </Motion.div>
            <Motion.div class="hidden w-60 flex-none lg:flex"></Motion.div>
          </Motion.div>
        </Motion.div>
        <Motion.div
          class={`Result flex h-full flex-col gap-1 overflow-hidden pt-0 lg:flex-row lg:p-0 ${
            resultDialogOpened()
              ? `flex-1 translate-y-0 p-3 lg:p-0}`
              : `flex-shrink-0 flex-grow-0 basis-[0%] translate-y-1/2 opacity-0`
          }`}
          style={
            resultDialogOpened()
              ? {
                  "clip-path": "inset(0% 0% 0% 0% round 12px)",
                "transition-duration": "0.5s",
                  "transition-timing-function": "ease-in-out",
                }
              : {
                  "clip-path": "inset(10% 50% 90% 50% round 12px)",
                  "transition-duration": "0.3s",
                  "transition-timing-function": "ease-out",
                }
          }
          // animate={resultDialogOpened() ? "open" : "closed"}
          // variants={{
          //   open: {
          //     flex: "1 1 0%",
          //     transform: "translateY(0px)",
          //     padding: isPC() ? "0rem" : "0.75rem",
          //     paddingTop: "0rem",
          //     // transitionEnd: {
          //     //   opacity: 1,
          //     // },
          //   },
          //   closed: {
          //     flex: "0 0 0%",
          //     transform: "translateY(50%)",
          //     padding: "0rem",
          //     opacity: 0,
          //   },
          // }}
        >
          {isNullResult() ? (
            <Motion.div class={`NullResult flex h-full flex-1 flex-col items-center justify-center gap-12 p-6 lg:p-0 ${
              resultDialogOpened() ? "opacity-100" : "opacity-0"
            }`}>
              <span class="NullResultWarring text-xl font-bold leading-loose lg:text-2xl">
                {dictionary.ui.root.nullSearchResultWarring}
              </span>
              <Motion.p
                class={`NullResultTips text-center leading-loose text-accent-color-70`}
                // variants={{
                //   open: {
                //     clipPath: "inset(0% 0% 0% 0% round 12px)",
                //     transition: {
                //       // type: "spring",
                //       // bounce: 0,
                //       duration: 0.7,
                //       // delayChildren: 0.3,
                //       // staggerChildren: 0.05,
                //     },
                //   },
                //   closed: {
                //     clipPath: "inset(10% 50% 90% 50% round 12px)",
                //     transition: {
                //       // type: "spring",
                //       // bounce: 0,
                //       duration: 0.3,
                //     },
                //   },
                // }}
              >
                {dictionary.ui.root.nullSearchResultTips.split("\n").map((line, index) => (
                  <Motion.span
                  // variants={{
                  //   open: {
                  //     opacity: 1,
                  //     y: 0,
                  //     // transition: { type: "spring", stiffness: 300, damping: 24 },
                  //   },
                  //   closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
                  // }}
                  >
                    {line}
                    <br />
                  </Motion.span>
                ))}
              </Motion.p>
            </Motion.div>
          ) : (
            <Motion.div
              class={`Content flex h-full flex-1 flex-col gap-2 overflow-y-auto rounded-md bg-transition-color-8 p-2 backdrop-blur-md`}
              style={
                resultDialogOpened()
                  ? {
                      "clip-path": "inset(0% 0% 0% 0% round 12px)",
                      "transition-duration": "0.7s",
                    }
                  : {
                      "clip-path": "inset(10% 50% 90% 50% round 12px)",
                      "transition-duration": "0.3s",
                    }
              }
              // variants={{
              //   open: {
              //     clipPath: "inset(0% 0% 0% 0% round 12px)",
              //     transition: {
              //       // type: "spring",
              //       // bounce: 0,
              //       duration: 0.7,
              //     },
              //   },
              //   closed: {
              //     clipPath: "inset(10% 50% 90% 50% round 12px)",
              //     transition: {
              //       // type: "spring",
              //       // bounce: 0,
              //       duration: 0.3,
              //     },
              //   },
              // }}
            >
              {Object.entries(searchResult()).map(([key, value], groupIndex) => {
                let icon: JSX.Element = null;
                let groupName = "未知分类";
                switch (key) {
                  case "skills":
                    icon = <Icon.Line.Basketball />;
                    groupName = dictionary.ui.root.skills;
                    break;
                  case "crystals":
                    icon = <Icon.Line.Box2 />;
                    groupName = dictionary.ui.root.crystals;
                    break;
                  case "monsters":
                    icon = <Icon.Line.Calendar />;
                    groupName = dictionary.ui.root.monsters;
                    break;
                  default:
                    break;
                }

                return (
                  value.length > 0 && (
                    <Motion.div class="RsultGroup flex flex-col gap-1">
                      <Motion.button
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
                      </Motion.button>
                      <Motion.div
                        class="Content flex flex-col gap-1"
                        // transition={{
                        //   ease: "easeInOut",
                        // }}
                        // variants={{
                        //   open: {
                        //     // transition: {
                        //     //   delayChildren: 0.3,
                        //     //   staggerChildren: 0.05,
                        //     // },
                        //   },
                        //   closed: {},
                        // }}
                      >
                        {value.map((item, index) => {
                          return (
                            <Motion.button
                              class={`Item group flex flex-col gap-1 ${resultListSate()[groupIndex] ? "" : "hidden"} rounded-md border border-transition-color-20 bg-primary-color p-3 animate-up opacity-0`}
                              style={{"animation-delay": `${0 + index * 0.07}s`}
                              }
                              // variants={{
                              //   open: {
                              //     opacity: 1,
                              //     y: 0,
                              //     // transition: { type: "spring", stiffness: 300, damping: 24 },
                              //   },
                              //   closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
                              // }}
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
                                    <Motion.div class="Related w-fit pr-2">
                                      <span>
                                        {related?.key}: {related?.value}
                                      </span>
                                    </Motion.div>
                                  );
                                })}
                              </div>
                              <Motion.div
                                class={`Data ${currentCardId() === item?.data.id ? "flex" : "hidden"} w-full flex-1 flex-wrap rounded-md bg-transition-color-8 p-1`}
                              >
                                {JSON.stringify(item?.data, null, 2)
                                  .split(",")
                                  .map((line, index) => (
                                    <Motion.span class="text-left lg:basis-1/4">
                                      {line}
                                      <br />
                                    </Motion.span>
                                  ))}
                              </Motion.div>
                            </Motion.button>
                          );
                        })}
                      </Motion.div>
                    </Motion.div>
                  )
                );
              })}
            </Motion.div>
          )}
        </Motion.div>
        <Motion.div
          class={`Bottom flex-none flex-col items-center bg-accent-color dark:bg-transition-color-8 lg:bg-transparent dark:lg:bg-transparent 
            ${resultDialogOpened() ? `opacity-0 p-0 h-0 overflow-hidden` : `opacity-100 p-6 lg:py-20 flex`}`}
          // animate={resultDialogOpened() ? "open" : "closed"}
          // variants={{
          //   open: {
          //     opacity: 0,
          //     padding: 0,
          //     display: "none",
          //   },
          //   closed: {
          //     opacity: 1,
          //     padding: "1.5rem",
          //     paddingTop: isPC() ? "5rem" : "1.5rem",
          //     paddingBottom: isPC() ? "5rem" : "1.5rem",
          //     display: "flex",
          //   },
          // }}
        >
          <div class="Content flex justify-center flex-wrap gap-3 rounded-md backdrop-blur lg:flex-1 lg:bg-transition-color-8 lg:p-3">
            <a href={"/monster"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Browser class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.monsters}</span>
              </Button>
            </a>
            <a href={"/skill"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Basketball class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.skills}</span>
              </Button>
            </a>
            <a href={"/equipment"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Category2 class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.equipments}</span>
              </Button>
            </a>
            <a href={"/crystal"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Box2 class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.crystals}</span>
              </Button>
            </a>
            <a href={"/pet"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Heart class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.pets}</span>
              </Button>
            </a>
            <a href={"/building"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Layers class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.items}</span>
              </Button>
            </a>
            <a href={"/character"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.User class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.character}</span>
              </Button>
            </a>
            <a href={"/analyze"} class="flex-none basis-[calc(33.33%-8px)] overflow-hidden lg:basis-auto">
              <Button
                class="group w-full flex-col rounded-md border-2 border-primary-color-10 bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color lg:px-4 lg:py-3"
                level="primary"
                icon={
                  <Icon.Filled.Gamepad class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary.ui.root.comboAnalyze}</span>
              </Button>
            </a>
          </div>
        </Motion.div>
      </Motion.div>
      <Filing />
    </MetaProvider>
  );
}
