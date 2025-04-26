import { Cell, flexRender } from "@tanstack/solid-table";
import { createSignal, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { defaultSkill, findSkillById, findSkills, Skill } from "~/repositories/skill";
import { DataEnums } from "~/../db/dataEnums";
import { DBdataDisplayConfig } from "../utils";
import { skill_effectSchema, skillSchema, statisticSchema } from "~/../db/zod";
import { skill } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";

export const skillDataConfig: DBdataDisplayConfig<skill, Skill["Card"]> = {
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
      {
        accessorKey: "treeType",
        cell: (info) => info.getValue<keyof DataEnums["skill"]["treeType"]>(),
        size: 120,
      },
      {
        accessorKey: "tier",
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
      {
        accessorKey: "posX",
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
      {
        accessorKey: "posY",
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
    ],
    dataFetcher: findSkills,
    defaultSort: { id: "posX", desc: true },
    hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId"],
    tdGenerator: (props: { cell: Cell<skill, keyof skill>; dictionary: Dic<skill> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof skill;
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
            when={
              props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
            }
            fallback={tdContent()}
          >
            {"enumMap" in props.dictionary.fields[columnId]
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof skill>).enumMap[
                  props.cell.getValue()
                ]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultSkill,
    hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
    dataSchema: skillSchema,
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
    dataFetcher: findSkillById,
    deepHiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
    fieldGenerator: (key, value, dictionary) => {
      return (
        <div class="Field flex gap-2">
          <span class="text-main-text-color">{dictionary.fields[key].key}</span>:
          <span class="font-bold">{value?.toString()}</span>
        </div>
      );
    },
    dataSchema: skillSchema.extend({
      statistic: statisticSchema,
      effects: z.array(skill_effectSchema),
    }),
    fieldGroupMap: {
      基本信息: ["name", "treeType", "tier", "posX", "posY"],
      技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
      数据来源: ["dataSources"],
      技能效果: ["details"],
    },
  },
};
