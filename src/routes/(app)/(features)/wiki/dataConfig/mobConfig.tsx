import { For, Show, Index, Accessor, createResource, createSignal } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import Icons from "~/components/icons/index";
import { drop_itemSchema, mobSchema, zoneSchema } from "@db/generated/zod/index";
import { Input } from "~/components/controls/input";
import { z } from "zod";
import { DB, drop_item, mob, zone } from "@db/generated/kysely/kysely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { getDB } from "@db/repositories/database";
import { Select } from "~/components/controls/select";
import { MOB_DIFFICULTY_FLAG } from "@db/schema/enums";
import {
  ItemType,
  MobDifficultyFlag,
  MobType,
  ElementType,
  BossPartType,
  BossPartBreakRewardType,
} from "@db/schema/enums";
import { generateBossDataByFlag } from "~/lib/utils/mob";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { defaultData } from "@db/defaultData";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Autocomplete } from "~/components/controls/autoComplete";
import { createForm, Field } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { createId } from "@paralleldrive/cuid2";
import { Toggle } from "~/components/controls/toggle";
import { createStatistic } from "@db/repositories/statistic";
import { store } from "~/store";
import { setWikiStore } from "../store";
import { dataDisplayConfig } from "./dataConfig";
import { Transaction } from "kysely";
import { pick } from "lodash-es";
import { arrayDiff, CardSharedSection } from "./utils";
import { itemTypeToTableType } from "./item";

type MobWithRelated = mob & {
  appearInZones: zone[];
  dropItems: drop_item[];
};

const defaultMobWithRelated: MobWithRelated = {
  ...defaultData.mob,
  appearInZones: [],
  dropItems: [],
};

const MobWithRelatedSchema = mobSchema.extend({
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

const MobWithRelatedFetcher = async (id: string): Promise<MobWithRelated> => {
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
      jsonArrayFrom(eb.selectFrom("drop_item").whereRef("drop_item.belongToMobId", "=", "mob.id").selectAll("drop_item")).as(
        "dropItems",
      ),
    ])
    .executeTakeFirstOrThrow();
  return res;
};

const MobsFetcher = async () => {
  const db = await getDB();
  const query = db.selectFrom("mob").selectAll("mob");
  const res = query.execute();
  // pgWorker.live.query<mob>(query.compile().sql, [], (res) => {
  //   console.log("-----MobsFetcher------", query.compile().sql);
  //   console.log("-----MobsFetcher------", res);
  // });
  return res;
};

