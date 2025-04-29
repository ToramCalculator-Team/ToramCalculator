import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { defaultNpc, findNpcById, findNpcs, Npc } from "~/repositories/npc";
import { DBdataDisplayConfig } from "../utils";
import { npcSchema } from "~/../db/zod";
import { DB, npc } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";

export const npcDataConfig: DBdataDisplayConfig<npc, Npc["MainTable"]> = {
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
    hiddenFields: ["id"],
    dataSchema: npcSchema,
    fieldGenerator: (key, field, dictionary) => {
      const defaultInputClass = "mt-0.5 rounded px-4 py-2";
      const defaultLabelSizeClass = "";
      let icon: JSX.Element = null;
      let inputClass = defaultInputClass;
      let labelSizeClass = defaultLabelSizeClass;
      switch (key) {
      }
      return false;
    },
  },
  card: {
    dataFetcher: findNpcById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [taskData] = createResource(data.id, async (npcId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .where("task.npcId", "=", npcId)
          .selectAll("task")
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

          <section class="FieldGroup gap-2 w-full">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dictionary.cardFields?.tasks ?? "提供的任务"}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <Show when={taskData.latest}>
                <For each={taskData.latest}>
                  {(task) => {
                    return <Button onClick={() => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: task.id }])}>{task.name}</Button>;
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