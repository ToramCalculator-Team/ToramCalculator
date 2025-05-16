import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show, Index } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createNpc, findNpcById, findNpcs, Npc } from "~/repositories/npc";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { npcSchema, taskSchema } from "~/../db/zod";
import { npc, DB, task } from "~/../db/kysely/kyesely";
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
import { TaskType } from "~/../db/kysely/enums";
import { EnumSelect } from "~/components/controls/enumSelect";
import { createId } from "@paralleldrive/cuid2";

type NpcWithRelated = npc & {
  tasks: task[];
};

const NpcWithRelatedSchema = z.object({
  ...npcSchema.shape,
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

const NpcWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultNpcWithRelated,
    onSubmit: async ({ value }) => {
      console.log("Submit value：", value);
      const db = await getDB();
      const npc = await db.transaction().execute(async (trx) => {
        const { tasks, ...rest } = value;
        console.log("tasks", tasks);
        console.log("rest", rest);
        const npc = await createNpc(trx, {
          ...rest,
        });
        if (tasks.length > 0) {
          for (const task of tasks) {
            await trx
              .insertInto("task")
              .values({
                ...task,
                id: createId(),
                npcId: npc.id,
              })
              .execute();
          }
        }
        return npc;
      });
      handleSubmit("npc", npc.id);
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
                return null;
              case "zoneId":
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
                return renderField<NpcWithRelated, keyof NpcWithRelated>(form, simpleFieldKey, simpleFieldValue, NpcWithRelatedDic(dic), NpcWithRelatedSchema);
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

export const createNpcDataConfig = (dic: dictionary): dataDisplayConfig<NpcWithRelated, npc> => ({
  defaultData: defaultNpcWithRelated,
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
    ],
    dic: NpcWithRelatedDic(dic),
    hiddenColumns: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("npc")
      .where("id", "=", id)
      .selectAll("npc")
      .select((eb) => [
        jsonArrayFrom(eb.selectFrom("task").whereRef("task.npcId", "=", eb.ref("npc.id")).selectAll("task")).as(
          "tasks",
        ),
      ])
      .executeTakeFirstOrThrow();
    return res as NpcWithRelated;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("npc")
      .selectAll("npc")
      .select((eb) => [
        jsonArrayFrom(eb.selectFrom("task").whereRef("task.npcId", "=", eb.ref("npc.id")).selectAll("task")).as(
          "tasks",
        ),
      ])
      .execute();
    return res as NpcWithRelated[];
  },
  dictionary: dic,
  dataSchema: NpcWithRelatedSchema,
  form: (handleSubmit) => NpcWithRelatedForm(dic, handleSubmit),
  card: {
    cardRender: (
      data: NpcWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [tasksData] = createResource(data.id, async (npcId) => {
        const db = await getDB();
        return await db.selectFrom("task").where("task.npcId", "=", npcId).selectAll("task").execute();
      });

      return (
        <>
          {DBDataRender<NpcWithRelated>({
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
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: task.id }]),
              };
            }}
          />
        </>
      );
    },
  },
});
