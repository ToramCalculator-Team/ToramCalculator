import { flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show, createEffect, Index, on, Accessor } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createMob } from "~/repositories/mob";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import * as Icon from "~/components/icon";
import { drop_itemSchema, mobSchema, zoneSchema } from "~/../db/zod";
import { Input } from "~/components/controls/input";
import { z } from "zod";
import { DB, drop_item, mob, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { getDB } from "~/repositories/database";
import { Select } from "~/components/controls/select";
import { MOB_DIFFICULTY_FLAG } from "~/../db/enums";
import {
  ItemType,
  MobDifficultyFlag,
  MobType,
  ElementType,
  BossPartType,
  BossPartBreakRewardType,
} from "~/../db/kysely/enums";
import { generateBossDataByFlag } from "~/lib/mob";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Autocomplete } from "~/components/controls/autoComplete";
import { createForm, Field } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { createId } from "@paralleldrive/cuid2";
import { Toggle } from "~/components/controls/toggle";
import { createStatistic } from "~/repositories/statistic";
import { store } from "~/store";
import { VirtualTable } from "~/components/module/virtualTable";

type MobWithRelated = mob & {
  appearInZones: zone[];
  dropItems: drop_item[];
};

const defaultMobWithRelated: MobWithRelated = {
  ...defaultData.mob,
  appearInZones: [],
  dropItems: [],
};

const MobWithRelatedSchema = z.object({
  ...mobSchema.shape,
  appearInZones: z.array(zoneSchema),
  dropItems: z.array(drop_itemSchema),
});

const MobWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.mob,
  fields: {
    ...dic.db.mob.fields,
    appearInZones: {
      key: "appearInZones",
      tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
    },
    dropItems: {
      key: "dropItems",
      tableFieldDescription: dic.db.drop_item.fields.itemId.tableFieldDescription,
      formFieldDescription: dic.db.drop_item.fields.itemId.formFieldDescription,
    },
  },
});

const MobWithRelatedFetcher = async (id: string) => {
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
      ).as("appearInZones"),
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
};

const MobsFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("mob").selectAll("mob").execute();
  return res;
};

const MobWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultMobWithRelated,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const mob = await db.transaction().execute(async (trx) => {
        const { appearInZones, dropItems, ...rest } = value;
        const statistic = await createStatistic(trx);
        const mob = await trx
          .insertInto("mob")
          .values({
            ...rest,
            id: createId(),
            statisticId: statistic.id,
            createdByAccountId: store.session.user.account?.id,
            updatedByAccountId: store.session.user.account?.id,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        if (appearInZones.length > 0) {
          for (const zone of appearInZones) {
            await trx.insertInto("_mobTozone").values({ A: mob.id, B: zone.id }).execute();
          }
        }
        if (dropItems.length > 0) {
          for (const dropItem of dropItems) {
            await trx
              .insertInto("drop_item")
              .values({
                ...dropItem,
                id: createId(),
                dropById: mob.id,
              })
              .execute();
          }
        }
        return mob;
      });
      handleSubmit("mob", mob.id);
    },
  }));

  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.mob.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultMobWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof MobWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "statisticId":
              case "actions":
              case "createdByAccountId":
              case "updatedByAccountId":
                return null;

              case "partsExperience":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Boss"}>
                            <Input
                              type="number"
                              title={dic.db.mob.fields[fieldKey].key}
                              description={dic.db.mob.fields[fieldKey].formFieldDescription}
                              state={fieldInfo(field())}
                              value={field().state.value}
                              onChange={(e) => {
                                field().setValue(Number(e.target.value));
                              }}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            ></Input>
                          </Show>
                        )}
                      </form.Subscribe>
                    )}
                  </form.Field>
                );
              case "captureable":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Mob"}>
                            <Input
                              title={dic.db.mob.fields[fieldKey].key}
                              description={dic.db.mob.fields[fieldKey].formFieldDescription}
                              state={fieldInfo(field())}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            >
                              <Toggle
                                id={field().name}
                                onClick={() => {
                                  field().setValue(!field().state.value);
                                }}
                                onBlur={field().handleBlur}
                                name={field().name}
                                checked={field().state.value as boolean}
                              />
                            </Input>
                          </Show>
                        )}
                      </form.Subscribe>
                    )}
                  </form.Field>
                );
              case "type":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.mob.fields[fieldKey].key}
                        description={dic.db.mob.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <EnumSelect
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as MobType)}
                          options={MobWithRelatedSchema.shape[fieldKey].options}
                          dic={dic.db.mob.fields[fieldKey].enumMap}
                          field={{
                            id: field().name,
                            name: field().name,
                          }}
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              case "initialElement":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.mob.fields[fieldKey].key}
                        description={dic.db.mob.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <EnumSelect
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as ElementType)}
                          options={MobWithRelatedSchema.shape[fieldKey].options}
                          dic={dic.db.mob.fields[fieldKey].enumMap}
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
                    )}
                  </form.Field>
                );
              case "appearInZones":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return (
                        <Input
                          title={"所属的" + dic.db.zone.selfName}
                          description={dic.db.zone.description}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <div class="ArrayBox flex w-full flex-col gap-2">
                            <Index each={field().state.value}>
                              {(item, index) => {
                                return (
                                  <div class="Filed flex items-center gap-2">
                                    <label for={fieldKey + index} class="flex-1">
                                      <Autocomplete
                                        id={fieldKey + index}
                                        initialValue={item()}
                                        setValue={(value) => {
                                          field().setValue((pre) => {
                                            const newArray = [...pre];
                                            newArray[index] = value;
                                            return newArray;
                                          });
                                        }}
                                        datasFetcher={async () => {
                                          const db = await getDB();
                                          const zones = await db
                                            .selectFrom("zone")
                                            .selectAll("zone")
                                            .limit(10)
                                            .execute();
                                          return zones;
                                        }}
                                        displayField="name"
                                        valueField="id"
                                      />
                                    </label>
                                    <Button
                                      onClick={(e) => {
                                        field().removeValue(index);
                                        e.stopPropagation();
                                      }}
                                    >
                                      -
                                    </Button>
                                  </div>
                                );
                              }}
                            </Index>
                            <Button
                              onClick={(e) => {
                                field().pushValue(defaultData.zone);
                              }}
                              class="w-full"
                            >
                              +
                            </Button>
                          </div>
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              case "dropItems":
                return (
                  <form.Field
                    name={`dropItems`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MobWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.drop_item.selfName}
                        description={dic.db.drop_item.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                          <Show when={field().state.value.length > 0}>
                            <Index each={field().state.value}>
                              {(dropItem, i) => {
                                return (
                                  <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                    <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                      <span class="text-accent-color font-bold">
                                        {dic.db.drop_item.selfName + " " + i}
                                      </span>
                                      <Button
                                        onClick={() => {
                                          field().removeValue(i);
                                        }}
                                      >
                                        -
                                      </Button>
                                    </div>
                                    <Index each={Object.entries(dropItem())}>
                                      {(dropItemField, index) => {
                                        const fieldKey = dropItemField()[0] as keyof drop_item;
                                        const fieldValue = dropItemField()[1];
                                        switch (fieldKey) {
                                          case "id":
                                          case "dropById":
                                            return null;
                                          case "breakRewardType":
                                            return (
                                              <form.Subscribe selector={(state) => state.values.type}>
                                                {(selector) => (
                                                  <Show when={selector() === "Boss"}>
                                                    {renderField<drop_item, "breakRewardType">(
                                                      form,
                                                      `dropItems[${i}].breakRewardType`,
                                                      fieldValue as BossPartBreakRewardType,
                                                      dic.db.drop_item,
                                                      drop_itemSchema,
                                                    )}
                                                  </Show>
                                                )}
                                              </form.Subscribe>
                                            );
                                          case "relatedPartInfo":
                                            return (
                                              <form.Subscribe
                                                selector={(state) => {
                                                  const dropItem = state.values.dropItems[i];
                                                  return {
                                                    type: state.values.type,
                                                    breakRewardType: dropItem?.breakRewardType || "None",
                                                  };
                                                }}
                                              >
                                                {(selector) => (
                                                  <Show
                                                    when={
                                                      selector().type === "Boss" &&
                                                      selector().breakRewardType !== "None"
                                                    }
                                                  >
                                                    {renderField<drop_item, "relatedPartInfo">(
                                                      form,
                                                      `dropItems[${i}].relatedPartInfo`,
                                                      fieldValue as string,
                                                      dic.db.drop_item,
                                                      drop_itemSchema,
                                                    )}
                                                  </Show>
                                                )}
                                              </form.Subscribe>
                                            );
                                          case "relatedPartType":
                                            return (
                                              <form.Subscribe
                                                selector={(state) => {
                                                  const currentDropItem = state.values.dropItems[i];
                                                  if (!currentDropItem) {
                                                    return {
                                                      type: state.values.type,
                                                      breakRewardType: "None",
                                                    };
                                                  }
                                                  return {
                                                    type: state.values.type,
                                                    breakRewardType: currentDropItem.breakRewardType || "None",
                                                  };
                                                }}
                                              >
                                                {(selector) => (
                                                  <Show
                                                    when={
                                                      selector().type === "Boss" &&
                                                      selector().breakRewardType !== "None"
                                                    }
                                                  >
                                                    {renderField<drop_item, "relatedPartType">(
                                                      form,
                                                      `dropItems[${i}].relatedPartType`,
                                                      fieldValue as BossPartType,
                                                      dic.db.drop_item,
                                                      drop_itemSchema,
                                                    )}
                                                  </Show>
                                                )}
                                              </form.Subscribe>
                                            );
                                          case "itemId":
                                            return (
                                              <form.Field name={`dropItems[${i}].${fieldKey}`}>
                                                {(subField) => (
                                                  <Input
                                                    title={dic.db.task_collect_require.fields.itemId.key}
                                                    description={
                                                      dic.db.task_collect_require.fields.itemId.formFieldDescription
                                                    }
                                                    state={fieldInfo(field())}
                                                  >
                                                    <Autocomplete
                                                      id={`dropItems[${i}].${fieldKey}`}
                                                      initialValue={{
                                                        id: subField().state.value,
                                                        name: "",
                                                      }}
                                                      setValue={(value) => {
                                                        subField().setValue(value.id);
                                                      }}
                                                      datasFetcher={async () => {
                                                        const db = await getDB();
                                                        const items = await db
                                                          .selectFrom("item")
                                                          .select(["id", "name"])
                                                          .limit(10)
                                                          .execute();
                                                        return items;
                                                      }}
                                                      displayField="name"
                                                      valueField="id"
                                                    />
                                                  </Input>
                                                )}
                                              </form.Field>
                                            );
                                          default:
                                            // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                            const simpleFieldKey = `dropItems[${i}].${fieldKey}`;
                                            const simpleFieldValue = fieldValue;
                                            return renderField<drop_item, keyof drop_item>(
                                              form,
                                              simpleFieldKey,
                                              simpleFieldValue,
                                              dic.db.drop_item,
                                              drop_itemSchema,
                                            );
                                        }
                                      }}
                                    </Index>
                                  </div>
                                );
                              }}
                            </Index>
                          </Show>
                          <Button
                            onClick={() => {
                              field().pushValue(defaultData.drop_item);
                            }}
                            class="w-full"
                          >
                            +
                          </Button>
                        </div>
                      </Input>
                    )}
                  </form.Field>
                );

              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof mob;
                const simpleFieldValue = _field[1];
                return renderField<MobWithRelated, keyof MobWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  MobWithRelatedDic(dic),
                  MobWithRelatedSchema,
                );
            }
          }}
        </For>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <div class="flex items-center gap-1">
                <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                  {state().isSubmitting ? "..." : dic.ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};

