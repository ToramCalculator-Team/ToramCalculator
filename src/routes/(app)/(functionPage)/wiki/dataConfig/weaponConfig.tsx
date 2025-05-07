import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { DBdataDisplayConfig } from "./dataConfig";
import { weaponSchema } from "~/../db/zod";
import { DB, weapon } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { findWeaponById, findWeapons, Weapon } from "~/repositories/weapon";

export const weaponDataConfig: DBdataDisplayConfig<weapon, Weapon["Card"], {}> = {
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
        accessorKey: "type",
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "baseAbi",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "stability",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "elementType",
        cell: (info) => info.getValue(),
        size: 150,
      },
    ],
    dataFetcher: findWeapons,
    defaultSort: { id: "type", desc: false },
    hiddenColumnDef: ["itemId"],
    tdGenerator: (props: { cell: Cell<weapon, keyof weapon>; dictionary: Dic<weapon> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof weapon;
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
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof weapon>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.weapon,
    extraData: {},
    hiddenFields: ["itemId"],
    dataSchema: weaponSchema,
    fieldGenerators: {},
    onSubmit: async (data) => {
      const db = await getDB();
      await db.transaction().execute(async (trx) => {
        await trx.insertInto("weapon").values(data).execute();
      });
    },
  },
  card: {
    dataFetcher: findWeaponById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      return (
        <>
          {DBDataRender<"weapon">({
            data,
            dictionary: dictionary,
            dataSchema: weaponSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["type", "baseAbi", "stability", "elementType"],
              其他属性: ["modifiers", "colorA", "colorB", "colorC"],
            },
          })}
        </>
      );
    },
  },
};
