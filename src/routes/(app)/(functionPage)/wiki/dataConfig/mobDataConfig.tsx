import { Cell, createColumnHelper, flexRender } from "@tanstack/solid-table";
import { Accessor, createMemo, createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createMob, defaultMob, findMobById, findMobs, Mob, mobCardSchema } from "~/repositories/mob";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo } from "../utils";
import { DBdataDisplayConfig } from "./dataConfig";
import * as Icon from "~/components/icon";
import { drop_itemSchema, mobSchema, statisticSchema, zoneSchema } from "~/../db/zod";
import { Input } from "~/components/controls/input";
import { z, ZodObject, ZodSchema } from "zod";
import { DB, mob } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";
import { getDB } from "~/repositories/database";

const columnHelper = createColumnHelper<Mob["MainForm"]>();

// const defaultColumns = [
//   // Display Column
//   columnHelper.display({
//     id: 'actions',
//     cell: props => props,
//   }),
//   // Grouping Column
//   columnHelper.group({
//     header: '基本信息',
//     footer: props => props.column.id,
//     columns: [
//       // Accessor Column
//       columnHelper.accessor("baseLv", {
//         cell: info => info.getValue(),
//         footer: props => props.column.id,
//       }),
//       // Accessor Column
//       columnHelper.accessor(row => row.captureable, {
//         id: "captureable",
//         cell: info => info.getValue(),
//         header: () => <span>是否可捕获</span>,
//         footer: props => props.column.id,
//       }),
//     ],
//   }),
//   // Grouping Column
//   columnHelper.group({
//     header: '战斗信息',
//     footer: props => props.column.id,
//     columns: [
//       // Accessor Column
//       columnHelper.accessor("maxhp", {
//         header: () => "生命值",
//         footer: props => props.column.id,
//       }),
//       // Grouping Column
//       columnHelper.group({
//         header: '更多信息',
//         columns: [
//           // Accessor Column
//           columnHelper.accessor("block", {
//             header: () => <span>block</span>,
//             footer: props => props.column.id,
//           }),
//         ],
//       }),
//     ],
//   }),
// ]

