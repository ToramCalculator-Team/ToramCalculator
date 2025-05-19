import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show, Index } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createZone, deleteZone, findZoneById, findZones, Zone } from "~/repositories/zone";
import { fieldInfo, renderField } from "../utils";
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
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { Toggle } from "~/components/controls/toggle";
import * as Icon from "~/components/icon";
import { store } from "~/store";
import { createStatistic } from "~/repositories/statistic";

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

const defaultZoneWithRelated: ZoneWithRelated = {
  ...defaultData.zone,
  mobs: [],
  npcs: [],
  linkZones: [],
};

const ZoneWithRelatedDic = (dic: dictionary) => ({
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
});

const ZoneWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const [isLimit, setIsLimit] = createSignal(false);
  const form = createForm(() => ({
    defaultValues: defaultZoneWithRelated,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const zone = await db.transaction().execute(async (trx) => {
        const { linkZones, mobs, npcs, ...rest } = value;
        console.log("linkZones", linkZones, "mobs", mobs, "npcs", npcs, "zone", rest);
        const statistic = await createStatistic(trx);
        const zone = await trx
          .insertInto("zone")
          .values({
            ...rest,
            activityId: rest.activityId !== "" ? rest.activityId : null,
            id: createId(),
            statisticId: statistic.id,
            createdByAccountId: store.session.user.account?.id,
            updatedByAccountId: store.session.user.account?.id,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
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
      handleSubmit("zone", zone.id);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.zone.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultZoneWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof ZoneWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "mobs":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.mob.selfName}
                        description={dic.db.mob.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={field().state.value}>
                            {(item, index) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + index} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + index}
                                      initialValue={item()}
                                      setValue={(value) => {
                                        const newArray = [...field().state.value];
                                        newArray[index] = value;
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
                                      field().setValue((prev: mob[]) => prev.filter((_, i) => i !== index));
                                      e.stopPropagation();
                                    }}
                                  >
                                    -
                                  </Button>
                                </div>
                              );
                            }}
                          </Index>
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
                    )}
                  </form.Field>
                );
              case "npcs":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.npc.selfName}
                        description={dic.db.npc.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={field().state.value}>
                            {(item, index) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + index} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + index}
                                      initialValue={item()}
                                      setValue={(value) => {
                                        const newArray = [...field().state.value];
                                        newArray[index] = value;
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
                                      field().setValue((prev: npc[]) => prev.filter((_, i) => i !== index));
                                      e.stopPropagation();
                                    }}
                                  >
                                    -
                                  </Button>
                                </div>
                              );
                            }}
                          </Index>
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
                    )}
                  </form.Field>
                );
              case "linkZones":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={"链接的" + dic.db.zone.selfName}
                        description={dic.db.zone.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={field().state.value}>
                            {(item, index) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + index} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + index}
                                      initialValue={item()}
                                      setValue={(value) => {
                                        const newArray = [...field().state.value];
                                        newArray[index] = value;
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
                                      field().setValue((prev: zone[]) => prev.filter((_, i) => i !== index));
                                      e.stopPropagation();
                                    }}
                                  >
                                    -
                                  </Button>
                                </div>
                              );
                            }}
                          </Index>
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
                    )}
                  </form.Field>
                );
              case "activityId":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <>
                        <Input
                          title={"活动限时标记"}
                          description={"仅在某个活动开启时可进入的区域"}
                          state={undefined}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <Toggle
                            id={"isLimit"}
                            onClick={() => setIsLimit(!isLimit())}
                            onBlur={undefined}
                            name={"isLimit"}
                            checked={isLimit()}
                          />
                        </Input>
                        <Show when={isLimit()}>
                          <Input
                            title={dic.db.zone.fields[fieldKey].key}
                            description={dic.db.zone.fields[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            <Autocomplete
                              id={field().name}
                              initialValue={defaultData.activity}
                              setValue={(value) => {
                                field().setValue(value.id);
                                console.log("field().state.value", field().state.value);
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
                        </Show>
                      </>
                    )}
                  </form.Field>
                );
              case "addressId":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.zone.fields[fieldKey].key}
                        description={dic.db.zone.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Autocomplete
                          id={field().name}
                          initialValue={defaultData.address}
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
                    )}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof zone;
                const simpleFieldValue = _field[1];
                return renderField<ZoneWithRelated, keyof ZoneWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  ZoneWithRelatedDic(dic),
                  ZoneWithRelatedSchema,
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

export const createZoneDataConfig = (dic: dictionary): dataDisplayConfig<ZoneWithRelated, zone> => ({
  defaultData: defaultZoneWithRelated,
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
        id: "rewardNodes",
        accessorFn: (row) => row.rewardNodes,
        cell: (info) => info.getValue<number | null>(),
        size: 120,
      },
      {
        id: "activityId",
        accessorFn: (row) => row.activityId,
        cell: (info) => info.getValue<string | null>(),
        size: 160,
      },
      {
        id: "addressId",
        accessorFn: (row) => row.addressId,
        cell: (info) => info.getValue<string>(),
        size: 160,
      },
    ],
    dic: ZoneWithRelatedDic(dic),
    hiddenColumns: ["id", "activityId", "addressId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
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
  form: (handleSubmit) => ZoneWithRelatedForm(dic, handleSubmit),
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
        const resL = await db
          .selectFrom("zone")
          .innerJoin("_linkZones", "zone.id", "_linkZones.B")
          .where("_linkZones.A", "=", zoneId)
          .selectAll("zone")
          .execute();
        const resR = await db
          .selectFrom("zone")
          .innerJoin("_linkZones", "zone.id", "_linkZones.A")
          .where("_linkZones.B", "=", zoneId)
          .selectAll("zone")
          .execute();
        const res = [...resL, ...resR];
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
            dictionary: ZoneWithRelatedDic(dic),
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

          <Show when={data.createdByAccountId === store.session.user.account?.id}>
            <section class="FunFieldGroup flex w-full flex-col gap-2">
              <h3 class="text-accent-color flex items-center gap-2 font-bold">
                {dic.ui.actions.operation}
                <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
              </h3>
              <div class="FunGroup flex flex-col gap-3">
                <Button
                  class="w-fit"
                  icon={<Icon.Line.Trash />}
                  onclick={async () => {
                    const db = await getDB();
                    await db.deleteFrom("zone").where("id", "=", data.id).executeTakeFirstOrThrow();
                  }}
                />
              </div>
            </section>
          </Show>
        </>
      );
    },
  },
});
