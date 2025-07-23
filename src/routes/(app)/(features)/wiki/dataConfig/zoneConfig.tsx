import { createResource, createSignal, For, Show, Index } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { mobSchema, npcSchema, zoneSchema } from "../../../../../../db/generated/zod/index";
import { DB, mob, npc, zone } from "../../../../../../db/generated/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { getDB } from "../../../../../../db/repositories/database";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "../../../../../../db/defaultData";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { z } from "zod";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { Toggle } from "~/components/controls/toggle";
import Icons from "~/components/icons/index";
import { store } from "~/store";
import { createStatistic } from "../../../../../../db/repositories/statistic";
import { setWikiStore } from "../store";
import { pick } from "lodash-es";
import { Transaction } from "kysely";
import { arrayDiff, CardSharedSection } from "./utils";

type ZoneWithRelated = zone & {
  mobs: mob[];
  npcs: npc[];
  linkZones: zone[];
};

const ZoneWithRelatedSchema = zoneSchema.extend({
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

const ZoneWithRelatedFetcher = async (id: string): Promise<ZoneWithRelated> => {
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
    ])
    .executeTakeFirstOrThrow();
  return res;
};

const ZonesFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("zone").selectAll("zone").execute();
  return res;
};

const createZone = async (trx: Transaction<DB>, value: zone) => {
  const statistic = await createStatistic(trx);
  const zone = await trx
    .insertInto("zone")
    .values({
      ...value,
      activityId: value.activityId !== "" ? value.activityId : null,
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return zone;
};

const updateZone = async (trx: Transaction<DB>, value: zone) => {
  const zone = await trx
    .updateTable("zone")
    .set({
      ...value,
      activityId: value.activityId !== "" ? value.activityId : null,
    })
    .where("id", "=", value.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return zone;
};

const deleteZone = async (trx: Transaction<DB>, zone: zone) => {
  await trx.deleteFrom("_linkZones").where("A", "=", zone.id).execute();
  await trx.deleteFrom("_linkZones").where("B", "=", zone.id).execute();
  await trx.deleteFrom("_mobTozone").where("B", "=", zone.id).execute();
  await trx.updateTable("npc").set({ zoneId: "defaultZoneId" }).where("zoneId", "=", zone.id).execute();
  await trx.deleteFrom("zone").where("id", "=", zone.id).execute();
  await trx.deleteFrom("statistic").where("id", "=", zone.statisticId).execute();
};

const ZoneWithRelatedForm = (dic: dictionary, oldZone?: ZoneWithRelated) => {
  const formInitialValues = oldZone ?? defaultZoneWithRelated;
  const [isLimit, setIsLimit] = createSignal(false);
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newZone }) => {
      console.log("oldZone", oldZone, "newZone", newZone);
      const zoneData = pick(newZone, Object.keys(defaultData.zone) as (keyof zone)[]);
      const db = await getDB();
      const zone = await db.transaction().execute(async (trx) => {
        let zone: zone;
        if (oldZone) {
          zone = await updateZone(trx, zoneData);
        } else {
          zone = await createZone(trx, zoneData);
        }

        const {
          dataToAdd: linkZonesToAdd,
          dataToRemove: linkZonesToRemove,
          dataToUpdate: linkZonesToUpdate,
        } = await arrayDiff({
          trx,
          table: "zone",
          oldArray: oldZone?.linkZones ?? [],
          newArray: newZone.linkZones,
        });

        for (const linkZone of linkZonesToAdd) {
          await trx.insertInto("_linkZones").values({ A: zone.id, B: linkZone.id }).execute();
        }
        for (const linkZone of linkZonesToRemove) {
          await trx.deleteFrom("_linkZones").where("A", "=", zone.id).where("B", "=", linkZone.id).execute();
        }

        const {
          dataToAdd: mobsToAdd,
          dataToRemove: mobsToRemove,
          dataToUpdate: mobsToUpdate,
        } = await arrayDiff({
          trx,
          table: "mob",
          oldArray: oldZone?.mobs ?? [],
          newArray: newZone.mobs,
        });

        for (const mob of mobsToAdd) {
          await trx.insertInto("_mobTozone").values({ A: mob.id, B: zone.id }).execute();
        }
        for (const mob of mobsToRemove) {
          await trx.deleteFrom("_mobTozone").where("A", "=", mob.id).where("B", "=", zone.id).execute();
        }

        const {
          dataToAdd: npcsToAdd,
          dataToRemove: npcsToRemove,
          dataToUpdate: npcsToUpdate,
        } = await arrayDiff({
          trx,
          table: "npc",
          oldArray: oldZone?.npcs ?? [],
          newArray: newZone.npcs,
        });

        for (const npc of npcsToAdd) {
          await trx.updateTable("npc").set({ zoneId: zone.id }).where("id", "=", npc.id).execute();
        }
        for (const npc of npcsToRemove) {
          await trx.updateTable("npc").set({ zoneId: "defaultZoneId" }).where("id", "=", npc.id).execute();
        }

        return zone;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
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
        <For each={Object.entries(formInitialValues)}>
          {(zoneField, zoneFieldIndex) => {
            const fieldKey = zoneField[0] as keyof ZoneWithRelated;
            const fieldValue = zoneField[1];
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
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: ZoneWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(mobs) => (
                      <Input
                        title={dic.db.mob.selfName}
                        description={dic.db.mob.description}
                        state={fieldInfo(mobs())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={mobs().state.value}>
                            {(mob, mobIndex) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + mobIndex} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + mobIndex}
                                      initialValue={mob().id}
                                      setValue={(value) => {
                                        const newArray = [...mobs().state.value];
                                        newArray[mobIndex] = value;
                                        mobs().setValue(newArray);
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
                                      mobs().setValue((prev: mob[]) => prev.filter((_, i) => i !== mobIndex));
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
                              mobs().setValue((prev: mob[]) => [...prev, defaultData.mob]);
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
                    {(npcs) => (
                      <Input
                        title={dic.db.npc.selfName}
                        description={dic.db.npc.description}
                        state={fieldInfo(npcs())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={npcs().state.value}>
                            {(npc, npcIndex) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + npcIndex} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + npcIndex}
                                      initialValue={npc().id}
                                      setValue={(value) => {
                                        const newArray = [...npcs().state.value];
                                        newArray[npcIndex] = value;
                                        npcs().setValue(newArray);
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
                                      npcs().setValue((prev: npc[]) => prev.filter((_, i) => i !== npcIndex));
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
                              npcs().setValue((prev: npc[]) => [...prev, defaultData.npc]);
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
                    {(linkZones) => (
                      <Input
                        title={"链接的" + dic.db.zone.selfName}
                        description={dic.db.zone.description}
                        state={fieldInfo(linkZones())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={linkZones().state.value}>
                            {(linkZone, linkZoneIndex) => {
                              return (
                                <div class="Filed flex items-center gap-2">
                                  <label for={fieldKey + linkZoneIndex} class="flex-1">
                                    <Autocomplete
                                      id={fieldKey + linkZoneIndex}
                                      initialValue={linkZone().id}
                                      setValue={(value) => {
                                        const newArray = [...linkZones().state.value];
                                        newArray[linkZoneIndex] = value;
                                        linkZones().setValue(newArray);
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
                                      linkZones().setValue((prev: zone[]) =>
                                        prev.filter((_, i) => i !== linkZoneIndex),
                                      );
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
                              linkZones().setValue((prev: zone[]) => [...prev, defaultData.zone]);
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
                    {(activityIdField) => (
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
                            title={dic.db.activity.selfName}
                            description={dic.db.activity.description}
                            state={fieldInfo(activityIdField())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            <Autocomplete
                              id={activityIdField().name}
                              initialValue={activityIdField().state.value ?? ""}
                              setValue={(value) => activityIdField().setValue(value.id)}
                              datasFetcher={async () => {
                                const db = await getDB();
                                const activities = await db
                                  .selectFrom("activity")
                                  .selectAll("activity")

                                  .execute();
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
                    {(addressIdField) => (
                      <Input
                        title={dic.db.address.selfName}
                        description={dic.db.address.description}
                        state={fieldInfo(addressIdField())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Autocomplete
                          id={addressIdField().name}
                          initialValue={addressIdField().state.value}
                          setValue={(value) => addressIdField().setValue(value.id)}
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
                const simpleFieldKey = zoneField[0] as keyof zone;
                const simpleFieldValue = zoneField[1];
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

export const ZoneDataConfig: dataDisplayConfig<zone, ZoneWithRelated, ZoneWithRelated> = {
  defaultData: defaultZoneWithRelated,
  dataFetcher: ZoneWithRelatedFetcher,
  datasFetcher: ZonesFetcher,
  dataSchema: ZoneWithRelatedSchema,
  table: {
    dataFetcher: ZonesFetcher,
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
    dictionary: (dic) => ZoneWithRelatedDic(dic),
    hiddenColumnDef: ["id", "activityId", "addressId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ dic, data }) => ZoneWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
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
        {ObjRender<ZoneWithRelated>({
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
          dataRender={(mob) => {
            return (
              <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "mob", id: mob.id }])}>
                {mob.name}
              </Button>
            );
          }}
        />

        <CardSection
          title={"包含的" + dic.db.npc.selfName}
          data={npcsData.latest}
          dataRender={(npc) => {
            return (
              <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "npc", id: npc.id }])}>
                {npc.name}
              </Button>
            );
          }}
        />

        <CardSection
          title={"连接的" + dic.db.zone.selfName}
          data={linkZonesData.latest}
          dataRender={(zone) => {
            return (
              <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "zone", id: zone.id }])}>
                {zone.name}
              </Button>
            );
          }}
        />

        <CardSection
          title={"所属的" + dic.db.address.selfName}
          data={addressData.latest}
          dataRender={(address) => {
            return (
              <Button onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "address", id: address.id }])}>
                {address.name}
              </Button>
            );
          }}
        />

        <Show when={activityData.latest?.length}>
          <CardSection
            title={"所属的" + dic.db.activity.selfName}
            data={activityData.latest}
            dataRender={(activity) => {
              return (
                <Button
                  onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "activity", id: activity.id }])}
                >
                  {activity.name}
                </Button>
              );
            }}
          />
        </Show>

        <CardSharedSection dic={dic} data={data} delete={deleteZone} />
      </>
    );
  },
};
