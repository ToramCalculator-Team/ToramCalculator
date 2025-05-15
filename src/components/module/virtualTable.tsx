import {
  Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  Show,
  useContext,
} from "solid-js";
import {
  Cell,
  ColumnDef,
  createSolidTable,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type VisibilityState,
  type OnChangeFn,
} from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { setStore, store } from "~/store";
import { Button } from "../controls/button";
import { Motion, Presence } from "solid-motionone";
import { MediaContext } from "~/contexts/Media";
import { Dic } from "~/locales/type";
import { getCommonPinningStyles } from "~/lib/table";
import { debounce } from "@solid-primitives/scheduled";
import type { Table as TanStackTable } from "@tanstack/solid-table";
import { LoadingBar } from "../loadingBar";

export function VirtualTable<T extends Record<string, unknown>>(props: {
  dataFetcher: () => Promise<T[]>;
  columnsDef: ColumnDef<T>[];
  hiddenColumnDef: Array<keyof T>;
  tdGenerator: (props: { cell: Cell<T, unknown>; dic: Dic<T> }) => JSX.Element;
  defaultSort: { id: keyof T; desc: boolean };
  globalFilterStr: Accessor<string>;
  dictionary?: Dic<T>;
  columnHandleClick: (id: string) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  onRefetch?: (refetch: () => void) => void;
}) {
  console.log("VirtualTable", props);
  //   const start = performance.now();
  //   console.log("virtualTable start", start);
  const media = useContext(MediaContext);
  const [data, { refetch: refetchData }] = createResource(props.dataFetcher);

  // [列可见性控制组件]的可见状态
  const [columnVisibleIsOpen, setColumnVisibleIsOpen] = createSignal(false);

  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = createSignal("");
  const debounceSetGlobalFilter = debounce((value: string) => setGlobalFilter(value), 500);

  // 暴露 refetch 方法
  createEffect(() => {
    props.onRefetch?.(refetchData);
  });

  // 过滤字符串
  createEffect(() => debounceSetGlobalFilter(props.globalFilterStr()));

  const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);
  const [table, setTable] = createSignal<TanStackTable<T>>();
  const tableContainer = createMemo(() => {
    return createVirtualizer({
      count: table()?.getRowCount() ?? 0,
      getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
      estimateSize: () => 73,
      overscan: 5,
    });
  });

  createEffect(
    on(
      () => data.state,
      () => {
        // console.log("tableData change", performance.now() - start);
        // console.log("tableData", data());
        setTable(
          createSolidTable({
            data: data.latest ?? [],
            columns: props.columnsDef,
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            state: {
              get globalFilter() {
                return globalFilter();
              },
              get columnVisibility() {
                return props.columnVisibility;
              },
            },
            onColumnVisibilityChange: props.onColumnVisibilityChange,
            onGlobalFilterChange: setGlobalFilter,
            globalFilterFn: "includesString",
            onColumnFiltersChange: setColumnFilters,
            getFilteredRowModel: getFilteredRowModel(),
            getFacetedRowModel: getFacetedRowModel(),
            getFacetedUniqueValues: getFacetedUniqueValues(),
            getFacetedMinMaxValues: getFacetedMinMaxValues(),
            debugTable: true,
            debugHeaders: false,
            debugColumns: false,
            initialState: {
              sorting: [
                {
                  id: props.defaultSort.id as string,
                  desc: props.defaultSort.desc,
                },
              ],
            },
          }),
        );
      },
      {
        defer: true,
      },
    ),
  );

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
        props.columnHandleClick(id);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  onCleanup(() => {
    console.log("VirtualTable onCleanup");
  });

  return (
    <>
      <Presence exitBeforeEnter>
        <Show when={columnVisibleIsOpen()}>
          <Motion.div
            animate={{
              opacity: [0, 1],
              gridTemplateRows: ["0fr", "1fr"],
              paddingBlock: ["0rem", "1rem"],
              filter: ["blur(20px)", "blur(0px)"],
            }}
            exit={{
              opacity: [1, 0],
              gridTemplateRows: ["1fr", "0fr"],
              paddingBlock: ["1rem", "0rem"],
              filter: ["blur(0px)", "blur(20px)"],
            }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`FilterBox grid portrait:px-6`}
          >
            <div
              class={`Content flex flex-col gap-2 overflow-hidden ${columnVisibleIsOpen() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} `}
            >
              <div class="content flex flex-wrap gap-2 px-6">
                <Button
                  size="sm"
                  level={table()?.getIsAllColumnsVisible() ? "default" : "primary"}
                  onClick={() => {
                    const allVisible = table()?.getIsAllColumnsVisible() ?? false;
                    props.onColumnVisibilityChange?.((old) => {
                      const newVisibility = { ...old };
                      table()
                        ?.getAllLeafColumns()
                        .forEach((col) => {
                          if (!props.hiddenColumnDef.includes(col.id as keyof T)) {
                            newVisibility[col.id] = !allVisible;
                          }
                        });
                      return newVisibility;
                    });
                  }}
                >
                  ALL
                </Button>
                <For each={table()?.getAllLeafColumns()}>
                  {(column) => {
                    if (props.hiddenColumnDef.includes(column.id as keyof T)) {
                      return;
                    }
                    return (
                      <Button
                        size="sm"
                        level={column.getIsVisible() ? "default" : "primary"}
                        onClick={() => {
                          props.onColumnVisibilityChange?.((old) => ({
                            ...old,
                            [column.id]: !column.getIsVisible(),
                          }));
                        }}
                      >
                        {props.dictionary
                          ? props.dictionary.fields[column.id as keyof Dic<T>["fields"]]["key"]
                          : column.id}
                      </Button>
                    );
                  }}
                </For>
              </div>
              {/* <div class="module flex flex-col gap-3">
                  <div class="title">{dictionary.ui.monster.augmented}</div>
                  <div class="content flex flex-wrap gap-2">
                    <Button level="tertiary" onClick={() => setAugmented(!augmented)}>
                      {augmented ? "Yes" : "No"}
                    </Button>
                  </div>
                </div> */}
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        ref={setVirtualScrollRef}
        class="h-full flex-1"
      >
        <table class="Table relative max-h-full max-w-full">
          <thead class={`TableHead bg-primary-color sticky top-0 z-10 flex`}>
            <For each={table()?.getHeaderGroups()}>
              {(headerGroup) => (
                <tr class="border-dividing-color flex min-w-full gap-0 border-b-1 lg:border-b-2">
                  <For each={headerGroup.headers}>
                    {(header) => {
                      const { column } = header;
                      if (props.hiddenColumnDef.includes(column.id as keyof T)) {
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
                            {props.dictionary
                              ? props.dictionary.fields[column.id as keyof Dic<T>["fields"]]["key"]
                              : column.id}
                            {{
                              asc: " ▲",
                              desc: " ▼",
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
          <Show
            when={data.state === "ready"}
            fallback={
              <div class="flex h-full w-full items-center justify-center">
                <LoadingBar />
              </div>
            }
          >
            <tbody style={{ height: `${tableContainer().getTotalSize()}px` }} class={`TableBodyrelative`}>
              <For each={tableContainer().getVirtualItems()}>
                {(virtualRow) => {
                  const row = table()?.getRowModel().rows[virtualRow.index];
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
                      class={`group border-dividing-color hover:bg-area-color flex cursor-pointer transition-none hover:rounded hover:border-transparent landscape:border-b`}
                    >
                      <For
                        each={row
                          .getVisibleCells()
                          .filter((cell) => !props.hiddenColumnDef.includes(cell.column.id as keyof T))}
                      >
                        {(cell) => {
                          const tdContent = props.dictionary
                            ? props.tdGenerator({ cell, dic: props.dictionary })
                            : JSON.stringify(cell.getValue());
                          return tdContent;
                        }}
                      </For>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </Show>
        </table>
      </OverlayScrollbarsComponent>
    </>
  );
}
