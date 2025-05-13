import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createZone, findZoneById, findZones, Zone } from "~/repositories/zone";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema, addressSchema, mobSchema, npcSchema, zoneSchema } from "~/../db/zod";
import { activity, address, DB, mob, npc, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";

type ZoneWithRelated = zone & {
  mobs: mob[];
  npcs: npc[];
  linkZones: zone[];
};

const ZoneWithRelatedSchema = z.object({
  ...zoneSchema.shape,
  mobs: z.array(mobSchema),
  npcs: z.array(npcSchema),
  linkZones: z.array(zoneSchema),
});

export const createZoneDataConfig = (dic: dictionary): dataDisplayConfig<ZoneWithRelated> => ({
  defaultData: {
    ...defaultData.zone,
    mobs: [],
    npcs: [],
    linkZones: [],
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("zone")
      .where("id", "=", id)
      .selectAll("zone")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("_linkZones")
            .innerJoin("zone", "zone.id", "_linkZones.B")
            .whereRef("_linkZones.A", "=", "zone.id")
            .selectAll("zone"),
        ).as("linkZones"),
        jsonArrayFrom(
          eb
            .selectFrom("_mobTozone")
            .innerJoin("mob", "mob.id", "_mobTozone.B")
            .whereRef("_mobTozone.A", "=", "zone.id")
            .selectAll("mob"),
        ).as("mobs"),
        jsonArrayFrom(eb.selectFrom("npc").whereRef("npc.zoneId", "=", "zone.id").selectAll("npc")).as("npcs"),
        jsonObjectFrom(eb.selectFrom("address").whereRef("address.id", "=", "zone.addressId").selectAll("address"))
          .$notNull()
          .as("belongToAddress"),
        jsonObjectFrom(eb.selectFrom("activity").whereRef("activity.id", "=", "zone.activityId").selectAll("activity"))
          .$notNull()
          .as("belongToActivity"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("zone")
      .selectAll("zone")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("_linkZones")
            .innerJoin("zone", "zone.id", "_linkZones.B")
            .whereRef("_linkZones.A", "=", "zone.id")
            .selectAll("zone"),
        ).as("linkZones"),
        jsonArrayFrom(
          eb
            .selectFrom("_mobTozone")
            .innerJoin("mob", "mob.id", "_mobTozone.B")
            .whereRef("_mobTozone.A", "=", "zone.id")
            .selectAll("mob"),
        ).as("mobs"),
        jsonArrayFrom(eb.selectFrom("npc").whereRef("npc.zoneId", "=", "zone.id").selectAll("npc")).as("npcs"),
        jsonObjectFrom(eb.selectFrom("address").whereRef("address.id", "=", "zone.addressId").selectAll("address"))
          .$notNull()
          .as("belongToAddress"),
        jsonObjectFrom(eb.selectFrom("activity").whereRef("activity.id", "=", "zone.activityId").selectAll("activity"))
          .$notNull()
          .as("belongToActivity"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: ZoneWithRelatedSchema,
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
        accessorKey: "rewardNodes",
        cell: (info) => info.getValue<number | null>(),
        size: 120,
      },
      {
        accessorKey: "activityId",
        cell: (info) => info.getValue<string | null>(),
        size: 160,
      },
      {
        accessorKey: "addressId",
        cell: (info) => info.getValue<string>(),
        size: 160,
      },
    ],
    defaultSort: { id: "name", desc: false },
    hiddenColumns: ["id"],
    tdGenerator: (props) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof zone;
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
            when={
              props.cell.column.id !== "linkZone" // linkZone 已特殊处理，再以文本显示
            }
            fallback={tdContent()}
          >
            {"enumMap" in dic.db.zone.fields[columnId]
              ? (dic.db.zone.fields[columnId] as EnumFieldDetail<keyof ZoneWithRelated>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    hiddenFields: ["id"],
    fieldGenerators: {
      mobs: (key, field) => {
        return (
          <Input
            title={dic.db.mob.selfName}
            description={dic.db.mob.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2">
              <For each={field().state.value}>
                {(_item, index) => {
                  const initialValue = _item as mob;
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
                            const mobs = await db.selectFrom("mob").selectAll("mob").execute();
                            return mobs;
                          }}
                          displayField="name"
                          valueField="id"
                        />
                      </label>
                      <Button
                        onClick={(e) => {
                          field().setValue((prev: mob[]) => prev.filter((_, i) => i !== index()));
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
                  field().setValue((prev: mob[]) => [...prev, defaultData.mob]);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      npcs: (key, field) => {
        return (
          <Input
            title={dic.db.npc.selfName}
            description={dic.db.npc.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2">
              <For each={field().state.value}>
                {(_item, index) => {
                  const initialValue = _item as npc;
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
                            const npcs = await db.selectFrom("npc").selectAll("npc").execute();
                            return npcs;
                          }}
                          displayField="name"
                          valueField="id"
                        />
                      </label>
                      <Button
                        onClick={(e) => {
                          field().setValue((prev: npc[]) => prev.filter((_, i) => i !== index()));
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
                  field().setValue((prev: npc[]) => [...prev, defaultData.npc]);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      linkZones: (key, field) => {
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
      activityId: (key, field) => {
        const initialValue = field().state.value;
        return (
          <Input
            title={dic.db.zone.fields[key].key}
            description={dic.db.zone.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              id={field().name}
              initialValue={initialValue}
              setValue={(value) => {
                field().setValue(value.id);
              }}
              datasFetcher={async () => {
                const db = await getDB();
                const activities = await db.selectFrom("activity").selectAll("activity").execute();
                return activities;
              }}
              displayField="name"
              valueField="id"
            />
          </Input>
        );
      },
      addressId: (key, field) => {
        const initialValue = field().state.value;
        return (
          <Input
            title={dic.db.zone.fields[key].key}
            description={dic.db.zone.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              id={key}
              initialValue={initialValue}
              setValue={(value) => {
                field().setValue(value.id);
              }}
              datasFetcher={async () => {
                const db = await getDB();
                const addresses = await db.selectFrom("address").selectAll("address").execute();
                return addresses;
              }}
              displayField="name"
              valueField="id"
            />
          </Input>
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const zone = await db.transaction().execute(async (trx) => {
        const { linkZones, mobs, npcs, ...rest } = data;
        console.log("linkZones", linkZones, "mobs", mobs, "npcs", npcs, "zone", rest);
        const zone = await createZone(trx, {
          ...rest,
        });
        if (linkZones.length > 0) {
          for (const linkedZone of linkZones) {
            await trx.insertInto("_linkZones").values({ A: zone.id, B: linkedZone.id }).execute();
          }
        }
        if (mobs.length > 0) {
          for (const mob of mobs) {
            await trx.insertInto("_mobTozone").values({ A: mob.id, B: zone.id }).execute();
          }
        }
        if (npcs.length > 0) {
          for (const npc of npcs) {
            await trx.updateTable("npc").set({ zoneId: zone.id }).where("id", "=", npc.id).execute();
          }
        }
        return zone;
      });
    },
  },
  card: {
    cardRender: (
      data: ZoneWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [mobData] = createResource(data.id, async (zoneId) => {
        const db = await getDB();
        return await db
          .selectFrom("mob")
          .innerJoin("_mobTozone", "mob.id", "_mobTozone.A")
          .where("_mobTozone.B", "=", zoneId)
          .selectAll("mob")
          .execute();
      });

      const [npcsData] = createResource(data.id, async (zoneId) => {
        const db = await getDB();
        return await db.selectFrom("npc").where("npc.zoneId", "=", zoneId).selectAll("npc").execute();
      });

      const [linkZonesData] = createResource(data.id, async (zoneId) => {
        const db = await getDB();
        const res = await db
          .selectFrom("zone")
          .innerJoin("_linkZones", "zone.id", "_linkZones.B")
          .where("_linkZones.A", "=", zoneId)
          .selectAll("zone")
          .union(
            db
              .selectFrom("zone")
              .innerJoin("_linkZones", "zone.id", "_linkZones.A")
              .where("_linkZones.B", "=", zoneId)
              .selectAll("zone"),
          )
          .execute();
        return res;
      });

      const [activityData] = createResource(data.activityId, async (activityId) => {
        const db = await getDB();
        return await db.selectFrom("activity").where("id", "=", activityId).selectAll("activity").execute();
      });

      const [addressData] = createResource(data.addressId, async (addressId) => {
        const db = await getDB();
        return await db.selectFrom("address").where("id", "=", addressId).selectAll("address").execute();
      });

      return (
        <>
          <div class="ZoneImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<ZoneWithRelated>({
            data,
            dictionary: {
              ...dic.db.zone,
              fields: {
                ...dic.db.zone.fields,
                linkZones: {
                  key: "linkZones",
                  ...dic.db.zone.fields,
                  tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
                  formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
                },
                mobs: {
                  key: "mobs",
                  ...dic.db.mob.fields,
                  tableFieldDescription: dic.db.mob.fields.name.tableFieldDescription,
                  formFieldDescription: dic.db.mob.fields.name.formFieldDescription,
                },
                npcs: {
                  key: "npcs",
                  ...dic.db.npc.fields,
                  tableFieldDescription: dic.db.npc.fields.name.tableFieldDescription,
                  formFieldDescription: dic.db.npc.fields.name.formFieldDescription,
                },
              },
            },
            dataSchema: ZoneWithRelatedSchema,
            hiddenFields: ["id", "activityId", "addressId"],
            fieldGroupMap: {
              基本信息: ["name", "rewardNodes"],
            },
          })}

          <CardSection
            title={"包含的" + dic.db.mob.selfName}
            data={mobData.latest}
            renderItem={(mob) => {
              return {
                label: mob.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: mob.id }]),
              };
            }}
          />

          <CardSection
            title={"包含的" + dic.db.npc.selfName}
            data={npcsData.latest}
            renderItem={(npc) => {
              return {
                label: npc.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "npc", id: npc.id }]),
              };
            }}
          />

          <CardSection
            title={"连接的" + dic.db.zone.selfName}
            data={linkZonesData.latest}
            renderItem={(zone) => {
              return {
                label: zone.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }]),
              };
            }}
          />

          <CardSection
            title={"所属的" + dic.db.address.selfName}
            data={addressData.latest}
            renderItem={(address) => {
              return {
                label: address.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "address", id: address.id }]),
              };
            }}
          />

          <Show when={activityData.latest?.length}>
            <CardSection
              title={"所属的" + dic.db.activity.selfName}
              data={activityData.latest}
              renderItem={(activity) => {
                return {
                  label: activity.name,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "activity", id: activity.id }]),
                };
              }}
            />
          </Show>
        </>
      );
    },
  },
});
