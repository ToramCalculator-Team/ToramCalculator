import { Accessor, createMemo, createResource, createSignal, For, JSX, Setter, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { addressSchema, zoneSchema } from "~/../db/zod";
import { address, DB, zone } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { ObjRender } from "~/components/module/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "~/repositories/statistic";
import { store } from "~/store";
import * as Icon from "~/components/icon";
import { VirtualTable } from "~/components/module/virtualTable";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { LoadingBar } from "~/components/loadingBar";
import { Transaction } from "kysely";
import { setWikiStore } from "../store";

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

const AddressWithRelatedFetcher = async (id: string) => {
  const db = await getDB();
  const res = await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll("address")
    .select((eb) => [
      jsonArrayFrom(eb.selectFrom("zone").where("zone.addressId", "=", id).selectAll("zone")).as("zones"),
    ])
    .executeTakeFirstOrThrow();
  return res;
};

const createAddress = async (trx: Transaction<DB>, address: address) => {
  const statistic = await createStatistic(trx);
  return trx
    .insertInto("address")
    .values({
      ...address,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

const updateAddress = async (trx: Transaction<DB>, address: address) => {
  return trx.updateTable("address").set(address).where("id", "=", address.id).returningAll().executeTakeFirstOrThrow();
};

const deleteAddress = async (trx: Transaction<DB>, address: address) => {
  await trx.deleteFrom("address").where("id", "=", address.id).executeTakeFirstOrThrow();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", address.statisticId).executeTakeFirstOrThrow();
  // 将相关zones归属调整至defaultAddress
  await trx.updateTable("zone").set({ addressId: "defaultAddressId" }).where("addressId", "=", address.id).execute();
};

const AddressesFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("address").selectAll("address").execute();
  return res;
};

const AddressWithRelatedForm = (
  dic: dictionary,
  data?: AddressWithRelated,
) => {
  const form = createForm(() => ({
    defaultValues: data ?? defaultAddressWithRelated,
    onSubmit: async ({ value }) => {
      console.log(value);
      const db = await getDB();
      const oldZones = data?.zones ?? [];

      await db.transaction().execute(async (trx) => {
        let address: address;
        if (data) {
          // 更新
          address = await updateAddress(trx, { ...value, id: data.id });
        } else {
          // 新增
          const { zones, ...rest } = value;
          const statistic = await createStatistic(trx);
          const address = await createAddress(trx, { ...rest, id: createId(), statisticId: statistic.id });
          return address;
        }

        // 统一处理zones
        const zonesToRemove = oldZones.filter((zone) => !value.zones.some((z) => z.id === zone.id));
        const zonesToAdd = value.zones.filter((zone) => !oldZones.some((z) => z.id === zone.id));

        // 处理需要移除的区域（删除区域）
        for (const zone of zonesToRemove) {
          const res = await db.deleteFrom("zone").where("id", "=", zone.id).returningAll().execute();
          console.log("移除zone", res);
        }

        // 处理需要变更地址的区域（将addressId设为当前address的id）
        for (const zone of zonesToAdd) {
          const res = await db
            .updateTable("zone")
            .set({
              addressId: address.id,
            })
            .where("id", "=", zone.id)
            .returningAll()
            .execute();
          console.log("变更zone", res);
        }
        setWikiStore("cardGroup", (pre) => [...pre, { type: "address", id: address.id }]);
        setWikiStore("form", {
          isOpen: false,
        });
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
        <For each={Object.entries(defaultAddressWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof AddressWithRelated;
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
                      onChangeAsync: AddressWithRelatedSchema.shape[fieldKey],
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
                                        initialValue={initialValue}
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
                return renderField<AddressWithRelated, keyof AddressWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  AddressWithRelatedDic(dic),
                  AddressWithRelatedSchema,
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

const AddressTable = (
  dic: dictionary,
  tableGlobalFilterStr: Accessor<string>,
  columnHandleClick: (id: string) => void,
) => {
  return VirtualTable<address>({
    dataFetcher: AddressesFetcher,
    columnsDef: [
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
    dictionary: AddressWithRelatedDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
    globalFilterStr: tableGlobalFilterStr,
    columnHandleClick: columnHandleClick,
  });
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
                                <Icon.Line.Left class="rotate-90" />
                              ) : (
                                <Icon.Line.Left class="rotate-270" />
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

export const AddressDataConfig: dataDisplayConfig<AddressWithRelated, address> = {
  defaultData: defaultAddressWithRelated,
  dataFetcher: AddressWithRelatedFetcher,
  datasFetcher: AddressesFetcher,
  dataSchema: AddressWithRelatedSchema,
  main: AddressPage,
  table: {
    dataFetcher: AddressesFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "type", cell: (info: any) => info.getValue(), size: 160 },
      { accessorKey: "posX", cell: (info: any) => info.getValue(), size: 160 },
      { accessorKey: "posY", cell: (info: any) => info.getValue(), size: 160 },
    ],
    dictionary: (dic) => AddressWithRelatedDic(dic),
    hiddenColumnDef: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ data, dic }) => AddressWithRelatedForm(dic, data),
  card: ({ data, dic }) => {
    const [zonesData] = createResource(data.id, async (addressId) => {
      const db = await getDB();
      return await db.selectFrom("zone").where("zone.addressId", "=", addressId).selectAll("zone").execute();
    });

    return (
      <>
        <div class="AddressImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<AddressWithRelated>({
          data,
          dictionary: AddressWithRelatedDic(dic),
          dataSchema: AddressWithRelatedSchema,
          hiddenFields: ["id"],
          fieldGroupMap: {
            基本信息: ["name", "type"],
            坐标信息: ["posX", "posY"],
          },
        })}

        <CardSection
          title={"包含的" + dic.db.zone.selfName}
          data={zonesData.latest}
          renderItem={(zone) => {
            return {
              label: zone.name,
              onClick: () => setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }]),
            };
          }}
        />

        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex gap-1">
              <Button
                class="w-fit"
                icon={<Icon.Line.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.transaction().execute(async (trx) => {
                    await deleteAddress(trx, data);
                  });
                }}
              />
              <Button
                class="w-fit"
                icon={<Icon.Line.Edit />}
                onclick={() => {
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
                  // 打开表单
                  setWikiStore("form", { isOpen: true, data: data });
                }}
              />
            </div>
          </section>
        </Show>
      </>
    );
  },
};
