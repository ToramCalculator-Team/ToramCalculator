import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createNpc, defaultNpc, findNpcById, findNpcs, Npc } from "~/repositories/npc";
import { dataDisplayConfig } from "./dataConfig";
import { npcSchema } from "~/../db/zod";
import { DB, npc } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { findTasks } from "~/repositories/task";
import { Input } from "~/components/controls/input";
import { fieldInfo } from "../utils";
import { Autocomplete } from "~/components/controls/autoComplete";
import { CardSection } from "~/components/module/cardSection";

export const createNpcDataConfig = (dic: Dic<npc>): dataDisplayConfig<npc, Npc["Card"], {
  tasksData: string[];
}> => ({
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
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<npc, keyof npc>; }) => {
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
          {"enumMap" in dic.fields[columnId]
            ? (dic.fields[columnId] as EnumFieldDetail<keyof npc>).enumMap[props.cell.getValue()]
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
    dictionary: dic,
    fieldGenerators: {
      zoneId: (key, field) => {
        return (
          <Input
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
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
    cardRender: (data: npc, appendCardTypeAndIds: (updater: (prev: { type: keyof DB; id: string; }[]) => { type: keyof DB; id: string; }[]) => void) => {
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
          {DBDataRender<Npc["Card"]>({
            data,
            dictionary: dic,
            dataSchema: npcSchema,
            hiddenFields: ["id", "zoneId"],
            fieldGroupMap: {
              基本信息: ["name"],
            },
          })}

          <CardSection
            title={dic.cardFields?.tasks ?? "提供的任务"}
            data={taskData.latest}
            renderItem={(task) => {
              return {
                label: task.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: task.id }]),
              };
            }}
          />

          <CardSection
            title={dic.cardFields?.zone ?? "所属区域"}
            data={zoneData.latest}
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
