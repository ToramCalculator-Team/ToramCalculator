import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createActivity, findActivityById, findActivities, Activity } from "~/repositories/activity";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema, zoneSchema } from "~/../db/zod";
import { activity, DB, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";

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

const ActivityWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultActivityWithRelated,
    onSubmit: async ({ value }) => {
      console.log("Submit value：", value);
      const db = await getDB();
      const activity = await db.transaction().execute(async (trx) => {
        const { zones, ...rest } = value;
        console.log("zones", zones);
        console.log("rest", rest);
        const activity = await createActivity(trx, {
          ...rest,
        });
        if (zones.length > 0) {
          for (const zone of zones) {
            await trx.updateTable("zone").set({ activityId: activity.id }).where("id", "=", zone.id).execute();
          }
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
                    }}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof activity;
                const simpleFieldValue = _field[1];
                return renderField<ActivityWithRelated, keyof ActivityWithRelated>(form, simpleFieldKey, simpleFieldValue, ActivityWithRelatedDic(dic), ActivityWithRelatedSchema);
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

export const createActivityDataConfig = (dic: dictionary): dataDisplayConfig<ActivityWithRelated, activity> => ({
  defaultData: {
    ...defaultData.activity,
    zones: [],
  },
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
    ],
    dic: ActivityWithRelatedDic(dic),
    hiddenColumns: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  dataFetcher: async (id) => {
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
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("activity")
      .selectAll("activity")
      .select((eb) => [
        jsonArrayFrom(eb.selectFrom("zone").whereRef("zone.activityId", "=", "activity.id").selectAll("zone")).as(
          "zones",
        ),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: ActivityWithRelatedSchema,
  form: (handleSubmit) => ActivityWithRelatedForm(dic, handleSubmit),
  card: {
    cardRender: (
      data: ActivityWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [zonesData] = createResource(data.id, async (activityId) => {
        const db = await getDB();
        return await db.selectFrom("zone").where("zone.activityId", "=", activityId).selectAll("zone").execute();
      });

      return (
        <>
          {DBDataRender<ActivityWithRelated>({
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
        </>
      );
    },
  },
});
