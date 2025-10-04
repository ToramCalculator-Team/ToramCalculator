import { Accessor, createMemo, createResource, createSignal, For, JSX, Setter, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { addressSchema } from "@db/generated/zod/index";
import { address, DB, zone } from "@db/generated/kysely/kysely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "@db/repositories/database";
import {
  AddressWithRelationsSchema,
  AddressWithRelations,
  findAddressWithRelations,
  findAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@db/repositories/address";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "@db/defaultData";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { createForm } from "@tanstack/solid-form";
import Icons from "~/components/icons/index";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { LoadingBar } from "~/components/controls/loadingBar";
import { setWikiStore } from "../store";
import { pick } from "lodash-es";
import { arrayDiff, CardSharedSection } from "./utils";


const defaultAddressWithRelations: AddressWithRelations = {
  ...defaultData.address,
  statistic: defaultData.statistic,
  zones: [],
};

const AddressWithRelationsDic = (dic: dictionary) => ({
  ...dic.db.address,
  fields: {
    ...dic.db.address.fields,
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


const AddressWithRelationsForm = (dic: dictionary, oldAddress?: AddressWithRelations) => {
  const formInitialValues = oldAddress ?? defaultAddressWithRelations;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newAddress }) => {
      console.log("oldAddress", oldAddress, "newAddress", newAddress);
      const addressData = pick(newAddress, Object.keys(defaultData.address) as (keyof address)[]);
      const db = await getDB();
      const address = await db.transaction().execute(async (trx) => {
        let address: address;
        if (oldAddress) {
          // 更新
          address = await updateAddress(trx, addressData);
        } else {
          // 新增
          address = await createAddress(trx, addressData);
        }

        const {
          dataToAdd: subZonesToAdd,
          dataToRemove: subZonesToRemove,
          dataToUpdate: subZonesToUpdate,
        } = await arrayDiff({
          trx,
          table: "zone",
          oldArray: oldAddress?.zones ?? [],
          newArray: newAddress.zones,
        });

        for (const zone of subZonesToAdd) {
          await trx.updateTable("zone").set({ addressId: address.id }).where("id", "=", zone.id).execute();
        }
        for (const zone of subZonesToRemove) {
          await trx.updateTable("zone").set({ addressId: "defaultAddressId" }).where("id", "=", zone.id).execute();
        }
        return address;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "address", id: address.id }]);
      setWikiStore("form", {
        isOpen: false,
      });
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
        <For each={Object.entries(defaultAddressWithRelations)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof AddressWithRelations;
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
                      onChangeAsync: AddressWithRelationsSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return (
                        <Input
                          title={"包含的" + dic.db.zone.selfName}
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
                                        initialValue={initialValue.id}
                                        setValue={(value) => {
                                          const newArray = [...field().state.value];
                                          newArray[index()] = value;
                                          field().setValue(newArray);
                                        }}
                                        datasFetcher={async () => {
                                          const db = await getDB();
                                          const zones = await db
                                            .selectFrom("zone")
                                            .selectAll("zone")

                                            .execute();
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
                      onChangeAsync: AddressWithRelationsSchema.shape[fieldKey],
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
                return renderField<AddressWithRelations, keyof AddressWithRelations>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  AddressWithRelationsDic(dic),
                  AddressWithRelationsSchema,
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

const AddressPage = (dic: dictionary, itemHandleClick: (id: string) => void) => {
  const [expandedAddresses, setExpandedAddresses] = createSignal<Set<string>>(new Set());
  const [selectedWorldId, setSelectedWorldId] = createSignal<string>("");

  const [worlds] = createResource(async () => {
    const db = await getDB();
    return await db.selectFrom("world").selectAll("world").execute();
  });

  const [addresses] = createResource(async () => {
    const db = await getDB();
    return await db
      .selectFrom("address")
      .select((eb) => [
        jsonArrayFrom(eb.selectFrom("zone").whereRef("zone.addressId", "=", "address.id").selectAll("zone")).as(
          "zones",
        ),
      ])
      .selectAll("address")
      .execute();
  });

  const filteredAddresses = createMemo(() => {
    const worldId = selectedWorldId();
    if (!worldId) return addresses() || [];
    return (addresses() || []).filter((addr) => addr.worldId === worldId);
  });

  const gridInfo = createMemo(() => {
    const addressesData = filteredAddresses();
    if (!addressesData || addressesData.length === 0) return null;
    const posX = addressesData.map((a) => a.posX);
    const posY = addressesData.map((a) => a.posY);
    const minX = Math.min(...posX) - 1;
    const maxX = Math.max(...posX) + 1;
    const minY = Math.min(...posY) - 1;
    const maxY = Math.max(...posY) + 1;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const addressMap = new Map(addressesData.map((a) => [a.posX + "," + a.posY, a]));
    const gridItems = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = x + "," + y;
        const address = addressMap.get(key);
        gridItems.push({ x, y, address });
      }
    }
    return { minX, minY, maxX, maxY, width, height, gridItems };
  });

  const toggleExpand = (addressId: string) => {
    setExpandedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(addressId)) {
        next.delete(addressId);
      } else {
        next.add(addressId);
      }
      return next;
    });
  };

  return (
    <div class="AddressPage flex h-full w-full flex-col">
      {/* <div class=" px-6">
        <Select
          class="w-full"
          value={selectedWorldId()}
          setValue={setSelectedWorldId}
          optionsFetcher={async () => {
            const db = await getDB();
            const worlds = await db.selectFrom("world").selectAll("world").execute();
            return worlds.map((world) => ({
              label: world.name,
              value: world.id,
            }));
          }}
        />
      </div> */}
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        style={{ height: "100%", width: "100%" }}
      >
        <div class="Content relative h-full w-full">
          <Show
            when={gridInfo()}
            fallback={
              <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
                <LoadingBar class="w-1/2 min-w-[320px]" />
                <h1 class="animate-pulse">awaiting DB-address sync...</h1>
              </div>
            }
          >
            {(gridInfo) => (
              <div
                class="grid gap-3 rounded-lg p-4"
                style={{
                  "grid-template-columns": `repeat(${gridInfo().width}, minmax(128px, 1fr))`,
                  "grid-template-rows": `repeat(${gridInfo().height}, minmax(128px, 1fr))`,
                  "min-width": `${gridInfo().width * 140}px`,
                  "min-height": `${gridInfo().height * 140}px`,
                  position: "relative",
                  "z-index": 2,
                }}
              >
                {gridInfo().gridItems.map(({ x, y, address }) =>
                  address ? (
                    <button
                      class="bg-primary-color shadow-dividing-color relative flex cursor-pointer flex-col items-start justify-start gap-1 rounded p-2 shadow-md hover:shadow-xl"
                      style={{
                        "grid-column": x - gridInfo().minX + 1,
                        "grid-row": y - gridInfo().minY + 1,
                      }}
                      onClick={() => itemHandleClick(address.id)}
                    >
                      <div class="overflow-hidden font-bold text-nowrap text-ellipsis">{address.name}</div>
                      <div class="Divider bg-boundary-color h-[1px] w-full flex-none rounded-full"></div>
                      <Show when={address.zones && address.zones.length > 0}>
                        <div class="Zones flex w-full flex-col items-start justify-start gap-1">
                          {(expandedAddresses().has(address.id) ? address.zones : address.zones.slice(0, 4)).map(
                            (zone) => (
                              <div class="text-main-text-color w-full overflow-hidden text-start text-sm text-nowrap text-ellipsis">
                                {zone.name}
                              </div>
                            ),
                          )}
                          {address.zones.length > 4 && (
                            <Button
                              class="w-full rounded-md p-1!"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(address.id);
                              }}
                            >
                              {expandedAddresses().has(address.id) ? (
                                <Icons.Outline.Left class="rotate-90" />
                              ) : (
                                <Icons.Outline.Left class="rotate-270" />
                              )}
                            </Button>
                          )}
                        </div>
                      </Show>
                    </button>
                  ) : (
                    <Button
                      class="flex items-center justify-center border-2 border-dashed border-gray-300 bg-white text-xs text-gray-400"
                      style={{
                        "grid-column": x - gridInfo().minX + 1,
                        "grid-row": y - gridInfo().minY + 1,
                      }}
                    >
                      ({x}, {y})
                    </Button>
                  ),
                )}
              </div>
            )}
          </Show>
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
};

export const AddressDataConfig: dataDisplayConfig<address, AddressWithRelations, AddressWithRelations> = {
  defaultData: defaultAddressWithRelations,
  dataFetcher: findAddressWithRelations,
  datasFetcher: findAddresses,
  dataSchema: AddressWithRelationsSchema,
  main: AddressPage,
  table: {
    dataFetcher: findAddresses,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 160 },
      { accessorKey: "posX", cell: (info: any) => info.getValue(), size: 160 },
      { accessorKey: "posY", cell: (info: any) => info.getValue(), size: 160 },
    ],
    dictionary: (dic) => AddressWithRelationsDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ data, dic }) => AddressWithRelationsForm(dic, data),
  card: ({ data, dic }) => {
    const [zonesData] = createResource(data.id, async (addressId) => {
      const db = await getDB();
      return await db.selectFrom("zone").where("zone.addressId", "=", addressId).selectAll("zone").execute();
    });

    return (
      <>
        <div class="AddressImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<AddressWithRelations>({
          data,
          dictionary: AddressWithRelationsDic(dic),
          dataSchema: AddressWithRelationsSchema,
          hiddenFields: ["id"],
          fieldGroupMap: {
            基本信息: ["name", "type"],
            // 坐标信息: ["posX", "posY"],
          },
        })}

        <CardSection
          title={"包含的" + dic.db.zone.selfName}
          data={zonesData.latest}
          dataRender={(zone) => {
            return <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }])}>{zone.name}</Button>;
          }}
        />
        <CardSharedSection<AddressWithRelations> dic={dic} data={data} delete={deleteAddress} />
      </>
    );
  },
};
