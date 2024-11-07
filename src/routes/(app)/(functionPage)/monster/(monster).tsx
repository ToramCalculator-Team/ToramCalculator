import Button from "~/components/ui/button";
import * as Icon from "~/lib/icon";
import Dialog from "~/components/ui/dialog";
import { FormSate, setStore, store } from "~/store";
import { type Monster, defaultMonster, findMonsters } from "~/repositories/monster";
import { $Enums } from "@prisma/client";
import { createEffect, createMemo, createResource, createSignal, For, JSX, onMount, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import * as _ from "lodash-es";
import Fuse from "fuse.js";
import { generateAugmentedMonsterList } from "~/lib/untils/monster";
import {
  Column,
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { defaultImage } from "~/repositories/image";

export default function MonsterIndexPage() {
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(false);
  const [dialogState, setDialogState] = createSignal(false);
  const [formState, setFormState] = createSignal<FormSate>("CREATE");
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(1);
  const setMonsterFormState = (newState: FormSate): void => {
    setStore("monsterPage", {
      monsterFormState: newState,
    });
  };
  const setAugmented = (newAugmented: boolean): void => {
    setStore("monsterPage", {
      augmented: newAugmented,
    });
  };
  const setMonsterList = (newList: Monster[]): void => {
    setStore("monsterPage", {
      monsterList: newList,
    });
  };
  const setFilterState = (newState: boolean): void => {
    setStore("monsterPage", {
      filterState: newState,
    });
  };
  const setMonster = (newMonster: Monster): void => {
    setStore("monsterPage", "monsterId", newMonster.id);
  };

  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  // table原始数据------------------------------------------------------------

  const [monsterList, { refetch: refetchMonsterList }] = createResource(findMonsters);
  // table
  const columns: ColumnDef<Monster>[] = [
    {
      accessorKey: "id",
      header: () => dictionary().db.models.monster.id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => dictionary().db.models.monster.name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "address",
      header: () => dictionary().db.models.monster.address,
      cell: (info) => info.getValue(),
      size: 150,
    },
    {
      accessorKey: "monsterType",
      header: () => dictionary().db.models.monster.monsterType,
      cell: (info) => dictionary().db.enums.MonsterType[info.getValue<$Enums.MonsterType>()],
      size: 120,
    },
    {
      accessorKey: "element",
      header: () => dictionary().db.models.monster.element,
      cell: (info) => dictionary().db.enums.Element[info.getValue<$Enums.Element>()],
      size: 120,
    },
    {
      accessorKey: "baseLv",
      header: () => dictionary().db.models.monster.baseLv,
      size: 120,
    },
    {
      accessorKey: "experience",
      header: () => dictionary().db.models.monster.experience,
      size: 120,
    },
    {
      accessorKey: "physicalDefense",
      header: () => dictionary().db.models.monster.physicalDefense,
      size: 120,
    },
    {
      accessorKey: "physicalResistance",
      header: () => dictionary().db.models.monster.physicalResistance,
      size: 120,
    },
    {
      accessorKey: "magicalDefense",
      header: () => dictionary().db.models.monster.magicalDefense,
      size: 120,
    },
    {
      accessorKey: "magicalResistance",
      header: () => dictionary().db.models.monster.magicalResistance,
      size: 120,
    },
    {
      accessorKey: "criticalResistance",
      header: () => dictionary().db.models.monster.criticalResistance,
      size: 120,
    },
    {
      accessorKey: "avoidance",
      header: () => dictionary().db.models.monster.avoidance,
      size: 100,
    },
    {
      accessorKey: "dodge",
      header: () => dictionary().db.models.monster.dodge,
      size: 100,
    },
    {
      accessorKey: "block",
      header: () => dictionary().db.models.monster.block,
      size: 100,
    },
    {
      accessorKey: "updatedAt",
      header: dictionary().db.models.monster.updatedAt,
      cell: (info) => info.getValue<Date>().toLocaleDateString(),
      size: 100,
    },
  ];
  const table = createMemo(() => {
    if (!monsterList()) {
      return undefined;
    }
    return createSolidTable({
      get data() {
        return monsterList() ?? []; // 使用 getter 确保表格能动态响应数据的变化
      },
      columns,
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
  });
  const monsterTableHiddenData: Array<keyof Monster> = ["id", "address", "monsterType", "updatedByUserId"];
  // 表头固定
  const getCommonPinningStyles = (column: Column<Monster>): JSX.CSSProperties => {
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

  // 列表虚拟化区域----------------------------------------------------------
  let virtualScrollElement: HTMLDivElement | undefined;

  const virtualizer = createMemo(() => {
    return createVirtualizer({
      get count() {
        return table() ? table()!.getRowModel().rows.length : 0;
      },
      getScrollElement: () => virtualScrollElement ?? null,
      estimateSize: () => 96,
      overscan: 5,
    });
  });

  // 搜索使用的基准列表--------------------------------------------------------
  let actualList = generateAugmentedMonsterList(monsterList() ?? [], dictionary());

  // 搜索框行为函数
  // 定义搜索时需要忽略的数据
  const monsterSearchHiddenData: Array<keyof Monster> = [
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
  const searchMonster = (value: string, list: Monster[]) => {
    const fuse = new Fuse(list, {
      keys: Object.keys(defaultMonster).filter((key) => !monsterSearchHiddenData.includes(key as keyof Monster)),
    });
    return fuse.search(value).map((result) => result.item);
  };

  const handleSearchChange = (key: string) => {
    if (key === "" || key === null) {
      console.log(actualList);
    } else {
      console.log(searchMonster(key, actualList));
    }
  };

  const handleMouseDown = (id: string, e: MouseEvent) => {
    if (e.button !== 0) return;
    const startX = e.pageX;
    const startY = e.pageY;
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      offsetX = e.pageX - startX;
      offsetY = e.pageY - startY;
      if (!isDragging) {
        // 判断是否开始拖动
        isDragging = Math.abs(offsetX) > 3 || Math.abs(offsetY) > 3;
      }
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        if (virtualScrollElement?.parentElement) {
          virtualScrollElement.style.transition = "none";
          virtualScrollElement.parentElement.style.transition = "none";
          // virtualScrollElement.scrollTop -= offsetY / 100;
          virtualScrollElement.scrollLeft += offsetX / 100;
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (!isDragging) {
        console.log(id);
        const targetMonster = (monsterList() ?? []).find((monster) => monster.id === id);
        if (targetMonster) {
          setMonster(targetMonster);
          setDialogState(true);
          setMonsterFormState("DISPLAY");
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // u键监听
  onMount(() => {
    console.log("--Monster Client Render");
    // u键监听
    const handleUKeyPress = (e: KeyboardEvent) => {
      if (e.key === "u") {
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
    <main class="flex h-[calc(100dvh-67px)] w-full flex-col overflow-hidden lg:h-dvh">
      <Presence exitBeforeEnter>
        <Show when={!isFormFullscreen()}>
          <Motion.div class="Title hidden lg:flex flex-col p-3 lg:pt-12" animate={{ opacity: [0, 1] }} exit={{ opacity: 0 }}>
            <div class="Content flex flex-row items-center justify-between gap-4 py-3">
              <h1 class="Text lg: text-left text-[2.5rem] leading-[50px] lg:bg-transparent lg:leading-[48px]">
                {dictionary().ui.monster.pageTitle}
              </h1>
              <input
                id="MonsterSearchBox"
                type="search"
                placeholder={dictionary().ui.searchPlaceholder}
                class="h-[50px] w-full flex-1 rounded-none border-b-2 border-transition-color-20 bg-transparent px-3 py-2 backdrop-blur-xl placeholder:text-accent-color-50 hover:border-accent-color-70 focus:border-accent-color-70 focus:outline-none lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <Button // 仅移动端显示
                size="sm"
                icon={<Icon.Line.CloudUpload />}
                class="flex lg:hidden"
                onClick={() => {
                  setMonster(defaultMonster);
                  setStore("monsterPage", {
                    monsterDialogState: true,
                    monsterFormState: "CREATE",
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setMonster(defaultMonster);
                  setStore("monsterPage", {
                    monsterDialogState: true,
                    monsterFormState: "CREATE",
                  });
                }}
              >
                {dictionary().ui.actions.upload} [u]
              </Button>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <Presence exitBeforeEnter>
        <Show when={!isFormFullscreen()}>
          <Motion.div
            class="Banner hidden lg:flex h-[260px] flex-initial gap-3 p-3 opacity-0"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: 0 }}
          >
            <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
              <div
                class={`banner1 flex-none overflow-hidden rounded ${activeBannerIndex() === 1 ? "active shadow-lg shadow-transition-color-20" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(1)}
                style={{
                  "background-image": `url(${monsterList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? monsterList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-1st p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.1</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{monsterList()?.[0]?.name}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 2 ? "active shadow-lg shadow-transition-color-20" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(2)}
                style={{
                  "background-image": `url(${monsterList()?.[1]?.image.dataUrl !== `"data:image/png;base64,"` ? monsterList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-2nd p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.2</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{monsterList()?.[1]?.name}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 3 ? "active shadow-lg shadow-transition-color-20" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(3)}
                style={{
                  "background-image": `url(${monsterList()?.[2]?.image.dataUrl !== `"data:image/png;base64,"` ? monsterList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-3rd p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.3</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{monsterList()?.[2]?.name}</span>
                </div>
              </div>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <div class="Table&News flex flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
        <div class="TableModule flex flex-1 flex-col overflow-hidden">
          <div class="Title hidden lg:flex h-12 w-full items-center gap-3">
            <div class={`Text text-xl ${isFormFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
              {dictionary().ui.monster.table.title}
            </div>
            <div
              class={`Description flex-1 rounded bg-transition-color-8 p-3 opacity-0 ${isFormFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().ui.monster.table.description}
            </div>
            <Button
              level="quaternary"
              onClick={() => {
                setIsFormFullscreen(!isFormFullscreen());
              }}
            >
              {isFormFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
            </Button>
          </div>
          <OverlayScrollbarsComponent element="div" options={{ scrollbars: { autoHide: "scroll" } }}>
            <Show when={table()}>
              <div ref={virtualScrollElement!} class="TableBox VirtualScroll flex-1">
                <table class="Table">
                  <thead class="TableHead sticky top-0 z-10 flex bg-primary-color">
                    <For each={table()!.getHeaderGroups()}>
                      {(headerGroup) => (
                        <tr class="flex min-w-full gap-0 border-b-2 border-transition-color-20">
                          <For each={headerGroup.headers}>
                            {(header) => {
                              const { column } = header;
                              if (monsterTableHiddenData.includes(column.id as keyof Monster)) {
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
                                    class={`flex-1 py-4 text-left font-normal hover:bg-transition-color-8 ${isFormFullscreen() ? "lg:py-6" : "lg:py-3"} ${
                                      header.column.getCanSort() ? "cursor-pointer select-none" : ""
                                    }`}
                                  >
                                    {dictionary().db.models.monster[column.id as keyof Monster] as string}
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
                  <tbody style={{ height: `${virtualizer().getTotalSize()}px` }} class="TableBody relative">
                    <For each={virtualizer().getVirtualItems()}>
                      {(virtualRow) => {
                        const row = table()!.getRowModel().rows[virtualRow.index];
                        return (
                          <tr
                            data-index={virtualRow.index}
                            // ref={(node) => virtualizer.measureElement(node)}
                            style={{
                              position: "absolute",
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            class={`group flex cursor-pointer border-b border-transition-color-8 transition-none hover:rounded hover:border-transparent hover:bg-transition-color-8 hover:font-bold`}
                            onMouseDown={(e) => handleMouseDown(row.getValue("id"), e)}
                          >
                            <For each={row.getVisibleCells()}>
                              {(cell) => {
                                const { column } = cell;
                                if (monsterTableHiddenData.includes(column.id as keyof Monster)) {
                                  // 默认隐藏的数据
                                  return;
                                }

                                let tdContent: JSX.Element;

                                switch (cell.column.id as Exclude<keyof Monster, keyof typeof monsterTableHiddenData>) {
                                  case "name":
                                    tdContent = (
                                      <>
                                        <span class="pb-1">
                                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </span>
                                        <span class="text-sm font-normal text-accent-color-70">
                                          {row.getValue("address") ?? "未知"}
                                        </span>
                                      </>
                                    );
                                    break;

                                  case "element":
                                    {
                                      const icon =
                                        {
                                          WATER: <Icon.Element.Water class="h-12 w-12" />,
                                          FIRE: <Icon.Element.Fire class="h-12 w-12" />,
                                          EARTH: <Icon.Element.Earth class="h-12 w-12" />,
                                          WIND: <Icon.Element.Wind class="h-12 w-12" />,
                                          LIGHT: <Icon.Element.Light class="h-12 w-12" />,
                                          DARK: <Icon.Element.Dark class="h-12 w-12" />,
                                          NO_ELEMENT: <Icon.Element.NoElement class="h-12 w-12" />,
                                        }[cell.getValue() as $Enums.Element] ?? undefined;
                                      tdContent = icon;
                                    }
                                    break;

                                  // 以下值需要添加百分比符号
                                  case "physicalResistance":
                                  case "magicalResistance":
                                  case "dodge":
                                  case "block":
                                  case "normalAttackResistanceModifier":
                                  case "physicalAttackResistanceModifier":
                                  case "magicalAttackResistanceModifier":
                                    tdContent = <>{flexRender(cell.column.columnDef.cell, cell.getContext())}%</>;
                                    break;

                                  case "criticalResistance":

                                  default:
                                    try {
                                      const content =
                                        dictionary().db.enums[
                                          (cell.column.id.charAt(0).toLocaleUpperCase() +
                                            cell.column.id.slice(1)) as keyof typeof $Enums
                                        ][cell.getValue() as keyof (typeof $Enums)[keyof typeof $Enums]];
                                      tdContent = content;
                                    } catch (error) {
                                      tdContent = flexRender(cell.column.columnDef.cell, cell.getContext());
                                    }
                                    break;
                                }

                                return (
                                  <td
                                    style={{
                                      ...getCommonPinningStyles(column),
                                      width: getCommonPinningStyles(column).width + "px",
                                    }}
                                    class={"flex flex-col justify-center py-6"}
                                  >
                                    {tdContent}
                                  </td>
                                );
                              }}
                            </For>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </OverlayScrollbarsComponent>
        </div>
        <Presence exitBeforeEnter>
          <Show when={!isFormFullscreen()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              class="News hidden lg:flex w-[248px] flex-initial flex-col gap-2"
            >
              <div class="Title flex h-12 text-xl">{dictionary().ui.monster.news.title}</div>
              <div class="Content flex flex-1 flex-col bg-transition-color-8"></div>
            </Motion.div>
          </Show>
        </Presence>
      </div>
      <Dialog state={dialogState()} setState={setDialogState}>
        {"emmm..."}
      </Dialog>
    </main>
  );
}
