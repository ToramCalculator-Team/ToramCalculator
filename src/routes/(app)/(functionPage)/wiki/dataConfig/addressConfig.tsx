import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createAddress, findAddressById, findAddresses, Address } from "~/repositories/address";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { addressSchema, zoneSchema } from "~/../db/zod";
import { address, DB, zone } from "~/../db/kysely/kyesely";
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
import { Select } from "~/components/controls/select";
import { createForm } from "@tanstack/solid-form";

type AddressWithRelated = address & {
  zones: zone[];
};

const AddressWithRelatedSchema = z.object({
  ...addressSchema.shape,
  zones: z.array(zoneSchema),
});

const defaultAddressWithRelated: AddressWithRelated = {
  ...defaultData.address,
  zones: [],
};

const AddressWithRelatedDic = (dic: dictionary) => ({
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
});

const AddressWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultAddressWithRelated,
    onSubmit: async ({ value }) => {
      console.log("Submit value：", value);
      const db = await getDB();
      const address = await db.transaction().execute(async (trx) => {
        const { zones, ...rest } = value;
        console.log("zones", zones);
        console.log("rest", rest);
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
      handleSubmit("address", address.id);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.address.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultAddressWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof AddressWithRelated;
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
                      onChangeAsync: AddressWithRelatedSchema.shape[fieldKey],
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
              case "worldId":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: AddressWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={"所属" + dic.db.world.selfName}
                        description={dic.db.world.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Select
                          value={field().state.value}
                          setValue={(value) => field().setValue(value)}
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
                    )}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof address;
                const simpleFieldValue = _field[1];
                return renderField<AddressWithRelated, keyof AddressWithRelated>(form, simpleFieldKey, simpleFieldValue, AddressWithRelatedDic(dic), AddressWithRelatedSchema);
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

export const createAddressDataConfig = (dic: dictionary): dataDisplayConfig<AddressWithRelated, address> => ({
  defaultData: defaultAddressWithRelated,
  table: {
    columnDef: [
      {
        id: "id",
        accessorFn: (row) => row.id,
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        cell: (info) => info.getValue(),
        size: 160,
      },
      {
        id: "posX",
        accessorFn: (row) => row.posX,
        cell: (info) => info.getValue(),
        size: 160,
      },
      {
        id: "posY",
        accessorFn: (row) => row.posY,
        cell: (info) => info.getValue(),
        size: 160,
      },
    ],
    dic: AddressWithRelatedDic(dic),
    hiddenColumns: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
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
  form: (handleSubmit) => AddressWithRelatedForm(dic, handleSubmit),
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
            dictionary: AddressWithRelatedDic(dic),
            dataSchema: AddressWithRelatedSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "type", "posX", "posY"],
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
