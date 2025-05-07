import { Cell, createColumnHelper, flexRender } from "@tanstack/solid-table";
import { Accessor, createMemo, createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createMob, findMobById, findMobs, Mob, mobCardSchema } from "~/repositories/mob";
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
import { getDB } from "~/repositories/database";
import { Select } from "~/components/controls/select";
import { MOB_DIFFICULTY_FLAG } from "../../../../../../db/enums";
import { MobDifficultyFlag } from "../../../../../../db/kysely/enums";
import { generateBossDataByFlag } from "~/lib/mob";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";

export const mobDataConfig: DBdataDisplayConfig<
  mob,
  Mob["Card"],
  {
    zones: string[];
  }
> = {
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
    data: defaultData.mob,
    extraData: {
      zones: {
        defaultValue: [],
        dictionary: {
          key: "zones",
          tableFieldDescription: "出现的区域",
          formFieldDescription: "出现的区域",
        },
        optionsFetcher: async (name) => {
          const db = await getDB();
          const zones = await db
            .selectFrom("zone")
            .select(["id", "name"])
            .where("name", "ilike", `%${name}%`)
            .execute();
          return zones.map((zone) => ({
            label: zone.name,
            value: zone.id,
          }));
        },
      },
    },
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
      const [difficulty, setDifficulty] = createSignal<MobDifficultyFlag>(MOB_DIFFICULTY_FLAG[1]);

      const [zonesData] = createResource(data.id, async (mobId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .innerJoin("_mobTozone", "zone.id", "_mobTozone.B")
          .where("_mobTozone.A", "=", mobId)
          .selectAll("zone")
          .execute();
      });

      const [dropItemsData] = createResource(data.id, async (mobId) => {
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
          <Show when={data.type === "Boss"}>
            <Select
              value={difficulty()}
              setValue={(value) => {
                setDifficulty(value as MobDifficultyFlag);
              }}
              options={MOB_DIFFICULTY_FLAG.map((flag) => ({
                label: flag,
                value: flag,
              }))}
              optionGenerator={(index, option, selected, handleSelect) => {
                return (
                  <>
                    <Show when={index !== 0}>
                      <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
                    </Show>
                    <div
                      class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                      onClick={handleSelect}
                    >
                      <div class="text-accent-color flex gap-1">
                        <Icon.Filled.Star class={index > 0 ? "fill-brand-color-1st!" : "fill-none!"} />
                        <Icon.Filled.Star class={index > 1 ? "fill-brand-color-2nd!" : "fill-none!"} />
                        <Icon.Filled.Star class={index > 2 ? "fill-brand-color-3rd!" : "fill-none!"} />
                        <Icon.Filled.Star class={index > 3 ? "fill-brand-color-4th!" : "fill-none!"} />
                      </div>
                      <span class="text-accent-color">Lv:{data.baseLv + (index === 4 ? index + 1 : index) * 10}</span>
                    </div>
                  </>
                );
              }}
            />
          </Show>
          {DBDataRender<"mob">({
            data: generateBossDataByFlag(data, difficulty()),
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

          <CardSection
            title={dictionary.cardFields?.belongToZones ?? "出现的区域"}
            data={zonesData.latest}
            renderItem={(zone) => {
              return {
                label: zone.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }]),
              };
            }}
          />
          <CardSection
            title={dictionary.cardFields?.dropItems ?? "掉落物品"}
            data={dropItemsData.latest}
            renderItem={(item) => {
              return {
                label: item.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "item", id: item.id }]),
              };
            }}
          />
        </>
      );
    },
  },
};