export const mobDataConfig: DBdataDisplayConfig<"mob", Mob["Card"], {
  
}> = {
  table: {
    columnDef: [
      {
        id: "id",
        accessorFn: (row) => row.id,
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        id: "initialElement",
        accessorFn: (row) => row.initialElement,
        cell: (info) => info.getValue<DataEnums["mob"]["initialElement"]>(),
        size: 200,
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        cell: (info) => info.getValue<keyof DataEnums["mob"]["type"]>(),
        size: 160,
      },
      {
        id: "captureable",
        accessorFn: (row) => row.captureable,
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
      {
        id: "baseLv",
        accessorFn: (row) => row.baseLv,
        cell: (info) => info.getValue(),
        size: 160,
      },
      {
        id: "experience",
        accessorFn: (row) => row.experience,
        size: 180,
      },
      {
        id: "physicalDefense",
        accessorFn: (row) => row.physicalDefense,
        size: 200,
      },
      {
        id: "physicalResistance",
        accessorFn: (row) => row.physicalResistance,
        size: 200,
      },
      {
        id: "magicalDefense",
        accessorFn: (row) => row.magicalDefense,
        size: 200,
      },
      {
        id: "magicalResistance",
        accessorFn: (row) => row.magicalResistance,
        size: 200,
      },
      {
        id: "criticalResistance",
        accessorFn: (row) => row.criticalResistance,
        size: 200,
      },
      {
        id: "avoidance",
        accessorFn: (row) => row.avoidance,
        size: 160,
      },
      {
        id: "dodge",
        accessorFn: (row) => row.dodge,
        size: 160,
      },
      {
        id: "block",
        accessorFn: (row) => row.block,
        size: 160,
      },
      {
        id: "actions",
        accessorFn: (row) => row.actions,
        size: 160,
      },
    ],
    dataFetcher: findMobs,
    defaultSort: { id: "experience", desc: true },
    hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
    tdGenerator: (props: { cell: Cell<mob, keyof mob>; dictionary: Dic<mob> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      const columnId = props.cell.column.id as keyof mob;
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      switch (columnId as keyof Mob["MainTable"]) {
        case "initialElement":
          setTdContent(
            {
              Water: <Icon.Element.Water class="h-12 w-12" />,
              Fire: <Icon.Element.Fire class="h-12 w-12" />,
              Earth: <Icon.Element.Earth class="h-12 w-12" />,
              Wind: <Icon.Element.Wind class="h-12 w-12" />,
              Light: <Icon.Element.Light class="h-12 w-12" />,
              Dark: <Icon.Element.Dark class="h-12 w-12" />,
              Normal: <Icon.Element.NoElement class="h-12 w-12" />,
            }[props.cell.getValue<keyof DataEnums["mob"]["initialElement"]>()] ?? undefined,
          );

          break;
        case "experience":
          setTdContent(
            flexRender(props.cell.column.columnDef.cell, props.cell.getContext()) +
              "+" +
              props.cell.row.original.partsExperience,
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

        case "name":
          setTdContent(
            <div class="text-accent-color flex flex-col gap-1">
              <span>{props.cell.getValue()}</span>
              <Show when={props.cell.row.original.type === "Mob"}>
                <span class="text-main-text-color text-xs">{props.cell.row.original.captureable}</span>
              </Show>
            </div>,
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
          class={defaultTdClass}
        >
          <Show
            when={
              columnId !== "initialElement" // elementType已特殊处理，再以文本显示
            }
            fallback={tdContent()}
          >
            {"enumMap" in props.dictionary.fields[columnId]
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof mob>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultMob,
    hiddenFields: ["id", "statisticId", "actions", "createdByAccountId", "updatedByAccountId"],
    dataSchema: mobSchema,
    fieldGenerators: {
      type: (key, field, dictionary) => {
        let icon: JSX.Element = null;
        const zodValue = mobSchema.shape[key];
        return (
          <Input
            title={dictionary.fields[key].key}
            description={dictionary.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="EnumsBox flex flex-wrap gap-1">
              <For each={zodValue.options}>
                {(option) => {
                  switch (option) {
                    case "Mob":
                    case "MiniBoss":
                    case "Boss":
                      icon = <Icon.Filled.Basketball />;
                      break;
                  }
                  return (
                    <label
                      class={`flex cursor-pointer gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color bg-area-color" : "border-dividing-color opacity-50"}`}
                    >
                      {icon}
                      {dictionary.fields[key].enumMap[option]}
                      <input
                        id={field().name + option}
                        name={field().name}
                        value={option}
                        checked={field().state.value === option}
                        type="radio"
                        onBlur={field().handleBlur}
                        onChange={(e) => field().handleChange(e.target.value)}
                        class="mt-0.5 hidden rounded px-4 py-2"
                      />
                    </label>
                  );
                }}
              </For>
            </div>
          </Input>
        );
      },
      initialElement: (key, field, dictionary) => {
        {
          let icon: JSX.Element = null;
          const zodValue = mobSchema.shape[key];
          return (
            <Input
              title={dictionary.fields[key].key}
              description={dictionary.fields[key].formFieldDescription}
              state={fieldInfo(field())}
              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
            >
              <div class="EnumsBox flex flex-wrap gap-1">
                <For each={zodValue.options}>
                  {(option) => {
                    switch (option) {
                      case "Normal":
                        {
                          icon = <Icon.Element.NoElement class="h-6 w-6" />;
                        }
                        break;
                      case "Light":
                        {
                          icon = <Icon.Element.Light class="h-6 w-6" />;
                        }
                        break;
                      case "Dark":
                        {
                          icon = <Icon.Element.Dark class="h-6 w-6" />;
                        }
                        break;
                      case "Water":
                        {
                          icon = <Icon.Element.Water class="h-6 w-6" />;
                        }
                        break;
                      case "Fire":
                        {
                          icon = <Icon.Element.Fire class="h-6 w-6" />;
                        }
                        break;
                      case "Earth":
                        {
                          icon = <Icon.Element.Earth class="h-6 w-6" />;
                        }
                        break;
                      case "Wind":
                        {
                          icon = <Icon.Element.Wind class="h-6 w-6" />;
                        }
                        break;
                      default:
                        {
                          icon = null;
                        }
                        break;
                    }
                    return (
                      <label
                        class={`flex cursor-pointer items-center gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color" : "border-dividing-color bg-area-color opacity-50"}`}
                      >
                        {icon}
                        {dictionary.fields[key].enumMap[option]}
                        <input
                          id={field().name + option}
                          name={field().name}
                          value={option}
                          checked={field().state.value === option}
                          type="radio"
                          onBlur={field().handleBlur}
                          onChange={(e) => field().handleChange(e.target.value)}
                          class="mt-0.5 hidden rounded px-4 py-2"
                        />
                      </label>
                    );
                  }}
                </For>
              </div>
            </Input>
          );
        }
      },
    },
  },
  card: {
    dataFetcher: findMobById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [zoneData] = createResource(data.id, async (mobId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .innerJoin("_mobTozone", "zone.id", "_mobTozone.B")
          .where("_mobTozone.A", "=", mobId)
          .selectAll("zone")
          .execute();
      });

      const [dropItemData] = createResource(data.id, async (mobId) => {
        const db = await getDB();
        return await db
          .selectFrom("drop_item")
          .innerJoin("item", "item.id", "drop_item.itemId")
          .where("drop_item.dropById", "=", mobId)
          .selectAll("item")
          .execute();
      });

      return (
        <>
          <div class="MobImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"mob">({
            data,
            dictionary: dictionary,
            dataSchema: mobCardSchema as ZodObject<{ [K in keyof Awaited<ReturnType<typeof findMobById>>]: ZodSchema }>,
            hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
            fieldGroupMap: {
              常规属性: ["name", "baseLv", "experience", "partsExperience", "maxhp"],
              战斗属性: [
                "initialElement",
                "physicalDefense",
                "physicalResistance",
                "magicalDefense",
                "magicalResistance",
                "criticalResistance",
                "avoidance",
                "block",
                "dodge",
                "normalAttackResistanceModifier",
                "physicalAttackResistanceModifier",
                "magicalAttackResistanceModifier",
              ],
              额外说明: ["details"],
              怪物行为: ["actions"],
              词条信息: ["dataSources"],
            },
          })}

          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.belongToZones ?? "出现的区域"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={zoneData.latest}>
                <For each={zoneData.latest}>
                  {(zone) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }])}>
                        {zone.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>
          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.dropItems ?? "掉落物品"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={dropItemData.latest}>
                <For each={dropItemData.latest}>
                  {(item) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "item", id: item.id }])}>
                        {item.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>
        </>
      );
    },
  },
};
