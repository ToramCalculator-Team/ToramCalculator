import { createResource, For, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { npcSchema, taskSchema } from "~/../db/zod/index";
import { DB, npc, task } from "~/../db/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { ObjRender } from "~/components/module/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import * as Icon from "~/components/icon";
import { store } from "~/store";
import { setWikiStore } from "../store";
import { Transaction } from "kysely";
import { createStatistic } from "~/repositories/statistic";
import { pick } from "lodash-es";

type NpcWithRelated = npc & {
  tasks: task[];
};

const NpcWithRelatedSchema = npcSchema.extend({
  tasks: z.array(taskSchema),
});

const defaultNpcWithRelated: NpcWithRelated = {
  ...defaultData.npc,
  tasks: [],
};

const NpcWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.npc,
  fields: {
    ...dic.db.npc.fields,
    tasks: {
      key: "tasks",
      ...dic.db.task.fields,
      tableFieldDescription: dic.db.task.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.task.fields.name.formFieldDescription,
    },
  },
});

const NpcWithRelatedFetcher = async (id: string) => {
  const db = await getDB();
  const res = await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => [
      jsonArrayFrom(eb.selectFrom("task").whereRef("task.npcId", "=", eb.ref("npc.id")).selectAll("task")).as("tasks"),
    ])
    .executeTakeFirstOrThrow();
  return res as NpcWithRelated;
};

const NpcsFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("npc").selectAll("npc").execute();
  return res as NpcWithRelated[];
};

const createNpc = async (trx: Transaction<DB>, value: npc) => {
  const statistic = await createStatistic(trx);
  const npc = await trx.insertInto("npc").values({
    ...value,
    id: createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.user.account?.id,
    updatedByAccountId: store.session.user.account?.id,
  }).returningAll().executeTakeFirstOrThrow();
  return npc;
};

const updateNpc = async (trx: Transaction<DB>, value: npc) => {
  const npc = await trx.updateTable("npc").set({
    ...value,
    updatedByAccountId: store.session.user.account?.id,
  }).where("id", "=", value.id).returningAll().executeTakeFirstOrThrow();
  return npc;
};

const deleteNpc = async (trx: Transaction<DB>, npc: npc) => {
  // 重置npc相关数据
  // 重置task
  await trx.updateTable("task").set({ npcId: "defaultNpcId" }).where("npcId", "=", npc.id).execute();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", npc.statisticId).execute();
  // 删除npc
  await trx.deleteFrom("npc").where("id", "=", npc.id).execute();
};

const NpcWithRelatedForm = (dic: dictionary, oldNpc?: NpcWithRelated) => {
  const formInitialValues = oldNpc ?? defaultNpcWithRelated;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newNpc }) => {
      console.log("oldNpc", oldNpc, "newNpc", newNpc);
      const npcData = pick(newNpc, Object.keys(defaultNpcWithRelated) as (keyof NpcWithRelated)[]);
      const db = await getDB();
      const npc = await db.transaction().execute(async (trx) => {
        let npc: npc;
        if (oldNpc) {
          npc = await updateNpc(trx, npcData);
        } else {
          npc = await createNpc(trx, npcData);
        }

        // 关系项更新
        const oldTasks = oldNpc?.tasks ?? [];
        const { tasks: newTasks } = newNpc;
        const tasksToAdd = newTasks.filter((task) => !oldTasks.some((oldTask) => oldTask.id === task.id));
        const tasksToRemove = oldTasks.filter((oldTask) => !newTasks.some((newTask) => newTask.id === oldTask.id));

        // 关联项更新
        for (const task of tasksToAdd) {
          await trx.insertInto("task").values({
            ...task,
            id: createId(),
            npcId: npc.id,
          }).execute();
        }
        for (const task of tasksToRemove) {
          await trx.deleteFrom("task").where("id", "=", task.id).execute();
        }
        return npc;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "npc", id: npc.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.npc.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultNpcWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof NpcWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "zoneId":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: NpcWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.zone.selfName}
                        description={dic.db.zone.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Autocomplete
                          id={fieldKey}
                          initialValue={defaultData.zone}
                          setValue={(value) => {
                            field().setValue(value.id);
                          }}
                          datasFetcher={async () => {
                            const db = await getDB();
                            const zones = await db.selectFrom("zone").selectAll("zone").execute();
                            return zones;
                          }}
                          displayField="name"
                          valueField="id"
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              case "tasks":
                return (
                  <form.Field
                    name={fieldKey}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: NpcWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.task.selfName}
                        description={dic.db.task.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <For each={field().state.value}>
                            {(_item, index) => {
                              const initialValue = _item as task;
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
                                        const tasks = await db.selectFrom("task").selectAll("task").execute();
                                        return tasks;
                                      }}
                                      displayField="name"
                                      valueField="id"
                                    />
                                  </label>
                                  <Button
                                    onClick={(e) => {
                                      field().setValue((prev: task[]) => prev.filter((_, i) => i !== index()));
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
                              field().setValue((prev: task[]) => [...prev, defaultData.task]);
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
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof npc;
                const simpleFieldValue = _field[1];
                return renderField<NpcWithRelated, keyof NpcWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  NpcWithRelatedDic(dic),
                  NpcWithRelatedSchema,
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

export const NpcDataConfig: dataDisplayConfig<npc, NpcWithRelated, NpcWithRelated> = {
  defaultData: defaultNpcWithRelated,
  dataFetcher: NpcWithRelatedFetcher,
  datasFetcher: NpcsFetcher,
  dataSchema: NpcWithRelatedSchema,
  table: {
    dataFetcher: NpcsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
    ],
    dictionary: (dic) => NpcWithRelatedDic(dic),
    hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ dic, data }) => NpcWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
    const [tasksData] = createResource(data.id, async (npcId) => {
      const db = await getDB();
      return await db.selectFrom("task").where("task.npcId", "=", npcId).selectAll("task").execute();
    });

    return (
      <>
        <div class="NpcImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<NpcWithRelated>({
          data,
          dictionary: NpcWithRelatedDic(dic),
          dataSchema: NpcWithRelatedSchema,
          hiddenFields: ["id"],
          fieldGroupMap: {
            基本信息: ["name"],
          },
        })}

        <CardSection
          title={"持有的" + dic.db.task.selfName}
          data={tasksData.latest}
          renderItem={(task) => {
            return {
              label: task.name,
              onClick: () => setWikiStore("cardGroup", (pre) => [...pre, { type: "task", id: task.id }]),
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
                    await deleteNpc(trx, data);
                  });
                  // 关闭当前卡片
                  setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
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
