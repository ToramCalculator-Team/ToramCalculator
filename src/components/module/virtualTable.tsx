import {
  Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  on,
  onCleanup,
  onMount,
  Resource,
  Show,
  Suspense,
  useContext,
} from "solid-js";
import { Cell, ColumnDef, createSolidTable, getCoreRowModel, getSortedRowModel } from "@tanstack/solid-table";
import { createVirtualizer } from "@tanstack/solid-virtual";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { setStore, store } from "~/store";
import { DB } from "~/../db/kysely/kyesely";
import { Button } from "../controls/button";
import { Motion, Presence } from "solid-motionone";
import { MediaContext } from "~/contexts/Media";
import { dictionary, FieldDescription, FieldDict } from "~/locales/type";
import { getCommonPinningStyles } from "~/lib/table";
import { getDictionary } from "~/locales/i18n";
import { LoadingBar } from "../loadingBar";
import type { Table as TanStackTable } from "@tanstack/solid-table";

export function VirtualTable<Table extends keyof DB>(props: {
  tableName: Table;
  dataList: Resource<Table[]>;
  tableColumns: ColumnDef<Table>[];
  tableHiddenColumns: Array<keyof Table>;
  tableTdGenerator: (props: { cell: Cell<Table, unknown> }) => JSX.Element;
  defaultSort: { id: keyof Table; desc: boolean };
  filterIsOpen: Accessor<boolean>;
  setFilterIsOpen: (isOpen: boolean) => void;
}) {
  const start = performance.now();
  console.log("virtualTable start", start);
  const media = useContext(MediaContext);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
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
        setStore("wiki", props.tableName, (prev) => ({
          ...prev,
          dialogType: "card" as const,
          dialogIsOpen: true,
        }));
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);
  const [table, setTable] = createSignal<TanStackTable<Table>>();
  const tableContainer = createMemo(() => {
    return createVirtualizer({
      count: table()?.getRowCount() ?? 0,
      getScrollElement: () => virtualScrollRef()?.osInstance()?.elements().viewport ?? null,
      estimateSize: () => 96,
      overscan: 5,
    });
  });

  createEffect(
    on(props.dataList, () => {
      setTable(
        createSolidTable({
          data: props.dataList.latest ?? [],
          columns: props.tableColumns,
          getCoreRowModel: getCoreRowModel(),
          getSortedRowModel: getSortedRowModel(),
          debugTable: true,
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
    }),
  );

  // onMount(() => {
  //   console.log("VirtualTable onMount");
  //   console.log("virtualTable end", performance.now() - start);
  //   setTimeout(() => {
  //     virtualizer()._willUpdate();
  //     console.log(
  //       "TableRows:",
  //       JSON.stringify(table.getRowCount()),
  //       "VirtualCount:",
  //       JSON.stringify(virtualizer().getVirtualIndexes().length),
  //       "VirtualDatas:",
  //       JSON.stringify(virtualizer().getVirtualItems().length),
  //       Math.floor(performance.now()),
  //     );
  //   }, 1);
  // });

  onCleanup(() => {
    console.log("VirtualTable onCleanup");
  });

  return (
    <>
      <Presence exitBeforeEnter>
        <Show when={props.filterIsOpen()}>
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
              class={`Content flex flex-col gap-2 overflow-hidden ${props.filterIsOpen() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} `}
            >
              <div class="content flex flex-wrap gap-2">
                <Button
                  size="sm"
                  level={table()?.getIsAllColumnsVisible() ? "default" : "primary"}
                  onClick={table()?.getToggleAllColumnsVisibilityHandler()}
                >
                  ALL
                </Button>
                <For each={table()?.getAllLeafColumns()}>
                  {(column) => {
                    if (props.tableHiddenColumns.includes(column.id as keyof Table)) {
                      // 默认隐藏的数据
                      return;
                    }
                    if (!(column.id in dictionary().db[props.tableName].fields)) return;
                    type Fields = dictionary["db"][typeof props.tableName]["fields"];
                    type Field = Fields[keyof Fields]; // 暂时不知道怎么解决，它被推断为never
                    // console.log("Field", column.id, dictionary().db[props.tableName].fields[column.id as keyof Fields]);

                    return (
                      <Button
                        size="sm"
                        level={column.getIsVisible() ? "default" : "primary"}
                        onClick={column.getToggleVisibilityHandler()}
                      >
                        {
                          (dictionary().db[props.tableName].fields[column.id as keyof Fields] as FieldDescription).key // 暂时不知道怎么解决，它被推断为never
                        }
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
        <table class="Table relative w-full h-full">
          <thead class={`TableHead bg-primary-color sticky top-0 z-10 flex`}>
            <For each={table()?.getHeaderGroups()}>
              {(headerGroup) => (
                <tr class="border-dividing-color flex min-w-full gap-0 border-b-2">
                  <For each={headerGroup.headers}>
                    {(header) => {
                      const { column } = header;
                      if (props.tableHiddenColumns.includes(column.id as keyof Table)) {
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
                            {dictionary().db[props.tableName].fields[column.id as keyof FieldDict<Table>].key}
                            {{
                              asc: "▲",
                              desc: "▼",
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
            when={props.dataList.state === "ready"}
            fallback={
              <h1 class="animate-pulse p-3">......</h1>
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
                      onMouseEnter={(e) => {
                        try {
                          setStore("wiki", props.tableName, (prev) => ({
                            ...prev,
                            id: row.getValue("id"),
                          }));
                        } catch (error) {
                          console.error(error);
                        }
                      }} // 悬停时直接触发新数据获取，优化pc端表现
                      class={`group border-dividing-color hover:bg-area-color flex cursor-pointer transition-none hover:rounded hover:border-transparent landscape:border-b`}
                    >
                      <For
                        each={row
                          .getVisibleCells()
                          .filter((cell) => !props.tableHiddenColumns.includes(cell.column.id as keyof Table))}
                      >
                        {(cell) => {
                          const tdContent = props.tableTdGenerator({ cell });
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
