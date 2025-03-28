import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onMount,
  Resource,
  Show,
} from "solid-js";
import { Cell, Column, ColumnDef, createSolidTable, getCoreRowModel, getSortedRowModel } from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { setStore, store } from "~/store";
import { type Locale } from "~/locales/i18n";
import { ConvertToAllString } from "~/repositories/client/untils";
import { DB } from "../../../db/clientDB/kysely/kyesely";

export default function VirtualTable<
  Item extends {
    [key: string]: unknown;
    id: string;
  },
>(props: {
  tableName: keyof DB;
  itemList: Resource<Item[]>;
  itemDic: (locale: Locale) => ConvertToAllString<Item>;
  tableColumns: ColumnDef<Item>[];
  tableHiddenColumns: Array<keyof Item>;
  tableTdGenerator: (props: { cell: Cell<Item, keyof Item> }) => JSX.Element;
}) {
  // 列固定
  const getCommonPinningStyles = (column: Column<Item>): JSX.CSSProperties => {
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
        const parent = virtualScrollRef()?.osInstance()?.elements().viewport?.parentElement;
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
        setStore("wiki", props.tableName, "dialogState", true);
        setStore("wiki", props.tableName, "formState", "DISPLAY");
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 列表虚拟化区域----------------------------------------------------------
  const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);

  // const table = createMemo(() => {
  //   // console.log(props.itemList().length);
  //   return createSolidTable({
  //     data: props.itemList() ?? [],
  //     columns: props.tableColumns,
  //     getCoreRowModel: getCoreRowModel(),
  //     getSortedRowModel: getSortedRowModel(),
  //     debugTable: true,
  //     initialState: {
  //       sorting: [
  //         {
  //           id: "experience",
  //           desc: true, // 默认按热度降序排列
  //         },
  //       ],
  //     },
  //   });
  // });

  // 只在初始化时创建 `table`
  const table = createSolidTable({
    data: props.itemList.latest ?? [],
    columns: props.tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
    initialState: {
      sorting: [
        {
          id: "experience",
          desc: true, // 默认按经验值降序排列
        },
      ],
    },
  });

  // 创建 `virtualizer`
  const virtualizer = createVirtualizer({
    count: table.getRowCount(),
    getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
    estimateSize: () => 96,
    overscan: 5,
    // debug: true,
  });

  // const virtualizer = createMemo(() => {
  //   console.log("Virtualizer Memo", table().getRowCount());
  //   return createVirtualizer({
  //     count: table().getRowCount() ?? 0,
  //     getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
  //     estimateSize: () => 96,
  //     overscan: 5,
  //   });
  // });

  const tableBodyDom = createMemo(() => {
    return (
      <tbody style={{ height: `${virtualizer.getTotalSize()}px` }} class={`TableBodyrelative`}>
        <For each={virtualizer.getVirtualItems()}>
          {(virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            if (!row) {
              return null;
            }
            return (
              <tr
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onMouseDown={(e) => handleMouseDown(row.getValue("id"), e)}
                onMouseEnter={(e) => setStore("wiki", props.tableName, "id", row.getValue("id"))} // 悬停时直接触发新数据获取，优化pc端表现
                class={`group border-area-color hover:bg-area-color flex cursor-pointer border-b transition-none hover:rounded hover:border-transparent hover:font-bold`}
              >
                <For
                  each={row
                    .getVisibleCells()
                    .filter((cell) => !props.tableHiddenColumns.includes(cell.column.id as keyof Item))}
                >
                  {(cell) => props.tableTdGenerator({ cell })}
                </For>
              </tr>
            );
          }}
        </For>
      </tbody>
    );
  });

  createEffect(async () => {
    const list = props.itemList() ?? [];
    table.setOptions((prev) => ({
      ...prev,
      data: list,
    }));
    virtualizer.options.count = list.length;
    setTimeout(() => {
      virtualizer._willUpdate();
      console.log(
        "TableRows:",
        JSON.stringify(table.getRowCount()),
        "VirtualCount:",
        JSON.stringify(virtualizer.getVirtualIndexes().length),
        "VirtualItems:",
        JSON.stringify(virtualizer.getVirtualItems().length),
        Math.floor(performance.now()),
      );
    }, 1);
  });

  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      ref={setVirtualScrollRef}
      class="h-full"
    >
      <table class="Table relative w-full">
        <thead class={`TableHead bg-primary-color sticky top-0 z-10 flex`}>
          <For each={table.getHeaderGroups()}>
            {(headerGroup) => (
              <tr class="border-dividing-color flex min-w-full gap-0 border-b-2">
                <For each={headerGroup.headers}>
                  {(header) => {
                    const { column } = header;
                    if (props.tableHiddenColumns.includes(column.id as keyof Item)) {
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
                          class={`hover:bg-area-color flex-1 px-6 py-3 text-left font-normal lg:py-6 ${
                            header.column.getCanSort() ? "cursor-pointer select-none" : ""
                          }`}
                        >
                          {
                            props.itemDic(store.settings.language)[
                              column.id as keyof ConvertToAllString<Item>
                            ] as string
                          }
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
        {tableBodyDom()}
      </table>
    </OverlayScrollbarsComponent>
  );
}
