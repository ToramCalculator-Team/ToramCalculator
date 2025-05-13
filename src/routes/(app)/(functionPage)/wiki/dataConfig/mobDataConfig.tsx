import { Cell, createColumnHelper, DeepKeys, flexRender } from "@tanstack/solid-table";
import { Accessor, createMemo, createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createMob, findMobById, findMobs, Mob, mobCardSchema } from "~/repositories/mob";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import * as Icon from "~/components/icon";
import { drop_itemSchema, mobSchema, statisticSchema, zoneSchema } from "~/../db/zod";
import { Input } from "~/components/controls/input";
import { z, ZodObject, ZodSchema } from "zod";
import { DB, drop_item, mob, zone } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { getDB } from "~/repositories/database";
import { Select } from "~/components/controls/select";
import { MOB_DIFFICULTY_FLAG } from "../../../../../../db/enums";
import { ItemType, MobDifficultyFlag } from "../../../../../../db/kysely/enums";
import { generateBossDataByFlag } from "~/lib/mob";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Autocomplete } from "~/components/controls/autoComplete";
import { DeepValue } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { createId } from "@paralleldrive/cuid2";
import { omit } from "lodash-es";

type MobWithRelated = mob & {
  belongToZones: zone[];
  dropItems: (drop_item & { name: string })[];
};

const MobWithRelatedSchema = z.object({
  ...mobSchema.shape,
  belongToZones: z.array(zoneSchema),
  dropItems: z.array(drop_itemSchema),
});

