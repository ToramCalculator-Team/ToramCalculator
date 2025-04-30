import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createZone, defaultZone, findZoneById, findZones, Zone } from "~/repositories/zone";
import { DBdataDisplayConfig, fieldInfo } from "../utils";
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

export const zoneDataConfig: DBdataDisplayConfig<zone, Zone["MainTable"]> = {
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
    data: defaultZone,
    hiddenFields: ["id"],
    dataSchema: zoneSchema,
    fieldGenerator: (key, field, dictionary) => {
      const defaultInputClass = "mt-0.5 rounded px-4 py-2";
      const defaultLabelSizeClass = "";
      let icon: JSX.Element = null;
      let inputClass = defaultInputClass;
      let labelSizeClass = defaultLabelSizeClass;
      switch (key) {
        case "addressId":
          const [addresses] = createResource(async () => {
            const addresses = await findAddresses();
            return addresses.map(addr => ({
              label: addr.name,
              value: addr.id
            }));
          });

          return (
            <Autocomplete
              title={dictionary.fields[key].key}
              description={dictionary.fields[key].formFieldDescription}
              state={{
                value: field().state.value as string,
                setValue: (value: string) => field().setValue(value),
                error: fieldInfo(field())
              }}
              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
              optionsFetcher={async (search) => {
                const cachedAddresses = addresses();
                if (!cachedAddresses) return [];
                return cachedAddresses.filter(addr => 
                  addr.label.toLowerCase().includes(search.toLowerCase())
                );
              }}
            />
          )
      }
      return false;
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
        return await db
          .selectFrom("npc")
          .where("npc.zoneId", "=", zoneId)
          .selectAll("npc")
          .execute();
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
              基本信息: ["name", "linkZone", "rewardNodes"]
            },
          })}

          <section class="FieldGroup gap-2 w-full">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.mobs ?? "出现的怪物"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={mobData.latest}>
                <For each={mobData.latest}>
                  {(mob) => {
                    return <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: mob.id }])}>{mob.name}</Button>;
                  }}
                </For>
              </Show>
            </div>
          </section>

          <section class="FieldGroup gap-2 w-full">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.npcs ?? "出现的NPC"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={npcData.latest}>
                <For each={npcData.latest}>
                  {(npc) => {
                    return <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "npc", id: npc.id }])}>{npc.name}</Button>;
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
