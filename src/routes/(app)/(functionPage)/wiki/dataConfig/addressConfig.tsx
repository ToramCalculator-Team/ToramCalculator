import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { defaultAddress, findAddressById, findAddresses, Address } from "~/repositories/address";
import { DBdataDisplayConfig } from "./dataConfig";
import { addressSchema } from "~/../db/zod";
import { DB, address } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";

export const addressDataConfig: DBdataDisplayConfig<"address", Address["Card"]> = {
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
        accessorKey: "type",
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "posX",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "posY",
        cell: (info) => info.getValue(),
        size: 100,
      },
    ],
    dataFetcher: findAddresses,
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    tdGenerator: (props: { cell: Cell<address, keyof address>; dictionary: Dic<address> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof address;
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
          {"enumMap" in props.dictionary.fields[columnId]
            ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof address>).enumMap[props.cell.getValue()]
            : props.cell.getValue()}
        </td>
      );
    },
  },
  form: {
    data: defaultAddress,
    hiddenFields: ["id"],
    dataSchema: addressSchema,
    fieldGenerators: {},
  },
  card: {
    dataFetcher: findAddressById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [zoneData] = createResource(data.id, async (addressId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .where("zone.addressId", "=", addressId)
          .selectAll("zone")
          .execute();
      });

      return (
        <>
          <div class="AddressImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"address">({
            data,
            dictionary: dictionary,
            dataSchema: addressSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "type"],
              位置信息: ["posX", "posY"],
            },
          })}

          <section class="FieldGroup gap-2 w-full">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.zones ?? "包含的区域"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={zoneData.latest}>
                <For each={zoneData.latest}>
                  {(zone) => {
                    return <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }])}>{zone.name}</Button>;
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
