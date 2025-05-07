import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createNpc, defaultNpc, findNpcById, findNpcs, Npc } from "~/repositories/npc";
import { DBdataDisplayConfig } from "./dataConfig";
import { npcSchema } from "~/../db/zod";
import { DB, npc } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";
import { findTasks } from "~/repositories/task";
import { findZones } from "~/repositories/zone";
import { Input } from "~/components/controls/input";
import { fieldInfo } from "../utils";
import { Autocomplete } from "~/components/controls/autoComplete";

export const npcDataConfig: DBdataDisplayConfig<
  "npc",
  Npc["Card"],
  {
    tasksData: string[];
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
    ],
    dataFetcher: findNpcs,
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    tdGenerator: (props: { cell: Cell<npc, keyof npc>; dictionary: Dic<npc> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof npc;
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
            ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof npc>).enumMap[props.cell.getValue()]
            : props.cell.getValue()}
        </td>
      );
    },
  },
  form: {
    data: defaultNpc,
    extraData: {
      tasksData: {
        defaultValue: [],
        dictionary: {
          key: "tasks",
          tableFieldDescription: "持有的任务",
          formFieldDescription: "持有的任务",
        },
        optionsFetcher: async (name: string) => {
          const tasks = await findTasks();
          return tasks.map((task) => ({
            label: task.name,
            value: task.id,
          }));
        },
      },
    },
    hiddenFields: ["id"],
    dataSchema: npcSchema,
    fieldGenerators: {
      zoneId: (key, field, dictionary) => {
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
                  .selectFrom("zone")
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
    onSubmit: async (data) => {
      const db = await getDB();
      const npc = await db.transaction().execute(async (trx) => {
        const { tasksData, ...rest } = data;
        const npc = await createNpc(trx, {
          ...rest,
        });
        if (tasksData.length > 0) {
          for (const taskId of tasksData) {
            await trx.updateTable("task").set({ npcId: npc.id }).where("id", "=", taskId).execute();
          }
        }
        return npc;
      });
    },
  },
  card: {
    dataFetcher: findNpcById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [taskData] = createResource(data.id, async (npcId) => {
        const db = await getDB();
        return await db.selectFrom("task").where("task.npcId", "=", npcId).selectAll("task").execute();
      });

      const [zoneData] = createResource(data.id, async (npcId) => {
        const db = await getDB();
        return await db
          .selectFrom("zone")
          .innerJoin("npc", "zone.id", "npc.zoneId")
          .where("npc.id", "=", npcId)
          .selectAll("zone")
          .execute();
      });

      return (
        <>
          <div class="NpcImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"npc">({
            data,
            dictionary: dictionary,
            dataSchema: npcSchema,
            hiddenFields: ["id", "zoneId"],
            fieldGroupMap: {
              基本信息: ["name"],
            },
          })}

          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.tasks ?? "提供的任务"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={taskData.latest}>
                <For each={taskData.latest}>
                  {(task) => {
                    return (
                      <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: task.id }])}>
                        {task.name}
                      </Button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </section>
        </>
      );
    },
  },
};
