import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createNpc, findNpcById, findNpcs, Npc } from "~/repositories/npc";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { npcSchema, taskSchema } from "~/../db/zod";
import { npc, DB, task } from "~/../db/kysely/kyesely";
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
import { Select } from "~/components/controls/select";
import { DeepKeys, DeepValue } from "@tanstack/solid-form";

type NpcWithRelated = npc & {
  tasks: task[];
};

const NpcWithRelatedSchema = z.object({
  ...npcSchema.shape,
  tasks: z.array(taskSchema),
});

export const createNpcDataConfig = (dic: dictionary): dataDisplayConfig<NpcWithRelated> => ({
  defaultData: {
    ...defaultData.npc,
    tasks: [],
  },
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
    tdGenerator: (props: { cell: Cell<NpcWithRelated, keyof NpcWithRelated> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof NpcWithRelated;
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
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("npc")
      .where("id", "=", id)
      .selectAll("npc")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("task")
            .whereRef("task.npcId", "=", eb.ref("npc.id"))
            .selectAll("task"),
        ).as("tasks"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("npc")
      .selectAll("npc")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("task")
            .whereRef("task.npcId", "=", eb.ref("npc.id"))
            .selectAll("task"),
        ).as("tasks"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: NpcWithRelatedSchema,
  form: {
    hiddenFields: ["id"],
    fieldGenerators: {
      zoneId: (key, field) => {
        const initialValue = field().state.value;
        return (
          <Input
            title={"所属" + dic.db.zone.selfName}
            description={dic.db.zone.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              id={key}
              initialValue={initialValue}
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
        );
      },
      tasks: (key: keyof NpcWithRelated, field) => {
        return (
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
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const npc = await db.transaction().execute(async (trx) => {
        const { tasks, ...rest } = data;
        const npc = await createNpc(trx, {
          ...rest,
        });
        if (tasks.length > 0) {
          for (const task of tasks) {
            await trx.updateTable("task").set({ npcId: npc.id }).where("id", "=", task.id).execute();
          }
        }
        return npc;
      });
    },
  },
  card: {
    cardRender: (
      data: NpcWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [tasksData] = createResource(data.id, async (npcId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .where("task.npcId", "=", npcId)
          .selectAll("task")
          .execute();
      });

      return (
        <>
          {DBDataRender<NpcWithRelated>({
            data,
            dictionary: {
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
            },
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
