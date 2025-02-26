import { createEffect, createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import Fuse from "fuse.js";
import {
  Cell,
  Column,
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import { createVirtualizer, Virtualizer } from "@tanstack/solid-virtual";
import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import * as _ from "lodash-es";

import { defaultImage } from "~/repositories/image";
import { type Skill, SkillDic, defaultSkill, findSkillById, findSkills } from "~/repositories/skill";
import { FormSate, setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Dialog from "~/components/controls/dialog";
import Button from "~/components/controls/button";
import { type Enums } from "~/repositories/enums";
import { findSimulatorById } from "~/repositories/simulator";
import NodeEditor from "~/components/module/nodeEditor";
import { updateSkillEffect } from "~/repositories/skillEffect";
import { DicEnumsKeys, DicEnumsKeysValue } from "~/locales/dictionaries/type";

const skillTableHiddenData: Array<keyof Skill> = ["id"];
// 表头固定
const getCommonPinningStyles = (column: Column<Skill>): JSX.CSSProperties => {
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

function SkillTableTd(props: { cell: Cell<Skill, keyof Skill> }) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);

  switch (props.cell.column.id as Exclude<keyof Skill, keyof typeof skillTableHiddenData>) {
    case "name":
      setTdContent(
        <>
          <span class="pb-1">{props.cell.getValue()}</span>
          {/* <span class="pb-1">{row.original.name}</span> */}
          {/* <span class="text-sm font-normal text-main-text-color">
            {row.getValue("belongToZones") ?? "无"}
          </span> */}
        </>,
      );
      break;

    default:
      setTdContent(flexRender(props.cell.column.columnDef.cell, props.cell.getContext()));
      break;
  }

  return (
    <td
      style={{
        ...getCommonPinningStyles(props.cell.column),
        width: getCommonPinningStyles(props.cell.column).width + "px",
      }}
      class={"flex flex-col justify-center py-6"}
    >
      <Show
        when={
          Object.keys(dictionary().enums).includes(
            "Skill" + props.cell.column.id.charAt(0).toLocaleUpperCase() + props.cell.column.id.slice(1),
          ) &&
          Object.keys(
            dictionary().enums[
              ("Skill" +
                props.cell.column.id.charAt(0).toLocaleUpperCase() +
                props.cell.column.id.slice(1)) as DicEnumsKeys
            ],
          ).includes(props.cell.getValue())
        }
        fallback={tdContent()}
      >
        {dictionary().enums.SkillTreeType.BladeSkill}
      </Show>
    </td>
  );
}

export default function SkillIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(true);
  const [dialogState, setDialogState] = createSignal(false);
  const [formState, setFormState] = createSignal<FormSate>("CREATE");
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(1);
  const setSkillFormState = (newState: FormSate): void => {
    setStore("wiki", "skillPage", {
      skillFormState: newState,
    });
  };
  const setSkillList = (newList: Skill[]): void => {
    setStore("wiki", "skillPage", {
      skillList: newList,
    });
  };
  const setFilterState = (newState: boolean): void => {
    setStore("wiki", "skillPage", {
      filterState: newState,
    });
  };
  const setSkill = (newSkill: Skill): void => {
    setStore("wiki", "skillPage", "skillId", newSkill.id);
  };

  // table原始数据------------------------------------------------------------

  const [skillList, { refetch: refetchSkillList }] = createResource(findSkills);
  const [skill, { refetch: refetchSkill }] = createResource(() => findSkillById(store.wiki.skillPage.skillId));

  // table
  const columns: ColumnDef<Skill>[] = [
    {
      accessorKey: "id",
      header: () => SkillDic(store.settings.language).id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => SkillDic(store.settings.language).name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "treeType",
      header: () => SkillDic(store.settings.language).treeType,
      cell: (info) => dictionary().enums.SkillTreeType[info.getValue<Enums["SkillTreeType"]>()],
      size: 120,
    },
    {
      accessorKey: "tier",
      header: () => SkillDic(store.settings.language).tier,
      cell: (info) => info.getValue(),
      size: 120,
    },
  ];
  const table = createMemo(() => {
    if (!skillList()) {
      return undefined;
    }
    return createSolidTable({
      get data() {
        return skillList() ?? []; // 使用 getter 确保表格能动态响应数据的变化
      },
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      debugTable: true,
      initialState: {
        sorting: [
          {
            id: "tier",
            desc: true, // 默认按热度降序排列
          },
        ],
      },
    });
  });

  // 列表虚拟化区域----------------------------------------------------------
  const [virtualScrollElement, setVirtualScrollElement] = createSignal<OverlayScrollbarsComponentRef | undefined>(
    undefined,
  );

  const [virtualizer, setVirtualizer] = createSignal<Virtualizer<HTMLElement, Element> | undefined>(undefined);

  // 搜索使用的基准列表--------------------------------------------------------
  let actualList = skillList() ?? [];

  // 搜索框行为函数
  // 定义搜索时需要忽略的数据
  const skillSearchHiddenData: Array<keyof Skill> = ["id", "updatedByAccountId", "createdByAccountId"];

  // 搜索
  const searchSkill = (value: string, list: Skill[]) => {
    const fuse = new Fuse(list, {
      keys: Object.keys(defaultSkill).filter((key) => !skillSearchHiddenData.includes(key as keyof Skill)),
    });
    return fuse.search(value).map((result) => result.item);
  };

  const handleSearchChange = (key: string) => {
    if (key === "" || key === null) {
      console.log(actualList);
    } else {
      console.log(searchSkill(key, actualList));
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
        const parent = virtualScrollElement()?.osInstance()?.elements().viewport?.parentElement;
        if (parent) {
          parent.style.transition = "none";
          parent.style.transition = "none";
          // parent.scrollTop -= offsetY / 100;
          parent.scrollLeft += offsetX / 100;
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (!isDragging) {
        console.log(id);
        const targetSkill = (skillList() ?? []).find((skill) => skill.id === id);
        if (targetSkill) {
          setSkill(targetSkill);
          setDialogState(true);
          setSkillFormState("DISPLAY");
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleUKeyPress = (e: KeyboardEvent) => {
    if (e.key === "u") {
      setStore("wiki", "skillPage", {
        skillDialogState: true,
        skillFormState: "CREATE",
      });
    }
  };

  createEffect(() => {
    setVirtualizer(
      createVirtualizer({
        get count() {
          return table()?.getRowCount() ?? 0;
        },
        getScrollElement: () => {
          return virtualScrollElement()?.osInstance()?.elements().viewport ?? null;
        },
        estimateSize: () => 96,
        overscan: 5,
      }),
    );
  });

  // u键监听
  onMount(() => {
    console.log("--Skill Client Render");
    // u键监听
    document.addEventListener("keydown", handleUKeyPress);
  });

  onCleanup(() => {
    console.log("--Skill Client Unmount");
    document.removeEventListener("keydown", handleUKeyPress);
  });

  return (
    <>
      <Presence exitBeforeEnter>
        <Show when={!isFormFullscreen()}>
          <Motion.div
            class="Title hidden flex-col p-3 lg:flex lg:pt-12"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: 0 }}
          >
            <div class="Content flex flex-row items-center justify-between gap-4 py-3">
              <h1 class="Text lg: text-left text-[2.5rem] leading-[50px] lg:bg-transparent lg:leading-[48px]">
                {dictionary().ui.skill.pageTitle}
              </h1>
              <input
                id="SkillSearchBox"
                type="search"
                placeholder={dictionary().ui.searchPlaceholder}
                class="h-[50px] w-full flex-1 rounded-none border-b-2 border-dividing-color bg-transparent px-3 py-2 backdrop-blur-xl placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <Button // 仅移动端显示
                size="sm"
                icon={<Icon.Line.CloudUpload />}
                class="flex lg:hidden"
                onClick={() => {
                  setSkill(defaultSkill);
                  setStore("wiki", "skillPage", {
                    skillDialogState: true,
                    skillFormState: "CREATE",
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setSkill(defaultSkill);
                  setStore("wiki", "skillPage", {
                    skillDialogState: true,
                    skillFormState: "CREATE",
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
            class="Banner hidden h-[260px] flex-initial gap-3 p-3 opacity-0 lg:flex"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: 0 }}
          >
            {/* <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
              <div
                class={`banner1 flex-none overflow-hidden rounded ${activeBannerIndex() === 1 ? "active shadow-lg shadow-dividing-color" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(1)}
                style={{
                  "background-image": `url(${skillList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? skillList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-1st p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.1</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{skillList()?.[0]?.name[store.settings.language]}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 2 ? "active shadow-lg shadow-dividing-color" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(2)}
                style={{
                  "background-image": `url(${skillList()?.[1]?.image.dataUrl !== `"data:image/png;base64,"` ? skillList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-2nd p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.2</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{skillList()?.[1]?.name[store.settings.language]}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 3 ? "active shadow-lg shadow-dividing-color" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(3)}
                style={{
                  "background-image": `url(${skillList()?.[2]?.image.dataUrl !== `"data:image/png;base64,"` ? skillList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask hidden h-full flex-col justify-center gap-2 bg-brand-color-3rd p-8 text-primary-color lg:flex">
                  <span class="text-3xl font-bold">Top.3</span>
                  <div class="h-[1px] w-[110px] bg-primary-color"></div>
                  <span class="text-xl">{skillList()?.[2]?.name[store.settings.language]}</span>
                </div>
              </div>
            </div> */}
          </Motion.div>
        </Show>
      </Presence>
      <div class="Table&News flex flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
        <div class="TableModule flex flex-1 flex-col overflow-hidden">
          <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
            <div class={`Text text-xl ${isFormFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
              {dictionary().ui.skill.table.title}
            </div>
            <div
              class={`Description flex-1 rounded bg-area-color p-3 opacity-0 ${isFormFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().ui.skill.table.description}
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
          <Show when={table()}>
            <OverlayScrollbarsComponent
              element="div"
              options={{ scrollbars: { autoHide: "scroll" } }}
              ref={setVirtualScrollElement}
            >
              {/* <div ref={virtualScrollElement!} class="TableBox VirtualScroll overflow-auto flex-1"> */}
              <table class="Table relative w-full">
                <thead class={`TableHead sticky top-0 z-10 flex`}>
                  <For each={table()!.getHeaderGroups()}>
                    {(headerGroup) => (
                      <tr class="flex min-w-full gap-0 border-b-2 border-dividing-color">
                        <For each={headerGroup.headers}>
                          {(header) => {
                            const { column } = header;
                            if (skillTableHiddenData.includes(column.id as keyof Skill)) {
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
                                  class={`flex-1 py-4 text-left font-normal hover:bg-area-color ${isFormFullscreen() ? "lg:py-6" : "lg:py-3"} ${
                                    header.column.getCanSort() ? "cursor-pointer select-none" : ""
                                  }`}
                                >
                                  {SkillDic(store.settings.language)[column.id as keyof Skill] as string}
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
                <tbody style={{ height: `${virtualizer()?.getTotalSize()}px` }} class={`TableBodyrelative`}>
                  <For each={virtualizer()?.getVirtualItems()}>
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
                          class={`group flex cursor-pointer border-b border-area-color transition-none hover:rounded hover:border-transparent hover:bg-area-color hover:font-bold`}
                          onMouseDown={(e) => handleMouseDown(row.getValue("id"), e)}
                        >
                          <For
                            each={row
                              .getVisibleCells()
                              .filter((cell) => !skillTableHiddenData.includes(cell.column.id as keyof Skill))}
                          >
                            {(cell) => <SkillTableTd cell={cell} />}
                          </For>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
              {/* </div> */}
            </OverlayScrollbarsComponent>
          </Show>
        </div>
        <Presence exitBeforeEnter>
          <Show when={!isFormFullscreen()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
            >
              <div class="Title flex h-12 text-xl">{dictionary().ui.skill.news.title}</div>
              <div class="Content flex flex-1 flex-col bg-area-color"></div>
            </Motion.div>
          </Show>
        </Presence>
      </div>
      <Dialog state={dialogState()} setState={setDialogState}>
        {/* <pre>{JSON.stringify(skill(), null, 2)}</pre> */}
        <NodeEditor
          data={async () => {
            await refetchSkill();
            return skill()!.effects[0].logic as Record<string, any>;
          }}
          setData={async (data) => {
            const curSkillEffect = skill()?.effects[0];
            if (!curSkillEffect) return;
            // console.log("/////");
            await updateSkillEffect(curSkillEffect.id, { ...curSkillEffect, logic: data });
          }}
        />
      </Dialog>
    </>
  );
}
