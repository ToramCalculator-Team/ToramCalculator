import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { DBdataDisplayConfig } from "./dataConfig";
import { specialSchema } from "~/../db/zod";
import { DB, special } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { findSpeEquipByItemId, findSpeEquips } from "~/repositories/speEquip";

export const specialDataConfig: DBdataDisplayConfig<special, special, {}> = {
  table: {
    columnDef: [
      {
        accessorKey: "id",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "itemId",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "baseDef",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "modifiers",
        cell: (info) => info.getValue(),
        size: 200,
      },
    ],
    dataFetcher: findSpeEquips,
    defaultSort: { id: "baseDef", desc: true },
    hiddenColumnDef: ["itemId"],
    tdGenerator: (props: { cell: Cell<special, keyof special>; dictionary: Dic<special> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof special;
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
            {"enumMap" in props.dictionary.fields[columnId]
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof special>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.special,
    extraData: {},
    hiddenFields: ["itemId"],
    dataSchema: specialSchema,
    fieldGenerators: {},
    onSubmit: async (data) => {
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        await trx.insertInto("special").values(data).execute();
      });
    },
  },
  card: {
    dataFetcher: findSpeEquipByItemId,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      return (
        <>
          {DBDataRender<"special">({
            data,
            dictionary: dictionary,
            dataSchema: specialSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["baseDef"],
              其他属性: ["modifiers"],
            },
          })}
        </>
      );
    },
  },
};
