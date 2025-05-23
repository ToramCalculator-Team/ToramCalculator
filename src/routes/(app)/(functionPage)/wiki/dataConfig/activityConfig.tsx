import { Accessor, createResource, createSignal, For, JSX, Setter, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema, zoneSchema } from "~/../db/zod";
import { activity, DB, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { ObjRender } from "~/components/module/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import * as Icon from "~/components/icon";
import { store } from "~/store";
import { createStatistic } from "~/repositories/statistic";
import { createId } from "@paralleldrive/cuid2";
import { VirtualTable } from "~/components/module/virtualTable";

type ActivityWithRelated = activity & {
  zones: zone[];
};

const ActivityWithRelatedSchema = z.object({
  ...activitySchema.shape,
  zones: z.array(zoneSchema),
});

const defaultActivityWithRelated: ActivityWithRelated = {
  ...defaultData.activity,
  zones: [],
};

const ActivityWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.activity,
  fields: {
    ...dic.db.activity.fields,
    zones: {
      key: "zones",
      ...dic.db.zone.fields,
      tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
    },
  },
});

const ActivityWithRelatedFetcher = async (id: string) => {
  const db = await getDB();
  const res = await db
    .selectFrom("activity")
    .where("id", "=", id)
    .selectAll("activity")
    .select((eb) => [
      jsonArrayFrom(eb.selectFrom("zone").where("zone.activityId", "=", id).selectAll("zone")).as("zones"),
    ])
    .executeTakeFirstOrThrow();
  return res;
};

const ActivitiesFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("activity").selectAll("activity").execute();
  return res;
};

const ActivityWithRelatedForm = (
  dic: dictionary,
  handleSubmit: (table: keyof DB, id: string) => void,
  data?: ActivityWithRelated,
) => {
  console.log(data ?? defaultActivityWithRelated);
  const form = createForm(() => ({
    defaultValues: data ?? defaultActivityWithRelated,
    onSubmit: async ({ value }) => {
      console.log(value);
      const db = await getDB();
      const activity = await db.transaction().execute(async (trx) => {
        let activity: activity;
        const { zones, ...rest } = value;
        if (data) {
          // 更新
          activity = await trx
            .updateTable("activity")
            .set({
              ...rest,
              updatedByAccountId: store.session.user.account?.id,
            })
            .where("id", "=", data.id)
            .returningAll()
            .executeTakeFirstOrThrow();
          
          // 找出需要处理的区域
          const zonesToRemove = data.zones.filter(zone => !zones.some(z => z.id === zone.id));
          const zonesToAdd = zones.filter(zone => !data.zones.some(z => z.id === zone.id));

          // 处理需要移除的区域（将activityId设为null）
          for (const zone of zonesToRemove) {
            const res = await trx
              .updateTable("zone")
              .set({ activityId: null })
              .where("id", "=", zone.id)
              .returningAll()
              .execute();
              console.log("移除zone", res);
            
          }

          // 处理需要添加的区域（将activityId设为当前activity的id）
          for (const zone of zonesToAdd) {
            const res = await trx
              .updateTable("zone")
              .set({ activityId: activity.id })
              .where("id", "=", zone.id)
              .returningAll()
              .execute();
              console.log("添加zone", res);
          }
        } else {
          // 新增
          const statistic = await createStatistic(trx);
          activity = await trx
            .insertInto("activity")
            .values({
              ...rest,
              id: createId(),
              statisticId: statistic.id,
              createdByAccountId: store.session.user.account?.id,
              updatedByAccountId: store.session.user.account?.id,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        }
        return activity;
      });
      handleSubmit("activity", activity.id);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.activity.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultActivityWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof ActivityWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "statisticId":
              case "createdByAccountId":
              case "updatedByAccountId":
                return null;
              case "zones":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ActivityWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
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
                                const initialValue = _item as zone;
                                return (
                                  <div class="Filed flex items-center gap-2">
                                    <label for={field().name + index()} class="flex-1">
                                      <Autocomplete
                                        id={field().name + index()}
                                        initialValue={initialValue}
                                        setValue={(value) => {
                                          const newArray = [...field().state.value];
                                          newArray[index()] = value;
                                          field().setValue(newArray);
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
                                        field().setValue((prev: zone[]) => prev.filter((_, i) => i !== index()));
                                        console.log(field().state.value);
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
                    }}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof activity;
                const simpleFieldValue = _field[1];
                return renderField<ActivityWithRelated, keyof ActivityWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  ActivityWithRelatedDic(dic),
                  ActivityWithRelatedSchema,
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

const ActivityTable = (
  dic: dictionary,
  tableGlobalFilterStr: Accessor<string>,
  columnHandleClick: (id: string) => void,
) => {
  return VirtualTable<activity>({
    dataFetcher: ActivitiesFetcher,
    columnsDef: [
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
    ],
    dictionary: ActivityWithRelatedDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
    globalFilterStr: tableGlobalFilterStr,
    columnHandleClick: columnHandleClick,
  });
};

export const ActivityDataConfig: dataDisplayConfig<ActivityWithRelated, activity> = {
  defaultData: {
    ...defaultData.activity,
    zones: [],
  },
  dataFetcher: ActivityWithRelatedFetcher,
  datasFetcher: ActivitiesFetcher,
  dataSchema: ActivityWithRelatedSchema,
  table: ({ dic, filterStr, columnHandleClick }) => ActivityTable(dic, filterStr, columnHandleClick),
  form: ({ data, dic, handleSubmit }) => ActivityWithRelatedForm(dic, handleSubmit, data),
  card: ({ data, dic, appendCardTypeAndIds, handleEdit }) => {
    const [zonesData] = createResource(data.id, async (activityId) => {
      const db = await getDB();
      return await db.selectFrom("zone").where("zone.activityId", "=", activityId).selectAll("zone").execute();
    });

    return (
      <>
        <div class="ActivityImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<ActivityWithRelated>({
          data,
          dictionary: ActivityWithRelatedDic(dic),
          dataSchema: ActivityWithRelatedSchema,
          hiddenFields: ["id"],
          fieldGroupMap: {
            基本信息: ["name"],
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

        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex gap-1">
              <Button
                class="w-fit"
                icon={<Icon.Line.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.deleteFrom("activity").where("id", "=", data.id).executeTakeFirstOrThrow();
                }}
              />
              <Button
                class="w-fit"
                icon={<Icon.Line.Edit />}
                onclick={() => handleEdit(data)}
              />
            </div>
          </section>
        </Show>
      </>
    );
  },
};