const createMob = async (trx: Transaction<DB>, value: mob) => {
  const statistic = await createStatistic(trx);
  const mob = await trx
    .insertInto("mob")
    .values({
      ...value,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.account?.id,
      updatedByAccountId: store.session.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return mob;
};

const updateMob = async (trx: Transaction<DB>, value: mob) => {
  const mob = await trx
    .updateTable("mob")
    .set({
      ...value,
      updatedByAccountId: store.session.account?.id,
    })
    .where("id", "=", value.id)
    .returningAll()
    .executeTakeFirstOrThrow();

  return mob;
};

const deleteMob = async (trx: Transaction<DB>, mob: mob) => {
  // 删除和zone的关联
  await trx.deleteFrom("_mobTozone").where("A", "=", mob.id).execute();
  // 将掉落物归属调整至defaultMob
  await trx.updateTable("drop_item").set({ belongToMobId: "defaultMobId" }).where("belongToMobId", "=", mob.id).execute();
  // 删除mob
  await trx.deleteFrom("mob").where("id", "=", mob.id).execute();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", mob.statisticId).execute();
};

const MobWithRelatedForm = (dic: dictionary, oldMob?: MobWithRelated) => {
  const formInitialValues = oldMob ?? defaultMobWithRelated;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newMob }) => {
      console.log("oldMob", oldMob, "newMob", newMob);
      const mobData = pick(newMob, Object.keys(defaultData.mob) as (keyof mob)[]);
      const db = await getDB();
      const mob = await db.transaction().execute(async (trx) => {
        let mob: mob;
        if (oldMob) {
          mob = await updateMob(trx, mobData);
        } else {
          mob = await createMob(trx, mobData);
        }

        const {
          dataToAdd: appearInZonesToAdd,
          dataToRemove: appearInZonesToRemove,
          dataToUpdate: appearInZonesToUpdate,
        } = await arrayDiff({
          trx,
          table: "zone",
          oldArray: oldMob?.appearInZones ?? [],
          newArray: newMob.appearInZones,
        });

        // 关系项更新
        for (const zone of appearInZonesToAdd) {
          await trx.insertInto("_mobTozone").values({ A: mob.id, B: zone.id }).execute();
        }
        for (const zone of appearInZonesToRemove) {
          await trx.deleteFrom("_mobTozone").where("A", "=", mob.id).where("B", "=", zone.id).execute();
        }
        for (const zone of appearInZonesToUpdate) {
          await trx
            .updateTable("_mobTozone")
            .set({ B: zone.id })
            .where("A", "=", mob.id)
            .where("B", "=", zone.id)
            .execute();
        }

        const {
          dataToAdd: dropItemsToAdd,
          dataToRemove: dropItemsToRemove,
          dataToUpdate: dropItemsToUpdate,
        } = await arrayDiff({
          trx,
          table: "drop_item",
          oldArray: oldMob?.dropItems ?? [],
          newArray: newMob.dropItems,
        });

        for (const dropItem of dropItemsToAdd) {
          await trx
            .insertInto("drop_item")
            .values({
              ...dropItem,
              id: createId(),
              belongToMobId: mob.id,
            })
            .execute();
        }
        for (const dropItem of dropItemsToRemove) {
          await trx.deleteFrom("drop_item").where("id", "=", dropItem.id).execute();
        }
        for (const dropItem of dropItemsToUpdate) {
          await trx.updateTable("drop_item").set(dropItem).where("id", "=", dropItem.id).execute();
        }

        return mob;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "mob", id: mob.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
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
                            Water: <Icons.Game.ElementWater class="h-6 w-6" />,
                            Fire: <Icons.Game.ElementFire class="h-6 w-6" />,
                            Earth: <Icons.Game.ElementEarth class="h-6 w-6" />,
                            Wind: <Icons.Game.ElementWind class="h-6 w-6" />,
                            Light: <Icons.Game.ElementLight class="h-6 w-6" />,
                            Dark: <Icons.Game.ElementDark class="h-6 w-6" />,
                            Normal: <Icons.Game.ElementNoElement class="h-6 w-6" />,
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
                              {(zone, index) => {
                                return (
                                  <div class="Filed flex items-center gap-2">
                                    <label for={fieldKey + index} class="flex-1">
                                      <Autocomplete
                                        id={fieldKey + index}
                                        initialValue={zone().id}
                                        setValue={(value) => {
                                          field().setValue((pre) => {
                                            const newArray = [...pre];
                                            newArray[index] = value;
                                            return newArray;
                                          });
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
                          <Index each={field().state.value}>
                            {(dropItem, i) => {
                              console.log("i, dropItem", i, dropItem());
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
                                        case "belongToMobId":
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
                                                    selector().type === "Boss" && selector().breakRewardType !== "None"
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
                                                    selector().type === "Boss" && selector().breakRewardType !== "None"
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
                                                    initialValue={subField().state.value}
                                                    setValue={(value) => subField().setValue(value.id)}
                                                    datasFetcher={async () => {
                                                      const db = await getDB();
                                                      const items = await db
                                                        .selectFrom("item")
                                                        .select(["id", "name"])

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
                  {state().isSubmitting ? "..." : oldMob ? dic.ui.actions.update : dic.ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};

export const MobDataConfig: dataDisplayConfig<mob, MobWithRelated, MobWithRelated> = {
  defaultData: defaultMobWithRelated,
  dataFetcher: MobWithRelatedFetcher,
  datasFetcher: MobsFetcher,
  dataSchema: MobWithRelatedSchema,
  table: {
    dataFetcher: MobsFetcher,
    columnsDef: [
      {
        id: "id",
        accessorFn: (row) => row.id,
        cell: (info) => info.getValue(),
        size: {
          "zh-CN": 160,
          "zh-TW": 160,
          ja: 160,
          en: 160,
        }[store.settings.userInterface.language],
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        cell: (info) => info.getValue(),
        size: {
          "zh-CN": 180,
          "zh-TW": 180,
          ja: 260,
          en: 260,
        }[store.settings.userInterface.language],
      },
      {
        id: "initialElement",
        accessorFn: (row) => row.initialElement,
        cell: (info) => info.getValue<ElementType>(),
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 115,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        cell: (info) => info.getValue<MobType>(),
        size: {
          "zh-CN": 80,
          "zh-TW": 80,
          ja: 120,
          en: 120,
        }[store.settings.userInterface.language],
      },
      {
        id: "captureable",
        accessorFn: (row) => row.captureable,
        cell: (info) => info.getValue<Boolean>().toString(),
        size: {
          "zh-CN": 100,
          "zh-TW": 100,
          ja: 100,
          en: 100,
        }[store.settings.userInterface.language],
      },
      {
        id: "baseLv",
        accessorFn: (row) => row.baseLv,
        cell: (info) => info.getValue(),
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 140,
        }[store.settings.userInterface.language],
      },
      {
        id: "experience",
        accessorFn: (row) => row.experience,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "physicalDefense",
        accessorFn: (row) => row.physicalDefense,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "physicalResistance",
        accessorFn: (row) => row.physicalResistance,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "magicalDefense",
        accessorFn: (row) => row.magicalDefense,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "magicalResistance",
        accessorFn: (row) => row.magicalResistance,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "criticalResistance",
        accessorFn: (row) => row.criticalResistance,
        size: {
          "zh-CN": 115,
          "zh-TW": 115,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "avoidance",
        accessorFn: (row) => row.avoidance,
        size: {
          "zh-CN": 100,
          "zh-TW": 100,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "dodge",
        accessorFn: (row) => row.dodge,
        size: {
          "zh-CN": 100,
          "zh-TW": 100,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "block",
        accessorFn: (row) => row.block,
        size: {
          "zh-CN": 100,
          "zh-TW": 100,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
      {
        id: "actions",
        accessorFn: (row) => row.actions,
        size: {
          "zh-CN": 120,
          "zh-TW": 120,
          ja: 180,
          en: 180,
        }[store.settings.userInterface.language],
      },
    ],
    dictionary: (dic) => MobWithRelatedDic(dic),
    hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
    defaultSort: { id: "experience", desc: true },
    tdGenerator: {
      initialElement: (props) =>
        ({
          Water: <Icons.Game.ElementWater class="h-12 w-12" />,
          Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
          Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
          Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
          Light: <Icons.Game.ElementLight class="h-12 w-12" />,
          Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
          Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
        })[props.cell.getValue<ElementType>()],
      name: (props) => (
        <div class="text-accent-color flex flex-col gap-1">
          <span>{props.cell.getValue<string>()}</span>
          <Show when={props.cell.row.original.type === "Mob"}>
            <span class="text-main-text-color text-xs">{props.cell.row.original.captureable}</span>
          </Show>
        </div>
      ),
    },
  },
  form: ({ dic, data }) => MobWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
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
        .where("drop_item.belongToMobId", "=", mobId)
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
                    <Icons.Filled.Star
                      class={
                        ["Normal", "Hard", "Lunatic", "Ultimate"].includes(option.value)
                          ? "fill-brand-color-1st!"
                          : "fill-none!"
                      }
                    />
                    <Icons.Filled.Star
                      class={
                        ["Hard", "Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-2nd!" : "fill-none!"
                      }
                    />
                    <Icons.Filled.Star
                      class={["Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-3rd!" : "fill-none!"}
                    />
                    <Icons.Filled.Star
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
              "normalDefExp",
              "physicDefExp",
              "magicDefExp",
            ],
            额外说明: ["details"],
            怪物行为: ["actions"],
            词条信息: ["dataSources"],
          },
        })}

        <CardSection
          title={"出现的" + dic.db.zone.selfName}
          data={zonesData.latest}
          dataRender={(zone) => {
            return <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }])}>{zone.name}</Button>
          }}
        />
        <CardSection
          title={"掉落的" + dic.db.drop_item.selfName}
          data={dropItemsData.latest}
          dataRender={(item) => {
            return <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: itemTypeToTableType(item.itemType!), id: item.id }])}>{item.name}</Button>
          }}
        />
        <CardSharedSection<MobWithRelated> dic={dic} data={data} delete={deleteMob} />
      </>
    );
  },
};