const MobTable = (dic: dictionary, filterStr: Accessor<string>, columnHandleClick: (column: string) => void) => {
  return VirtualTable<mob>({
    dataFetcher: MobsFetcher,
    columnsDef: [
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
    dictionary: MobWithRelatedDic(dic),
    defaultSort: { id: "experience", desc: true },
    hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
    tdGenerator: {
      initialElement: (props) =>
        ({
          Water: <Icon.Element.Water class="h-12 w-12" />,
          Fire: <Icon.Element.Fire class="h-12 w-12" />,
          Earth: <Icon.Element.Earth class="h-12 w-12" />,
          Wind: <Icon.Element.Wind class="h-12 w-12" />,
          Light: <Icon.Element.Light class="h-12 w-12" />,
          Dark: <Icon.Element.Dark class="h-12 w-12" />,
          Normal: <Icon.Element.NoElement class="h-12 w-12" />,
        })[props.cell.getValue<keyof DataEnums["mob"]["initialElement"]>()],
      name: (props) => (
        <div class="text-accent-color flex flex-col gap-1">
          <span>{props.cell.getValue<string>()}</span>
          <Show when={props.cell.row.original.type === "Mob"}>
            <span class="text-main-text-color text-xs">{props.cell.row.original.captureable}</span>
          </Show>
        </div>
      ),
    },
    globalFilterStr: filterStr,
    columnHandleClick: columnHandleClick,
  });
};

export const MobDataConfig: dataDisplayConfig<MobWithRelated, mob> = {
  defaultData: defaultMobWithRelated,
  dataFetcher: MobWithRelatedFetcher,
  datasFetcher: MobsFetcher,
  dataSchema: MobWithRelatedSchema,
  mainContent: (dic, filterStr, columnHandleClick) => MobTable(dic, filterStr, columnHandleClick),
  form: (dic, handleSubmit) => MobWithRelatedForm(dic, handleSubmit),
  card: (dic, data, appendCardTypeAndIds) => {
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
            optionGenerator={(option, selected, handleSelect) => {
              return (
                <div
                  class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                  onClick={handleSelect}
                >
                  <div class="text-accent-color flex gap-1">
                    <Icon.Filled.Star
                      class={
                        ["Normal", "Hard", "Lunatic", "Ultimate"].includes(option.value)
                          ? "fill-brand-color-1st!"
                          : "fill-none!"
                      }
                    />
                    <Icon.Filled.Star
                      class={
                        ["Hard", "Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-2nd!" : "fill-none!"
                      }
                    />
                    <Icon.Filled.Star
                      class={["Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-3rd!" : "fill-none!"}
                    />
                    <Icon.Filled.Star
                      class={["Ultimate"].includes(option.value) ? "fill-brand-color-4th!" : "fill-none!"}
                    />
                  </div>
                  <span class="text-accent-color">
                    Lv:
                    {data.baseLv +
                      ({
                        Easy: -1,
                        Normal: 0,
                        Hard: 1,
                        Lunatic: 2,
                        Ultimate: 4,
                      }[option.value] ?? 0) *
                        10}
                  </span>
                </div>
              );
            }}
          />
        </Show>
        {ObjRender<MobWithRelated>({
          data: generateBossDataByFlag(data, difficulty()),
          dictionary: MobWithRelatedDic(dic),
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
          title={"出现的" + dic.db.zone.selfName}
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

        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex flex-col gap-3">
              <Button
                class="w-fit"
                icon={<Icon.Line.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.deleteFrom("mob").where("id", "=", data.id).executeTakeFirstOrThrow();
                }}
              />
            </div>
          </section>
        </Show>
      </>
    );
  },
};
