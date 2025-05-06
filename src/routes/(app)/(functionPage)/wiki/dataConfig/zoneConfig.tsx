import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createZone, defaultZone, findZoneById, findZones, Zone } from "~/repositories/zone";
import { fieldInfo } from "../utils";
import { DBdataDisplayConfig } from "./dataConfig";
import { zoneSchema } from "~/../db/zod";
import { DB, zone } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { findAddresses } from "~/repositories/address";
import { defaultData } from "../../../../../../db/defaultData";

export const zoneDataConfig: DBdataDisplayConfig<"zone", Zone["Card"]> = {
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
        accessorKey: "linkZone",
        cell: (info) => info.getValue<string[]>().join(", "),
        size: 200,
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
    dataFetcher: findZones,
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    tdGenerator: (props: { cell: Cell<zone, keyof zone>; dictionary: Dic<zone> }) => {
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
            {"enumMap" in props.dictionary.fields[columnId]
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof zone>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.zone,
    hiddenFields: ["id"],
    dataSchema: zoneSchema,
    fieldGenerators: {
      linkZone: (key, field, dictionary) => {
        const arrayValue = () => field().state.value as string[];
        return (
          <Input
            title={dictionary.fields[key].key}
            description={dictionary.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2">
              <For each={arrayValue()}>
                {(item, index) => {
                  return (
                    <div class="flex items-center gap-2">
                      <div class="flex-1">
                        <Autocomplete
                          value={item}
                          setValue={(id) => {
                            const newArray = [...arrayValue()];
                            newArray[index()] = id;
                            field().setValue(newArray);
                          }}
                          optionsFetcher={async (name) => {
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
                          }}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          const newArray = arrayValue().filter((_, i) => i !== index());
                          field().setValue(newArray as any);
                        }}
                      >
                        -
                      </Button>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={() => {
                  const newArray = [...arrayValue(), ""];
                  field().setValue(newArray as any);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      addressId: (key, field, dictionary) => {
        return (
          <Input
            title={dictionary.fields[key].key}
            description={dictionary.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              value={field().state.value}
              setValue={(id) => {
                field().setValue(id);
              }}
              optionsFetcher={async (search) => {
                const db = await getDB();
                const result = await db
                  .selectFrom("address")
                  .select(["id", "name"])
                  .where("name", "ilike", `%${search}%`)
                  .limit(50)
                  .execute();
                return result.map((item) => ({
                  label: item.name,
                  value: item.id,
                }));
              }}
            />
          </Input>
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const zone = await db.transaction().execute(async (trx) => {
        return await createZone(trx, data);
      });
    },
  },
  card: {
    dataFetcher: findZoneById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [mobData] = createResource(data.id, async (zoneId) => {
        const db = await getDB();
        return await db
          .selectFrom("mob")
          .innerJoin("_mobTozone", "mob.id", "_mobTozone.A")
          .where("_mobTozone.B", "=", zoneId)
          .selectAll("mob")
          .execute();
      });

      const [npcData] = createResource(data.id, async (zoneId) => {
        const db = await getDB();
        return await db.selectFrom("npc").where("npc.zoneId", "=", zoneId).selectAll("npc").execute();
      });

      const [linkZoneData] = createResource(data.linkZone, async (linkZone) => {
        const db = await getDB();
        if (!linkZone || linkZone.length === 0) return [];
        const res = await db.selectFrom("zone").where("zone.id", "in", linkZone).selectAll("zone").execute();
        console.log("linkZoneData", res);
        return res;
      });

      return (
        <>
          <div class="ZoneImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"zone">({
            data,
            dictionary: dictionary,
            dataSchema: zoneSchema,
            hiddenFields: ["id", "activityId", "addressId"],
            fieldGroupMap: {
              基本信息: ["name", "rewardNodes"],
            },
          })}

          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.mobs ?? "出现的怪物"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={mobData.latest}>
                <For each={mobData.latest}>
                  {(mob) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: mob.id }])}>
                        {mob.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>

          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.npcs ?? "出现的NPC"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={npcData.latest}>
                <For each={npcData.latest}>
                  {(npc) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "npc", id: npc.id }])}>
                        {npc.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>

          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.linkZone ?? "连接的区域"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={linkZoneData.latest}>
                <For each={linkZoneData.latest}>
                  {(zone) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }])}>
                        {zone.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>
        </>
      );
    },
  },
};
