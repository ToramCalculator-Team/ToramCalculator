import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createActivity, findActivityById, findActivities, Activity } from "~/repositories/activity";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema, zoneSchema } from "~/../db/zod";
import { activity, DB, zone } from "~/../db/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";

type ActivityWithRelated = activity & {
  zones: zone[];
};

const ActivityWithRelatedSchema = z.object({
  ...activitySchema.shape,
  zones: z.array(zoneSchema),
});

export const createActivityDataConfig = (dic: dictionary): dataDisplayConfig<ActivityWithRelated> => ({
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
    hiddenColumns: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: (props: { cell: Cell<ActivityWithRelated, keyof ActivityWithRelated> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof ActivityWithRelated;
      switch (columnId) {
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
            when={true}
            fallback={tdContent()}
          >
            {props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("activity")
      .where("id", "=", id)
      .selectAll("activity")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("zone")
            .where("zone.activityId", "=", id)
            .selectAll("zone"),
        ).as("zones"),
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
        jsonArrayFrom(
          eb
            .selectFrom("zone")
            .whereRef("zone.activityId", "=", "activity.id")
            .selectAll("zone"),
        ).as("zones"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: ActivityWithRelatedSchema,
  form: {
    hiddenFields: ["id"],
    fieldGenerators: {
      zones: (key, field) => {
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
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const activity = await db.transaction().execute(async (trx) => {
        const { zones, ...rest } = data;
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
    },
  },
  card: {
    cardRender: (
      data: ActivityWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [zonesData] = createResource(data.id, async (activityId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .where("zone.activityId", "=", activityId)
          .selectAll("zone")
          .execute();
      });

      return (
        <>
          {DBDataRender<ActivityWithRelated>({
            data,
            dictionary: {
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
            },
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
