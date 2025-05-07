import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { DBdataDisplayConfig } from "./dataConfig";
import { optionSchema } from "~/../db/zod";
import { DB, option } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { findOptEquipByItemId, findOptEquips } from "~/repositories/optEquip";
import { defaultData } from "~/../db/defaultData";
export const optionDataConfig: DBdataDisplayConfig<option, option, {}> = {
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
      {
        accessorKey: "colorA",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "colorB",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "colorC",
        cell: (info) => info.getValue(),
        size: 100,
      },
    ],
    dataFetcher: findOptEquips,
    defaultSort: { id: "baseDef", desc: true },
    hiddenColumnDef: ["itemId"],
    tdGenerator: (props: { cell: Cell<option, keyof option>; dictionary: Dic<option> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof option;
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
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof option>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.option,
    extraData: {},
    hiddenFields: ["itemId"],
    dataSchema: optionSchema,
    fieldGenerators: {},
    onSubmit: async (data) => {
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        await trx.insertInto("option").values(data).execute();
      });
    },
  },
  card: {
    dataFetcher: findOptEquipByItemId,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      return (
        <>
          {DBDataRender<"option">({
            data,
            dictionary: dictionary,
            dataSchema: optionSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["baseDef"],
              其他属性: ["modifiers", "colorA", "colorB", "colorC"],
            },
          })}
        </>
      );
    },
  },
};