export const createMobDataConfig = (dic: dictionary): dataDisplayConfig<MobWithRelated> => ({
  defaultData: {
    ...defaultData.mob,
    belongToZones: [],
    dropItems: [],
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("mob")
      .where("id", "=", id)
      .selectAll("mob")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("_mobTozone")
            .innerJoin("zone", "zone.id", "_mobTozone.B")
            .whereRef("_mobTozone.A", "=", "mob.id")
            .selectAll("zone"),
        ).as("belongToZones"),
        jsonArrayFrom(
          eb
            .selectFrom("drop_item")
            .innerJoin("item", "item.id", "drop_item.itemId")
            .where("drop_item.dropById", "=", "mob.id")
            .selectAll("drop_item")
            .select("item.name"),
        ).as("dropItems"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("mob")
      .selectAll("mob")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("_mobTozone")
            .innerJoin("zone", "zone.id", "_mobTozone.B")
            .whereRef("_mobTozone.A", "=", "mob.id")
            .selectAll("zone"),
        ).as("belongToZones"),
        jsonArrayFrom(
          eb
            .selectFrom("drop_item")
            .innerJoin("item", "item.id", "drop_item.itemId")
            .where("drop_item.dropById", "=", "mob.id")
            .selectAll("drop_item")
            .select("item.name"),
        ).as("dropItems"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: MobWithRelatedSchema,
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
    defaultSort: { id: "experience", desc: true },
    hiddenColumns: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
    tdGenerator: (props) => {
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
            {"enumMap" in dic.db.mob.fields[columnId]
              ? (dic.db.mob.fields[columnId] as EnumFieldDetail<keyof MobWithRelated>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    hiddenFields: ["id", "statisticId", "actions", "createdByAccountId", "updatedByAccountId"],
    fieldGenerators: {
      type: (key, field) => {
        const zodValue = MobWithRelatedSchema.shape[key];
        return (
          <Input
            title={dic.db.mob.fields[key].key}
            description={dic.db.mob.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <EnumSelect
              value={field().state.value}
              setValue={(value) => field().setValue(value as DeepValue<MobWithRelated, DeepKeys<MobWithRelated>>)}
              options={zodValue.options}
              dic={dic.db.mob.fields[key].enumMap}
              field={{
                id: field().name,
                name: field().name,
              }}
            />
          </Input>
        );
      },
      initialElement: (key, field) => {
        const zodValue = MobWithRelatedSchema.shape[key];
        return (
          <Input
            title={dic.db.mob.fields[key].key}
            description={dic.db.mob.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <EnumSelect
              value={field().state.value}
              setValue={(value) => field().setValue(value as DeepValue<MobWithRelated, DeepKeys<MobWithRelated>>)}
              options={zodValue.options}
              dic={dic.db.mob.fields[key].enumMap}
              iconMap={{
                Water: <Icon.Element.Water class="h-6 w-6" />,
                Fire: <Icon.Element.Fire class="h-6 w-6" />,
                Earth: <Icon.Element.Earth class="h-6 w-6" />,
                Wind: <Icon.Element.Wind class="h-6 w-6" />,
                Light: <Icon.Element.Light class="h-6 w-6" />,
                Dark: <Icon.Element.Dark class="h-6 w-6" />,
                Normal: <Icon.Element.NoElement class="h-6 w-6" />,
              }}
              field={{
                id: field().name,
                name: field().name,
              }}
            />
          </Input>
        );
      },
      belongToZones: (key, field) => {
        return (
          <Input
            title={dic.db.zone.selfName}
            description={dic.db.zone.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2">
              <For each={field().state.value}>
                {(_item, index) => {
                  const item = _item as zone;
                  return (
                    <div class="Filed flex items-center gap-2">
                      <label for={field().name + index()} class="flex-1">
                        <Autocomplete
                          id={field().name + index()}
                          initialValue={item}
                          setValue={(value) => {
                            const newArray = [...field().state.value];
                            newArray[index()] = value;
                            field().setValue(newArray);
                          }}
                          datasFetcher={async () => {
                            const db = await getDB();
                            const zones = await db.selectFrom("zone").selectAll("zone").execute();
                            return zones;
                          }}
                          displayField="name"
                          valueField="id"
                        />
                      </label>
                      <Button
                        onClick={(e) => {
                          field().setValue((prev: zone[]) => prev.filter((_, i) => i !== index()));
                          e.stopPropagation();
                        }}
                      >
                        -
                      </Button>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={(e) => {
                  field().setValue((prev: zone[]) => [...prev, defaultData.zone]);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      dropItems: (key, field) => {
        return (
          <Input
            title={dic.db.drop_item.selfName}
            description={dic.db.drop_item.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
              <For each={field().state.value}>
                {(_item, index) => {
                  let initialValue = _item as drop_item & { name: string };
                  const zodValue = drop_itemSchema.shape;
                  return (
                    <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                      <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                        <span class="text-accent-color font-bold">{key.toLocaleUpperCase() + " " + index()}</span>
                        <Button
                          onClick={() => {
                            const newArray = (field().state.value as unknown[]).filter((_, i) => i !== index());
                            field().setValue(newArray);
                          }}
                        >
                          -
                        </Button>
                      </div>
                      <div class="SubForm-DropItem flex w-full flex-col gap-2">
                        <Input
                          title={dic.db.drop_item.fields.itemId.key}
                          description={dic.db.drop_item.fields.itemId.formFieldDescription}
                          state={fieldInfo(field())}
                        >
                          <Autocomplete
                            id={key + index()}
                            initialValue={{
                              id: initialValue.itemId,
                              name: initialValue.name,
                            }}
                            setValue={(value) => {
                              const newArray = [...field().state.value];
                              newArray[index()] = {
                                ...initialValue,
                                itemId: value.id,
                                name: value.name,
                              };
                              field().setValue(newArray);
                            }}
                            datasFetcher={async () => {
                              const db = await getDB();
                              const items = await db.selectFrom("item").select(["id", "name"]).execute();
                              return items;
                            }}
                            displayField="name"
                            valueField="id"
                          />
                        </Input>
                        <Input
                          title={dic.db.drop_item.fields.probability.key}
                          description={dic.db.drop_item.fields.probability.formFieldDescription}
                          state={fieldInfo(field())}
                          type="number"
                          value={initialValue.probability}
                          onChange={(e) => {
                            const newArray = [...field().state.value];
                            newArray[index()] = { ...initialValue, probability: Number(e.target.value) };
                            field().setValue(newArray);
                          }}
                        />
                        <Input
                          title={dic.db.drop_item.fields.breakRewardType.key}
                          description={dic.db.drop_item.fields.breakRewardType.formFieldDescription}
                          state={fieldInfo(field())}
                        >
                          <EnumSelect
                            value={initialValue.breakRewardType}
                            setValue={(value) => {
                              const newArray = [...field().state.value];
                              newArray[index()] = {
                                ...initialValue,
                                breakRewardType: value,
                              };
                              field().setValue(newArray);
                            }}
                            options={zodValue.breakRewardType.options}
                            dic={dic.db.drop_item.fields.breakRewardType.enumMap}
                            field={{
                              id: field().name,
                              name: field().name,
                            }}
                          />
                        </Input>
                        <Input
                          title={dic.db.drop_item.fields.relatedPartType.key}
                          description={dic.db.drop_item.fields.relatedPartType.formFieldDescription}
                          state={fieldInfo(field())}
                        >
                          <EnumSelect
                            value={initialValue.relatedPartType}
                            setValue={(value) => {
                              const newArray = [...field().state.value];
                              newArray[index()] = {
                                ...initialValue,
                                relatedPartType: value,
                              };
                              field().setValue(newArray);
                            }}
                            options={zodValue.relatedPartType.options}
                            dic={dic.db.drop_item.fields.relatedPartType.enumMap}
                            field={{
                              id: field().name,
                              name: field().name,
                            }}
                          />
                        </Input>
                        <Input
                          type="text"
                          title={dic.db.drop_item.fields.relatedPartInfo.key}
                          description={dic.db.drop_item.fields.relatedPartInfo.formFieldDescription}
                          state={fieldInfo(field())}
                          value={initialValue.relatedPartInfo}
                          onChange={(e) => {
                            const newArray = [...field().state.value];
                            newArray[index()] = { ...initialValue, relatedPartInfo: e.target.value };
                            field().setValue(newArray);
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={() => {
                  const newArray = [...(field().state.value as string[]), defaultData.drop_item];
                  field().setValue(newArray);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const mob = await db.transaction().execute(async (trx) => {
        const { belongToZones, dropItems, ...rest } = data;
        console.log("zones", belongToZones, "zone", rest);
        const mob = await createMob(trx, {
          ...rest,
        });
        if (belongToZones.length > 0) {
          for (const zone of belongToZones) {
            await trx.insertInto("_mobTozone").values({ A: mob.id, B: zone.id }).execute();
          }
        }
        if (dropItems.length > 0) {
          for (const dropItem of dropItems) {
            await trx
              .insertInto("drop_item")
              .values({
                ...(omit(dropItem, ["name"])),
                dropById: mob.id,
                id: createId(),
              })
              .execute();
          }
        }
        return mob;
      });
    },
  },
  card: {
    cardRender: (data, appendCardTypeAndIds) => {
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
                      <span class="text-accent-color">Lv:{data.baseLv + (index === 4 ? index : index - 1) * 10}</span>
                    </div>
                  </>
                );
              }}
            />
          </Show>
          {DBDataRender<MobWithRelated>({
            data: generateBossDataByFlag(data, difficulty()),
            dictionary: {
              ...dic.db.mob,
              fields: {
                ...dic.db.mob.fields,
                belongToZones: {
                  key: "belongToZones",
                  ...dic.db.zone.fields,
                  tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
                  formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
                },
                dropItems: {
                  key: "dropItems",
                  ...dic.db.drop_item.fields,
                  tableFieldDescription: dic.db.drop_item.fields.itemId.tableFieldDescription,
                  formFieldDescription: dic.db.drop_item.fields.itemId.formFieldDescription,
                },
              },
            },
            dataSchema: MobWithRelatedSchema,
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
            title={"包含的" + dic.db.zone.selfName}
            data={zonesData.latest}
            renderItem={(zone) => {
              return {
                label: zone.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }]),
              };
            }}
          />
          <CardSection
            title={"掉落的" + dic.db.drop_item.selfName}
            data={dropItemsData.latest}
            renderItem={(item) => {
              const tableType: keyof DB = (
                {
                  Weapon: "weapon",
                  Armor: "armor",
                  Option: "option",
                  Special: "special",
                  Crystal: "crystal",
                  Consumable: "consumable",
                  Material: "material",
                } satisfies Record<ItemType, keyof DB>
              )[item.itemType];
              return {
                label: item.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: tableType, id: item.id }]),
              };
            }}
          />
        </>
      );
    },
  },
});
