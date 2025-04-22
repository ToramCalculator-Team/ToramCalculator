import { Cell, flexRender } from "@tanstack/solid-table";
import { Accessor, createMemo, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createMob, defaultMob, findMobById, findMobs, Mob } from "~/repositories/mob";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo, WikiPageConfig } from "../utils";
import * as Icon from "~/components/icon";
import { createSyncResource } from "~/hooks/resource";
import { mobSchema } from "~/../db/zod";
import { Input } from "~/components/controls/input";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

export function mobPageConfig(): WikiPageConfig<"mob"> {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [mobList, { refetch: refetchMobList }] = createSyncResource("mob", findMobs);
  const [formMob] = createSignal<Mob["MainForm"]>(defaultMob);
  return {
    tableName: "mob",
    table: {
      columnDef: [
        {
          accessorKey: "id",
          cell: (info) => info.getValue(),
          size: 200,
        },
        {
          accessorKey: "name",
          cell: (info) => info.getValue(),
          size: 220,
        },
        {
          accessorKey: "initialElement",
          cell: (info) => info.getValue<DataEnums["mob"]["initialElement"]>(),
          size: 200,
        },
        {
          accessorKey: "type",
          cell: (info) => info.getValue<keyof DataEnums["mob"]["type"]>(),
          size: 160,
        },
        {
          accessorKey: "captureable",
          cell: (info) => info.getValue<Boolean>().toString(),
          size: 160,
        },
        {
          accessorKey: "baseLv",
          cell: (info) => info.getValue(),
          size: 160,
        },
        {
          accessorKey: "experience",
          size: 180,
        },
        {
          accessorKey: "physicalDefense",
          size: 200,
        },
        {
          accessorKey: "physicalResistance",
          size: 200,
        },
        {
          accessorKey: "magicalDefense",
          size: 200,
        },
        {
          accessorKey: "magicalResistance",
          size: 200,
        },
        {
          accessorKey: "criticalResistance",
          size: 200,
        },
        {
          accessorKey: "avoidance",
          size: 160,
        },
        {
          accessorKey: "dodge",
          size: 160,
        },
        {
          accessorKey: "block",
          size: 160,
        },
        {
          accessorKey: "actions",
          cell: (info) => JSON.stringify(info.getValue<Object>()),
          size: 160,
        },
      ],
      dataList: mobList,
      defaultSort: { id: "experience", desc: true },
      dataListRefetcher: refetchMobList,
      hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
      tdGenerator: (props: { cell: Cell<Mob["MainTable"], keyof Mob["MainTable"]> }) => {
        const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
        type MobKeys = keyof DataEnums["mob"];
        type MobValueKeys<T extends MobKeys> = keyof DataEnums["mob"][T];
        let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
        switch (props.cell.column.id as keyof Mob["MainTable"]) {
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
              <div class="text-main-text-color flex flex-col gap-1">
                <span>{props.cell.getValue()}</span>
                <Show when={props.cell.row.original.type === "Mob"}>
                  <span class="text-main-text-color text-xs">({props.cell.row.original.captureable})</span>
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
                props.cell.column.id in dictionary().enums.mob && props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
              }
              fallback={tdContent()}
            >
              {dictionary().enums.mob[props.cell.column.id as MobKeys][props.cell.getValue() as MobValueKeys<MobKeys>]}
            </Show>
          </td>
        );
      },
    },
    form: {
      defaultData: defaultMob,
      data: formMob,
      hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
      createData: createMob,
      dataSchema: mobSchema,
      fieldGenerator: (key, field) => {
        const defaultInputClass = "mt-0.5 rounded px-4 py-2";
        const defaultLabelSizeClass = "";
        let icon: JSX.Element = null;
        let inputClass = defaultInputClass;
        let labelSizeClass = defaultLabelSizeClass;
        switch (key) {
          case "type": {
            const zodValue = mobSchema.shape[key];
            return (
              <Input
                title={dictionary().db.mob.fields[key].key}
                description={dictionary().db.mob.fields[key].formFieldDescription}
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
                          {dictionary().enums.mob[key][option]}
                          <input
                            id={field().name + option}
                            name={field().name}
                            value={option}
                            checked={field().state.value === option}
                            type="radio"
                            onBlur={field().handleBlur}
                            onChange={(e) => field().handleChange(e.target.value)}
                            class={inputClass}
                          />
                        </label>
                      );
                    }}
                  </For>
                </div>
              </Input>
            );
          }
          case "initialElement": {
            const zodValue = mobSchema.shape[key];
            return (
              <Input
                title={dictionary().db.mob.fields[key].key}
                description={dictionary().db.mob.fields[key].formFieldDescription}
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
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "no-element basis-1/3";
                          }
                          break;
                        case "Light":
                          {
                            icon = <Icon.Element.Light class="h-6 w-6" />;
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "light basis-1/3";
                          }
                          break;
                        case "Dark":
                          {
                            (icon = <Icon.Element.Dark class="h-6 w-6" />),
                              (inputClass = "mt-0.5 hidden rounded px-4 py-2");
                            labelSizeClass = "dark basis-1/3";
                          }
                          break;
                        case "Water":
                          {
                            icon = <Icon.Element.Water class="h-6 w-6" />;
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "water basis-1/3";
                          }
                          break;
                        case "Fire":
                          {
                            icon = <Icon.Element.Fire class="h-6 w-6" />;
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "fire basis-1/3";
                          }
                          break;
                        case "Earth":
                          {
                            icon = <Icon.Element.Earth class="h-6 w-6" />;
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "earth basis-1/3";
                          }
                          break;
                        case "Wind":
                          {
                            icon = <Icon.Element.Wind class="h-6 w-6" />;
                            inputClass = "mt-0.5 hidden rounded px-4 py-2";
                            labelSizeClass = "wind basis-1/3";
                          }
                          break;
                        default:
                          {
                            icon = null;
                            inputClass = defaultInputClass;
                            labelSizeClass = defaultLabelSizeClass;
                          }
                          break;
                      }
                      return (
                        <label
                          class={`flex cursor-pointer items-center gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color" : "border-dividing-color bg-area-color opacity-50"}`}
                        >
                          {icon}
                          {dictionary().enums.mob[key][option]}
                          <input
                            id={field().name + option}
                            name={field().name}
                            value={option}
                            checked={field().state.value === option}
                            type="radio"
                            onBlur={field().handleBlur}
                            onChange={(e) => field().handleChange(e.target.value)}
                            class={inputClass}
                          />
                        </label>
                      );
                    }}
                  </For>
                </div>
              </Input>
            );
          }
        }
        return false;
      },
      refetchItemList: refetchMobList,
    },
    card: {
      dataFetcher: findMobById,
      hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
      fieldGenerator: undefined,
    },
  };
}
