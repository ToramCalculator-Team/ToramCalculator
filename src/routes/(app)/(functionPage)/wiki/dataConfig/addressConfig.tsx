import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { findAddressById, findAddresses, Address, createAddress } from "~/repositories/address";
import { DBdataDisplayConfig } from "./dataConfig";
import { addressSchema } from "~/../db/zod";
import { address } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { fieldInfo } from "../utils";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";

export const addressDataConfig: DBdataDisplayConfig<
  address,
  Address["Card"],
  {
    zones: string[];
  }
> = {
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
    data: defaultData.address,
    hiddenFields: ["id"],
    dataSchema: addressSchema,
    fieldGenerators: {
      worldId: (key, field, dictionary) => {
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
                  .selectFrom("world")
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
    extraData: {
      zones: {
        defaultValue: [],
        optionsFetcher: async (name) => {
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
        },
        dictionary: {
          key: "zones",
          tableFieldDescription: "包含的区域",
          formFieldDescription: "包含的区域",
        },
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const address = await db.transaction().execute(async (trx) => {
        const { zones, ...rest } = data;
        const address = await createAddress(trx, {
          ...rest,
        });
        if (zones.length > 0) {
          for (const zoneId of zones) {
            await trx.updateTable("zone").set({ addressId: address.id }).where("id", "=", zoneId).execute();
          }
        }
        return address;
      });
    },
  },
  card: {
    dataFetcher: findAddressById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [zoneData] = createResource(data.id, async (addressId) => {
        const db = await getDB();
        return await db.selectFrom("zone").where("zone.addressId", "=", addressId).selectAll("zone").execute();
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

          <CardSection
            title={dictionary.cardFields?.zone ?? "包含的区域"}
            data={zoneData.latest}
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
};
