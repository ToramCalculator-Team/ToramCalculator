import {
  type Column,
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  createSolidTable,
  flexRender,
} from "@tanstack/solid-table";
// import MonsterForm from "./monsterForm";
import Button from "~/components/button";
import * as Icon from "~/components/icon";
import Dialog from "~/components/dialog";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { setStore, store } from "~/store";
import { type SelectMonster, defaultSelectMonster, testMonsterQueryData } from "~/schema/monster";
import { createEffect, createSignal, For, JSX, onMount } from "solid-js";
import { getDictionary } from "~/i18n";
import { type $Enums } from "~/schema/enums";
import * as _ from "lodash-es";
import Fuse from "fuse.js";

// 通过基本列表生成包含其他星级定点boss属性的列表
const generateAugmentedMonsterList = (
  baseMonsterList: SelectMonster[],
  dictionary: ReturnType<typeof getDictionary>,
) => {
  const result: SelectMonster[] = [];
  baseMonsterList.forEach((monster) => {
    // 表中记录的是1星状态下的定点王数据， 2 / 3 / 4 星的经验和HP为1星的 2 / 5 / 10 倍；物防、魔防、回避值为1星的 2 / 4 / 6 倍。
    if (monster.monsterType !== "COMMON_BOSS") {
      result.push(monster);
    } else {
      result.push(
        {
          ...monster,
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[1],
        },
        {
          ...monster,
          id: monster.id + "**",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[2],
          baseLv: monster.baseLv !== null ? monster.baseLv + 10 : 0,
          experience: monster.experience !== null ? monster.experience * 2 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 2 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 2 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 2 : 0,
        },
        {
          ...monster,
          id: monster.id + "***",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[3],
          baseLv: monster.baseLv !== null ? monster.baseLv + 20 : 0,
          experience: monster.experience !== null ? monster.experience * 5 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 5 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 4 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 4 : 0,
          avoidance: monster.avoidance !== null ? monster.avoidance * 4 : 0,
        },
        {
          ...monster,
          id: monster.id + "****",
          name: monster.name + " " + dictionary.ui.monster.monsterDegreeOfDifficulty[4],
          baseLv: monster.baseLv !== null ? monster.baseLv + 40 : 0,
          experience: monster.experience !== null ? monster.experience * 10 : 0,
          maxhp: monster.maxhp !== null ? monster.maxhp * 10 : 0,
          physicalDefense: monster.physicalDefense !== null ? monster.physicalDefense * 6 : 0,
          magicalDefense: monster.magicalDefense !== null ? monster.magicalDefense * 6 : 0,
          avoidance: monster.avoidance !== null ? monster.avoidance * 6 : 0,
        },
      );
    }
  });
  return result;
};

// 弹出层同名怪物列表
const [sameNameMonsterList, setSameNameMonsterList] = createSignal<SelectMonster[]>([]);
const findSameNameMonsterInList = (monster: SelectMonster, monsterList: SelectMonster[]) => {
  const list: SelectMonster[] = [];
  monsterList.forEach((m) => {
    m.name === monster.name && m.monsterType === monster.monsterType && list.push(m);
  });
  // 按时间顺序排序
  return list.sort((monsterA, monsterB) => {
    const dateA = new Date(monsterA.updatedAt);
    const dateB = new Date(monsterB.updatedAt);
    return dateA.getTime() - dateB.getTime();
  });
};

