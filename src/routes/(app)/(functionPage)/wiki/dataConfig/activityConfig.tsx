import { Accessor, createResource, createSignal, For, Index, JSX, Setter, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema, zoneSchema } from "~/../db/zod/index";
import { activity, DB, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { ObjRender } from "~/components/module/objRender";
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
import { Transaction } from "kysely";
import { setWikiStore } from "../store";
import { pick } from "lodash-es";
import { arrayDiff, CardSharedSection } from "./utils";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";

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

const ActivityWithRelatedFetcher = async (id: string): Promise<ActivityWithRelated> => {
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

const createActivity = async (trx: Transaction<DB>, activity: activity) => {
  const statistic = await createStatistic(trx);
  return trx
    .insertInto("activity")
    .values({
      ...activity,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

const updateActivity = async (trx: Transaction<DB>, activity: activity) => {
  return trx
    .updateTable("activity")
    .set({
      ...activity,
      updatedByAccountId: store.session.user.account?.id,
    })
    .where("id", "=", activity.id)
    .returningAll()
    .executeTakeFirstOrThrow();
};

const deleteActivity = async (trx: Transaction<DB>, activity: activity) => {
  // 将用到此活动的zone的activityId设为null
  await trx.updateTable("zone").set({ activityId: null }).where("activityId", "=", activity.id).execute();
  // 将用到此活动的recipe的activityId设为null
  await trx.updateTable("recipe").set({ activityId: null }).where("activityId", "=", activity.id).execute();
  // 删除活动
  await trx.deleteFrom("activity").where("id", "=", activity.id).executeTakeFirstOrThrow();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", activity.statisticId).executeTakeFirstOrThrow();
};

const ActivityWithRelatedForm = (dic: dictionary, oldActivity?: ActivityWithRelated) => {
  const formInitialValues = oldActivity ?? defaultActivityWithRelated;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newActivity }) => {
      console.log("oldActivity", oldActivity, "newActivity", newActivity);
      const activityData = pick(newActivity, Object.keys(defaultData.activity) as (keyof activity)[]);
      const db = await getDB();
      const activity = await db.transaction().execute(async (trx) => {
        let activity: activity;
        if (oldActivity) {
          // 更新
          activity = await updateActivity(trx, activityData);
        } else {
          // 新增
          activity = await createActivity(trx, activityData);
        }

        const {
          dataToAdd: subZonesToAdd,
          dataToRemove: subZonesToRemove,
          dataToUpdate: subZonesToUpdate,
        } = await arrayDiff({
          trx,
          table: "zone",
          oldArray: oldActivity?.zones ?? [],
          newArray: newActivity.zones,
        });

        for (const zone of subZonesToAdd) {
          await trx.updateTable("zone").set({ activityId: activity.id }).where("id", "=", zone.id).execute();
        }
        for (const zone of subZonesToRemove) {
          await trx.updateTable("zone").set({ activityId: null }).where("id", "=", zone.id).execute();
        }
        return activity;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "activity", id: activity.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
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
                                        initialValue={item().id}
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

              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof ActivityWithRelated;
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

export const ActivityDataConfig: dataDisplayConfig<activity, ActivityWithRelated, ActivityWithRelated> = {
  defaultData: {
    ...defaultData.activity,
    zones: [],
  },
  dataFetcher: ActivityWithRelatedFetcher,
  datasFetcher: ActivitiesFetcher,
  dataSchema: ActivityWithRelatedSchema,
  table: {
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
    dictionary: (dic) => ActivityWithRelatedDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ data, dic }) => ActivityWithRelatedForm(dic, data),
  card: ({ data, dic }) => {
    console.log(data);

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
              onClick: () => setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }]),
            };
          }}
        />
        <CardSharedSection<ActivityWithRelated> dic={dic} data={data} delete={deleteActivity} />
      </>
    );
  },
};
