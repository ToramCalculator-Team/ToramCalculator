import { createEffect, createMemo, createResource, createSignal, For, JSX, on, onMount, Show } from "solid-js";
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
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { type Mob, MobDic, findMobs } from "~/repositories/mob";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { type Enums } from "~/repositories/enums";
import { DicEnumsKeys, DicEnumsKeysValue } from "~/locales/dictionaries/type";
import { createSyncResource } from "~/hooks/resource";

export default function MobIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // table
  const columns: ColumnDef<Mob>[] = [
    {
      accessorKey: "id",
      header: () => MobDic(store.settings.language).id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => MobDic(store.settings.language).name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "type",
      header: () => MobDic(store.settings.language).type,
      cell: (info) => dictionary().enums.MobType[info.getValue<Enums["MobType"]>()],
      size: 120,
    },
    {
      accessorKey: "captureable",
      header: () => MobDic(store.settings.language).captureable,
      cell: (info) => info.getValue<Boolean>().toString(),
      size: 120,
    },
    {
      accessorKey: "baseLv",
      header: () => MobDic(store.settings.language).baseLv,
      cell: (info) => info.getValue(),
      size: 120,
    },
    {
      accessorKey: "experience",
      header: () => MobDic(store.settings.language).experience,
      size: 120,
    },
    {
      accessorKey: "partsExperience",
      header: () => MobDic(store.settings.language).partsExperience,
      cell: (info) => info.getValue(),
      size: 120,
    },
    {
      accessorKey: "elementType",
      header: () => MobDic(store.settings.language).elementType,
      cell: (info) => info.getValue<Enums["ElementType"]>(),
      size: 120,
    },
    {
      accessorKey: "physicalDefense",
      header: () => MobDic(store.settings.language).physicalDefense,
      size: 120,
    },
    {
      accessorKey: "physicalResistance",
      header: () => MobDic(store.settings.language).physicalResistance,
      size: 120,
    },
    {
      accessorKey: "magicalDefense",
      header: () => MobDic(store.settings.language).magicalDefense,
      size: 120,
    },
    {
      accessorKey: "magicalResistance",
      header: () => MobDic(store.settings.language).magicalResistance,
      size: 120,
    },
    {
      accessorKey: "criticalResistance",
      header: () => MobDic(store.settings.language).criticalResistance,
      size: 120,
    },
    {
      accessorKey: "avoidance",
      header: () => MobDic(store.settings.language).avoidance,
      size: 100,
    },
    {
      accessorKey: "dodge",
      header: () => MobDic(store.settings.language).dodge,
      size: 100,
    },
    {
      accessorKey: "block",
      header: () => MobDic(store.settings.language).block,
      size: 100,
    },
    {
      accessorKey: "actions",
      header: () => MobDic(store.settings.language).actions,
      cell: (info) => JSON.stringify(info.getValue<Object>()),
      size: 150,
    },
    // {
    //   accessorKey: "belongToZones",
    //   header: () => MobDic(store.settings.language).belongToZones,
    //   cell: (info) => info.getValue(),
    //   size: 150,
    // },
  ];
  const [mobList, { refetch: refetchMobList }] = createSyncResource("mob", findMobs);

  const mobTableHiddenData: Array<keyof Mob> = ["id", "updatedByAccountId"];

  // 列固定
  const getCommonPinningStyles = (column: Column<Mob>): JSX.CSSProperties => {
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

  function MobTableTdGenerator(props: { cell: Cell<Mob, keyof Mob> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);

    switch (props.cell.column.id as Exclude<keyof Mob, keyof typeof mobTableHiddenData>) {
      case "elementType":
        setTdContent(
          {
            Water: <Icon.Element.Water class="h-12 w-12" />,
            Fire: <Icon.Element.Fire class="h-12 w-12" />,
            Earth: <Icon.Element.Earth class="h-12 w-12" />,
            Wind: <Icon.Element.Wind class="h-12 w-12" />,
            Light: <Icon.Element.Light class="h-12 w-12" />,
            Dark: <Icon.Element.Dark class="h-12 w-12" />,
            Normal: <Icon.Element.NoElement class="h-12 w-12" />,
          }[props.cell.getValue() as Enums["ElementType"]] ?? undefined,
        );

        break;

      // 以下值需要添加百分比符号
      case "physicalResistance":
      case "magicalResistance":
      case "dodge":
      case "block":
      case "normalAttackResistanceModifier":
      case "physicalAttackResistanceModifier":
      case "magicalAttackResistanceModifier":
        setTdContent(flexRender(props.cell.column.columnDef.cell, props.cell.getContext()) + "%");
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
        {/* 当此字段不存在于枚举类型中时，展示原始文本 */}
        <Show
          when={
            Object.keys(dictionary().enums).includes(
              "Mob" + props.cell.column.id.charAt(0).toLocaleUpperCase() + props.cell.column.id.slice(1),
            ) &&
            Object.keys(
              dictionary().enums[
                ("Mob" +
                  props.cell.column.id.charAt(0).toLocaleUpperCase() +
                  props.cell.column.id.slice(1)) as DicEnumsKeys
              ],
            ).includes(props.cell.getValue()) &&
            props.cell.column.id !== "elementType" // elementType已特殊处理，再以文本显示
          }
          fallback={tdContent()}
        >
          {
            dictionary().enums[
              ("Mob" +
                props.cell.column.id.charAt(0).toLocaleUpperCase() +
                props.cell.column.id.slice(1)) as DicEnumsKeys
            ][props.cell.getValue() as keyof DicEnumsKeysValue]
          }
        </Show>
      </td>
    );
  }

  // 列表虚拟化区域----------------------------------------------------------
  const [virtualScrollRef, setVirtualScrollRef] = createSignal<OverlayScrollbarsComponentRef | undefined>(undefined);

  const virtualizerTable = createMemo(() => {
    const list = mobList() ?? [];
    console.log("Memo", list.length);
    const table = createSolidTable({
      data: list,
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

    const virtualizer = createVirtualizer({
      count: list.length,
      getScrollElement: () => {
        return virtualScrollRef()?.osInstance()?.elements().viewport ?? null;
      },
      estimateSize: () => 96,
      overscan: 5,
    });

    return {
      table,
      virtualizer,
    };
  });

  // 副作用：监听 `mobList`
  createEffect(
    on(
      mobList,
      () => {
        const list = mobList() ?? [];
        virtualizerTable().table.setOptions((prev) => ({
          ...prev,
          data: list,
        }));
        virtualizerTable().virtualizer.options.count = list.length;
        virtualizerTable().virtualizer._willUpdate();
        console.log(
          "TableRows:",
          virtualizerTable().table.getRowCount(),
          "VirtualItems:",
          virtualizerTable().virtualizer.getVirtualItems().length,
          Math.floor(performance.now()),
        );
      },
      { defer: true },
    ),
  );

  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      ref={setVirtualScrollRef}
      class="h-full"
    >
      <table class="Table relative w-full">
        <thead class={`TableHead bg-primary-color sticky top-0 z-10 flex`}>
          <For each={virtualizerTable().table.getHeaderGroups()}>
            {(headerGroup) => (
              <tr class="border-dividing-color flex min-w-full gap-0 border-b-2">
                <For each={headerGroup.headers}>
                  {(header) => {
                    const { column } = header;
                    if (mobTableHiddenData.includes(column.id as keyof Mob)) {
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
                          class={`hover:bg-area-color flex-1 py-4 text-left font-normal lg:py-6 ${
                            header.column.getCanSort() ? "cursor-pointer select-none" : ""
                          }`}
                        >
                          {MobDic(store.settings.language)[column.id as keyof Mob] as string}
                        </div>
                      </th>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </thead>
        <tbody style={{ height: `${virtualizerTable().virtualizer.getTotalSize()}px` }} class={`TableBodyrelative`}>
          <For each={virtualizerTable().virtualizer.getVirtualItems()}>
            {(virtualRow) => {
              const row = virtualizerTable().table.getRowModel().rows[virtualRow.index];
              return (
                <tr
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  class={`group border-area-color hover:bg-area-color flex cursor-pointer border-b transition-none hover:rounded hover:border-transparent hover:font-bold`}
                >
                  <For
                    each={row
                      .getVisibleCells()
                      .filter((cell) => !mobTableHiddenData.includes(cell.column.id as keyof Mob))}
                  >
                    {(cell) => <MobTableTdGenerator cell={cell} />}
                  </For>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </OverlayScrollbarsComponent>
  );
}
