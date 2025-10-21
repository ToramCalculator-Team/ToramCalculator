import { Accessor, createResource, createSignal, For, Index, JSX, Setter, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema } from "@db/generated/zod/index";
import { activity, DB, zone } from "@db/generated/zod/index";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "@db/repositories/database";
import {
  ActivityWithRelationsSchema,
  ActivityWithRelations,
  findActivityWithRelations,
  findActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from "@db/repositories/activity";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { defaultData } from "@db/defaultData";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { setWikiStore } from "../store";
import { pick } from "lodash-es";
import { arrayDiff, CardSharedSection } from "./utils";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { setStore, store } from "~/store";

const defaultActivityWithRelations: ActivityWithRelations = {
  ...defaultData.activity,
  statistic: defaultData.statistic,
  zones: [],
};

const ActivityWithRelationsDic = (dic: dictionary) => ({
  ...dic.db.activity,
  fields: {
    ...dic.db.activity.fields,
    zones: {
      key: "zones",
      ...dic.db.zone.fields,
      tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
    },
    statistic: {
      key: "statistic",
      ...dic.db.statistic.fields,
      tableFieldDescription: '统计',
      formFieldDescription: '统计',
    },
  },
});

const ActivityWithRelationsForm = (dic: dictionary, oldActivity?: ActivityWithRelations) => {
  const formInitialValues = oldActivity ?? defaultActivityWithRelations;
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
      setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "activity", id: activity.id });
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
        <For each={Object.entries(defaultActivityWithRelations)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof ActivityWithRelations;
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
                      onChangeAsync: ActivityWithRelationsSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return (
                        <Input
                          title={"所属的" + dic.db.zone.selfName}
                          description={dic.db.zone.description}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border"
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
                const simpleFieldKey = _field[0] as keyof ActivityWithRelations;
                const simpleFieldValue = _field[1];
                return renderField<ActivityWithRelations, keyof ActivityWithRelations>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  ActivityWithRelationsDic(dic),
                  ActivityWithRelationsSchema,
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

export const ActivityDataConfig: dataDisplayConfig<activity, ActivityWithRelations, ActivityWithRelations> = {
  defaultData: defaultActivityWithRelations,
  dataFetcher: findActivityWithRelations,
  datasFetcher: findActivities,
  dataSchema: ActivityWithRelationsSchema,
  table: {
    dataFetcher: findActivities,
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
    dictionary: (dic) => ActivityWithRelationsDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ data, dic }) => ActivityWithRelationsForm(dic, data),
  card: ({ data, dic }) => {
    const [zonesData] = createResource(data.id, async (activityId) => {
      const db = await getDB();
      return await db.selectFrom("zone").where("zone.activityId", "=", activityId).selectAll("zone").execute();
    });

    return (
      <>
        <div class="ActivityImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<ActivityWithRelations>({
          data,
          dictionary: ActivityWithRelationsDic(dic),
          dataSchema: ActivityWithRelationsSchema,
          hiddenFields: ["id"],
          fieldGroupMap: {
            基本信息: ["name"],
          },
        })}

        <CardSection
          title={"包含的" + dic.db.zone.selfName}
          data={zonesData.latest}
          dataRender={(zone) => {
            return (
              <Button onClick={() => setStore("pages","cardGroup", store.pages.cardGroup.length ,{ type: "zone", id: zone.id })}>
                {zone.name}
              </Button>
            );
          }}
        />
        <CardSharedSection<ActivityWithRelations> dic={dic} data={data} delete={deleteActivity} />
      </>
    );
  },
};
