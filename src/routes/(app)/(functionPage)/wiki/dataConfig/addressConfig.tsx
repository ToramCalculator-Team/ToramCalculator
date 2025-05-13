import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createAddress, findAddressById, findAddresses, Address } from "~/repositories/address";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { addressSchema, zoneSchema } from "~/../db/zod";
import { address, DB, zone } from "~/../db/kysely/kyesely";
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
import { EnumSelect } from "~/components/controls/enumSelect";
import { Select } from "~/components/controls/select";
import { DeepKeys, DeepValue } from "@tanstack/solid-form";

type AddressWithRelated = address & {
  zones: zone[];
};

const AddressWithRelatedSchema = z.object({
  ...addressSchema.shape,
  zones: z.array(zoneSchema),
});

export const createAddressDataConfig = (dic: dictionary): dataDisplayConfig<AddressWithRelated> => ({
  defaultData: {
    ...defaultData.address,
    zones: [],
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("address")
      .where("id", "=", id)
      .selectAll("address")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("zone")
            .where("zone.addressId", "=", id)
            .selectAll("zone"),
        ).as("zones"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("address")
      .selectAll("address")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("zone")
            .whereRef("zone.addressId", "=", "address.id")
            .selectAll("zone"),
        ).as("zones"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: AddressWithRelatedSchema,
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
    tdGenerator: (props: { cell: Cell<AddressWithRelated, keyof AddressWithRelated> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof AddressWithRelated;
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
      worldId: (key, field) => {
        return (
          <Input
            title={"所属" + dic.db.world.selfName}
            description={dic.db.world.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Select
              value={field().state.value}
              setValue={(value) => field().setValue(value as DeepValue<AddressWithRelated, DeepKeys<AddressWithRelated>>)}
              optionsFetcher={async () => {
                const db = await getDB();
                const worlds = await db.selectFrom("world").selectAll("world").execute();
                return worlds.map((world) => ({
                  label: world.name,
                  value: world.id,
                }));
              }}
            />
          </Input>
        );
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
          for (const zone of zones) {
            await trx.updateTable("zone").set({ addressId: address.id }).where("id", "=", zone.id).execute();
          }
        }
        return address;
      });
    },
  },
  card: {
    cardRender: (
      data: AddressWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [zonesData] = createResource(data.id, async (addressId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .where("zone.addressId", "=", addressId)
          .selectAll("zone")
          .execute();
      });

      return (
        <>
          {DBDataRender<AddressWithRelated>({
            data,
            dictionary: {
              ...dic.db.address,
              fields: {
                ...dic.db.address.fields,
                zones: {
                  key: "zones",
                  ...dic.db.zone.fields,
                  tableFieldDescription: dic.db.zone.fields.name.tableFieldDescription,
                  formFieldDescription: dic.db.zone.fields.name.formFieldDescription,
                },
              },
            },
            dataSchema: AddressWithRelatedSchema,
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