export default function MonserPage() {
  // 状态管理参数
  const { augmented, monsterList, monsterDialogState, filterState } = store.monsterPage;
  const { monster } = store;
  const setAugmented = (newAugmented: boolean): void => {
    setStore("monsterPage", {
      augmented: newAugmented,
    });
  };
  const setMonsterList = (newList: SelectMonster[]): void => {
    setStore("monsterPage", {
      monsterList: newList,
    });
  };
  const setMonsterDialogState = (newState: boolean): void => {
    setStore("monsterPage", {
      monsterDialogState: newState,
    });
  };
  const setFilterState = (newState: boolean): void => {
    setStore("monsterPage", {
      filterState: newState,
    });
  };
  const setMonster = (newMonster: SelectMonster): void => {
    setStore("monster", newMonster);
  };

  // i18n字典
  const dictionary = getDictionary(store.settings.language);

  // table原始数据
  const [rawMonsterList, setRawMonsterList] = createSignal<SelectMonster[]>(testMonsterQueryData ?? []);

  // 定义Table不需要展示的列
  const monsterTableHiddenData: Array<keyof SelectMonster> = ["id", "address", "monsterType", "updatedByUserId"];

  // 搜索使用的基准列表
  let actualList = rawMonsterList();
  createEffect(() => {
    console.log("星级变化");
    actualList = augmented ? generateAugmentedMonsterList(rawMonsterList(), dictionary) : rawMonsterList();
  });

  // 搜索框行为函数
  // 定义搜索时需要忽略的数据
  const monsterSearchHiddenData: Array<keyof SelectMonster> = [
    "id",
    "experience",
    "radius",
    "difficultyOfMelee",
    "difficultyOfRanged",
    "difficultyOfTank",
    "updatedAt",
    "updatedByUserId",
    "createdAt",
    "createdByUserId",
  ];

  // 搜索
  const searchMonster = (value: string, list: SelectMonster[]) => {
    const fuse = new Fuse(list, {
      keys: Object.keys(defaultSelectMonster).filter(
        (key) => !monsterSearchHiddenData.includes(key as keyof SelectMonster),
      ),
    });
    return fuse.search(value).map((result) => result.item);
  };

  const handleSearchChange = (key: string) => {
    if (key === "" || key === null) {
      setMonsterList(actualList);
    } else {
      setMonsterList(searchMonster(key, actualList));
    }
  };

  setMonsterList(actualList);
  const table = createSolidTable({
    data: monsterList,
    columns: [
      {
        accessorKey: "id",
        header: () => dictionary.db.models.monster.id,
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "name",
        header: () => dictionary.db.models.monster.name,
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        accessorKey: "address",
        header: () => dictionary.db.models.monster.address,
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "monsterType",
        header: () => dictionary.db.models.monster.monsterType,
        cell: (info) => dictionary.db.enums.MonsterType[info.getValue<$Enums.MonsterType>()],
        size: 120,
      },
      {
        accessorKey: "element",
        header: () => dictionary.db.models.monster.element,
        cell: (info) => dictionary.db.enums.Element[info.getValue<$Enums.Element>()],
        size: 120,
      },
      {
        accessorKey: "baseLv",
        header: () => dictionary.db.models.monster.baseLv,
        size: 120,
      },
      {
        accessorKey: "experience",
        header: () => dictionary.db.models.monster.experience,
        size: 120,
      },
      {
        accessorKey: "physicalDefense",
        header: () => dictionary.db.models.monster.physicalDefense,
        size: 120,
      },
      {
        accessorKey: "physicalResistance",
        header: () => dictionary.db.models.monster.physicalResistance,
        size: 120,
      },
      {
        accessorKey: "magicalDefense",
        header: () => dictionary.db.models.monster.magicalDefense,
        size: 120,
      },
      {
        accessorKey: "magicalResistance",
        header: () => dictionary.db.models.monster.magicalResistance,
        size: 120,
      },
      {
        accessorKey: "criticalResistance",
        header: () => dictionary.db.models.monster.criticalResistance,
        size: 120,
      },
      {
        accessorKey: "avoidance",
        header: () => dictionary.db.models.monster.avoidance,
        size: 100,
      },
      {
        accessorKey: "dodge",
        header: () => dictionary.db.models.monster.dodge,
        size: 100,
      },
      {
        accessorKey: "block",
        header: () => dictionary.db.models.monster.block,
        size: 100,
      },
      {
        accessorKey: "updatedAt",
        header: dictionary.db.models.monster.updatedAt,
        cell: (info) => info.getValue<Date>().toLocaleDateString(),
        size: 100,
      },
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
    initialState: {
      sorting: [
        {
          id: "experience",
          desc: true, // 默认按热度降序排列
        },
      ],
    },
  });
  // 表头固定
  const getCommonPinningStyles = (column: Column<SelectMonster>): JSX.CSSProperties => {
    const isPinned = column.getIsPinned();
    const isLastLeft = isPinned === "left" && column.getIsLastColumn("left");
    const isFirstRight = isPinned === "right" && column.getIsFirstColumn("right");
    const styles: JSX.CSSProperties = {
      position: isPinned ? "sticky" : "relative",
      width: column.getSize().toString(),
      "z-index": isPinned ? 1 : 0,
    };
    if (isPinned) {
      styles.left = isLastLeft ? `${column.getStart("left")}px` : undefined;
      styles.right = isFirstRight ? `${column.getAfter("right")}px` : undefined;
      styles["border-width"] = isLastLeft ? "0px 2px 0px 0px" : isFirstRight ? "0px 0px 0px 2px" : undefined;
    }
    return styles;
  };

  onMount(() => {
    console.log("--Monster Client Render", actualList);
    // u键监听
    const handleUKeyPress = (e: KeyboardEvent) => {
      if (e.key === "u") {
        setStore("monster", defaultSelectMonster);
        setSameNameMonsterList([]);
        setStore("monsterPage", {
          monsterDialogState: true,
          monsterFormState: "CREATE",
        });
      }
    };
    document.addEventListener("keydown", handleUKeyPress);
    return () => {
      console.log("--Monster Client Unmount");
      document.removeEventListener("keydown", handleUKeyPress);
    };
  });

  return (
    <main class="flex flex-col lg:w-[calc(100dvw-96px)] lg:flex-row">
      {/* <div
        class={`Module1 pointer-events-none invisible fixed left-0 top-0 z-50 flex-none basis-[0px] -translate-x-full border-transition-color-8 bg-primary-color opacity-0 backdrop-blur-xl lg:sticky lg:z-0 lg:translate-x-0 lg:border-x-1.5 lg:bg-transition-color-8`}
      >
        <div
          class={`Content flex h-dvh w-dvw flex-col gap-4 overflow-y-auto px-6 pt-8 lg:absolute lg:left-0 lg:top-0 lg:w-[260px]`}
        >
          <div class="Title flex items-center justify-between">
            <h1 class="text-lg">{dictionary.ui.filter}</h1>
            <Button level="tertiary" onClick={() => setFilterState(!filterState)}>
              X
            </Button>
          </div>
        </div>
      </div> */}
      <div class="Module2 flex w-full flex-1 overflow-hidden px-3 backdrop-blur-xl">
        <div class="LeftArea sticky top-0 z-10 flex-1"></div>
        <div class={`ModuleContent h-[calc(100dvh-67px)] w-full flex-col overflow-auto lg:h-dvh lg:max-w-[1536px]`}>
          <div class="Title sticky left-0 mt-3 flex flex-col gap-9 py-5 lg:pt-20">
            <div class="Row flex flex-col items-center justify-between gap-10 lg:flex-row lg:justify-start lg:gap-4">
              <h1 class="Text text-left text-3xl lg:bg-transparent lg:text-4xl">{dictionary.ui.monster.pageTitle}</h1>
              <div class="Control flex flex-1 gap-2">
                <input
                  id="MonsterSearchBox"
                  type="search"
                  placeholder={dictionary.ui.searchPlaceholder}
                  class="w-full flex-1 rounded-sm border-transition-color-20 bg-transition-color-8 px-3 py-2 backdrop-blur-xl placeholder:text-accent-color-50 hover:border-accent-color-70 hover:bg-transition-color-8 focus:border-accent-color-70 focus:outline-none lg:flex-1 lg:rounded-none lg:border-b-1.5 lg:bg-transparent lg:px-5 lg:font-normal"
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <Button // 仅移动端显示
                  size="sm"
                  level="tertiary"
                  class="switch lg:hidden"
                  icon={<Icon.Line.Filter />}
                  onClick={() => setStore("monsterPage", { filterState: !filterState })}
                ></Button>
                <Button // 仅PC端显示
                  class="switch hidden lg:flex"
                  icon={<Icon.Line.Filter />}
                  onClick={() => setStore("monsterPage", { filterState: !filterState })}
                ></Button>
                <Button // 仅移动端显示
                  size="sm"
                  level="tertiary"
                  icon={<Icon.Line.CloudUpload />}
                  class="flex lg:hidden"
                  onClick={() => {
                    setStore("monster", defaultSelectMonster);
                    setSameNameMonsterList([]);
                    setStore("monsterPage", {
                      monsterDialogState: true,
                      monsterFormState: "CREATE",
                    });
                  }}
                ></Button>
                <Button // 仅PC端显示
                  level="primary"
                  icon={<Icon.Line.CloudUpload />}
                  class="hidden lg:flex"
                  onClick={() => {
                    setStore("monster", defaultSelectMonster);
                    setSameNameMonsterList([]);
                    setStore("monsterPage", {
                      monsterDialogState: true,
                      monsterFormState: "CREATE",
                    });
                  }}
                >
                  {dictionary.ui.actions.upload} [u]
                </Button>
              </div>
            </div>
            <div class="Content flex flex-col gap-2">
              <div
                class={`FilterBox flex overflow-y-auto rounded bg-transition-color-8 ${filterState ? "max-h-[50dvh]" : "max-h-0"}`}
              >
                <div
                  class={`Content flex h-fit flex-col gap-2 p-4 ${filterState ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} `}
                >
                  <div class="module flex flex-col gap-3">
                    <div class="title">{dictionary.ui.columnsHidden}</div>
                    <div class="content flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        level={table.getIsAllColumnsVisible() ? "tertiary" : "primary"}
                        onClick={table.getToggleAllColumnsVisibilityHandler()}
                      >
                        ALL
                      </Button>
                      {table.getAllLeafColumns().map((column) => {
                        if (monsterTableHiddenData.includes(column.id as keyof SelectMonster)) {
                          // 默认隐藏的数据
                          return;
                        }
                        return (
                          <Button
                            size="sm"
                            level={column.getIsVisible() ? "tertiary" : "primary"}
                            onClick={column.getToggleVisibilityHandler()}
                          >
                            {typeof dictionary.db.models.monster[column.id as keyof SelectMonster] === "string"
                              ? (dictionary.db.models.monster[column.id as keyof SelectMonster] as string)
                              : column.id}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div class="module flex flex-col gap-3">
                    <div class="title">{dictionary.ui.monster.augmented}</div>
                    <div class="content flex flex-wrap gap-2">
                      <Button level="tertiary" onClick={() => setStore("monsterPage", { augmented: !augmented })}>
                        {augmented ? "Yes" : "No"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="Discription my-3 hidden rounded-sm bg-transition-color-8 p-3 lg:block">
                {dictionary.ui.monster.description}
              </div>
            </div>
          </div>
          <table class="Table bg-transition-color-8 px-2 lg:bg-transparent">
            <thead class="TableHead sticky top-0 z-10 flex bg-primary-color">
              <For each={table.getHeaderGroups()}>
                {(headerGroup) => (
                  <tr class="flex min-w-full gap-0 border-b-2">
                    <For each={headerGroup.headers}>
                      {(header) => {
                        const { column } = header;
                        if (monsterTableHiddenData.includes(column.id as keyof SelectMonster)) {
                          // 默认隐藏的数据
                          return;
                        }
                        return (
                          <th
                            style={{
                              ...getCommonPinningStyles(column),
                              width: getCommonPinningStyles(column).width + "px",
                            }}
                            class="flex flex-col"
                          >
                            <div
                              {...{
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                              class={`border-1 flex-1 border-transition-color-8 px-3 py-4 text-left hover:bg-transition-color-8 lg:py-6 ${
                                header.column.getCanSort() ? "cursor-pointer select-none" : ""
                              }`}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: " ↓",
                                desc: " ↑",
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          </th>
                        );
                      }}
                    </For>
                  </tr>
                )}
              </For>
            </thead>
            <tbody class="TableBody relative mt-[54px] px-2 lg:mt-[84px]">
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <tr
                    class={`group flex cursor-pointer border-y-[1px] border-transition-color-8 transition-none hover:rounded hover:border-transparent hover:bg-transition-color-8 hover:font-bold lg:border-y-1.5`}
                  >
                    <For each={row.getVisibleCells()}>
                      {(cell) => {
                        const { column } = cell;
                        if (monsterTableHiddenData.includes(column.id as keyof SelectMonster)) {
                          // 默认隐藏的数据
                          return;
                        }
                        switch (cell.column.id as Exclude<keyof SelectMonster, keyof typeof monsterTableHiddenData>) {
                          case "name":
                            return (
                              <td
                                style={{
                                  ...getCommonPinningStyles(column),
                                  width: getCommonPinningStyles(column).width + "px",
                                }}
                                class="flex flex-col justify-center px-3 py-6 lg:py-8"
                              >
                                <span class="text-lg font-bold">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </span>
                                <span class="text-sm font-normal text-accent-color-70">
                                  {(row.getValue("address") === ("" ?? undefined ?? null) && "不知名的地方") ||
                                    row.getValue("address")}
                                </span>
                              </td>
                            );

                          case "element": {
                            const icon =
                              {
                                WATER: <Icon.ElementWater class="h-12 w-12" />,
                                FIRE: <Icon.ElementFire class="h-12 w-12" />,
                                EARTH: <Icon.ElementEarth class="h-12 w-12" />,
                                WIND: <Icon.ElementWind class="h-12 w-12" />,
                                LIGHT: <Icon.ElementLight class="h-12 w-12" />,
                                DARK: <Icon.ElementDark class="h-12 w-12" />,
                                NO_ELEMENT: <Icon.ElementNoElement class="h-12 w-12" />,
                              }[cell.getValue() as $Enums.Element] ?? undefined;
                            return (
                              <td
                                style={{
                                  ...getCommonPinningStyles(column),
                                  width: getCommonPinningStyles(column).width + "px",
                                }}
                                class={"flex flex-col justify-center px-3 py-6"}
                              >
                                {icon}
                              </td>
                            );
                          }

                          // 以下值需要添加百分比符号
                          case "physicalResistance":
                          case "magicalResistance":
                          case "dodge":
                          case "block":
                          case "normalAttackResistanceModifier":
                          case "physicalAttackResistanceModifier":
                          case "magicalAttackResistanceModifier":
                            return (
                              <td
                                style={{
                                  ...getCommonPinningStyles(column),
                                  width: getCommonPinningStyles(column).width + "px",
                                }}
                                class={`flex flex-col justify-center px-3 py-6`}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}%
                              </td>
                            );

                          case "criticalResistance":

                          default:
                            return (
                              <td
                                style={{
                                  ...getCommonPinningStyles(column),
                                  width: getCommonPinningStyles(column).width + "px",
                                }}
                                class={`flex flex-col justify-center px-3 py-6`}
                              >
                                {((cell) => {
                                  try {
                                    const content =
                                      dictionary.db.enums[
                                        cell.column.id.charAt(0).toLocaleUpperCase() + cell.column.id.slice(1)
                                      ][cell.getValue()];
                                    return content;
                                  } catch (error) {
                                    return flexRender(cell.column.columnDef.cell, cell.getContext());
                                  }
                                })(cell)}
                              </td>
                            );
                        }
                      }}
                    </For>
                  </tr>
                )}
              </For>
              {/* {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index]!;
                return (
                  <tr
                    style={{
                      position: "absolute",
                      transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                    }}
                    class={`group flex cursor-pointer border-y-[1px] border-transition-color-8 transition-none hover:rounded hover:border-transparent hover:bg-transition-color-8 hover:font-bold lg:border-y-1.5`}
                    onMouseDown={(e) => handleMouseDown(row.getValue("id"), e)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const { column } = cell;
                      if (monsterTableHiddenData.includes(column.id as keyof SelectMonster)) {
                        // 默认隐藏的数据
                        return;
                      }

                      switch (cell.column.id as Exclude<keyof SelectMonster, keyof typeof monsterTableHiddenData>) {
                        case "name":
                          return (
                            <td
                              style={{
                                ...getCommonPinningStyles(column),
                              }}
                              class="flex flex-col justify-center px-3 py-6 lg:py-8"
                            >
                              <span class="text-lg font-bold">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </span>
                              <span class="text-sm font-normal text-accent-color-70">
                                {(row.getValue("address") === ("" ?? undefined ?? null) && "不知名的地方") ||
                                  row.getValue("address")}
                              </span>
                            </td>
                          );

                        case "element": {
                          const icon =
                            {
                              WATER: <Icon.ElementWater class="h-12 w-12" />,
                              FIRE: <Icon.ElementFire class="h-12 w-12" />,
                              EARTH: <Icon.ElementEarth class="h-12 w-12" />,
                              WIND: <Icon.ElementWind class="h-12 w-12" />,
                              LIGHT: <Icon.ElementLight class="h-12 w-12" />,
                              DARK: <Icon.ElementDark class="h-12 w-12" />,
                              NO_ELEMENT: <Icon.ElementNoElement class="h-12 w-12" />,
                            }[cell.getValue() as $Enums.Element] ?? undefined;
                          return (
                            <td
                              style={{
                                ...getCommonPinningStyles(column),
                              }}
                              class={"flex flex-col justify-center px-3 py-6"}
                            >
                              {icon}
                            </td>
                          );
                        }

                        // 以下值需要添加百分比符号
                        case "physicalResistance":
                        case "magicalResistance":
                        case "dodge":
                        case "block":
                        case "normalAttackResistanceModifier":
                        case "physicalAttackResistanceModifier":
                        case "magicalAttackResistanceModifier":
                          return (
                            <td
                              style={{
                                ...getCommonPinningStyles(column),
                              }}
                              class={`flex flex-col justify-center px-3 py-6`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}%
                            </td>
                          );

                        case "criticalResistance":

                        default:
                          return (
                            <td
                              style={{
                                ...getCommonPinningStyles(column),
                              }}
                              class={`flex flex-col justify-center px-3 py-6`}
                            >
                              {((cell) => {
                                try {
                                  const content =
                                    dictionary.db.enums[
                                      cell.column.id.charAt(0).toLocaleUpperCase() + cell.column.id.slice(1)
                                    ][cell.getValue()];
                                  return content;
                                } catch (error) {
                                  return flexRender(cell.column.columnDef.cell, cell.getContext());
                                }
                              })(cell)}
                            </td>
                          );
                      }
                    })}
                  </tr>
                );
              })} */}
            </tbody>
          </table>
        </div>
        <div class="RightArea sticky top-0 z-10 flex-1"></div>
      </div>
      <Dialog
        state={monsterDialogState}
        setState={(dialogState) => setStore("monsterPage", { monsterDialogState: dialogState })}
      >
        {monsterDialogState && (
          <div class="Content flex w-full flex-col overflow-y-auto lg:flex-row 2xl:w-[1536px]">
            {sameNameMonsterList.length > 1 && (
              <div class="SameNameMonsterList flow-row flex flex-none basis-[8%] gap-1 overflow-x-auto overflow-y-hidden border-r-1.5 border-brand-color-1st p-3 lg:w-60 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                {sameNameMonsterList().map((currentMonster) => {
                  const order = sameNameMonsterList().indexOf(currentMonster) + 1;
                  return (
                    <Button
                      level="tertiary"
                      onClick={() => {
                        setStore("monster", currentMonster);
                      }}
                      active={currentMonster.id === monster.id}
                      class="SameNameMonster flex h-full basis-1/4 flex-col rounded-sm lg:h-auto lg:w-full lg:basis-auto"
                    >
                      <span class="w-full text-nowrap px-2 text-left text-lg lg:font-bold">{order}</span>
                      <span class="hidden text-left text-sm lg:block">{currentMonster.updatedAt.toLocaleString()}</span>
                    </Button>
                  );
                })}
              </div>
            )}
            {/* <div class="tab flex w-32 flex-col justify-center gap-1 border-r-1.5 border-brand-color-1st p-3"></div> */}
            {/* <MonsterForm
              dictionary={dictionary}
              rawMonsterList={rawMonsterList()}
              setRawMonsterList={setRawMonsterList}
            /> */}
          </div>
        )}
      </Dialog>
    </main>
  );
}
