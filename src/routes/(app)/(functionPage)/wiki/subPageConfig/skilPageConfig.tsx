import { Cell, flexRender } from "@tanstack/solid-table";
import { Accessor, createMemo, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createSkill, defaultSkill, findSkillById, findSkills, Skill } from "~/repositories/skill";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo, WikiPageConfig } from "../utils";
import { createSyncResource } from "~/hooks/resource";
import { skillSchema } from "~/../db/zod";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

export function skillPageConfig(): WikiPageConfig<"skill"> {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [skillList, { refetch: refetchSkillList }] = createSyncResource("skill", findSkills);
  const [formSkill] = createSignal<Skill["MainForm"]>(defaultSkill);
  return {
    tableName: "skill",
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
      dataList: skillList,
      defaultSort: { id: "posX", desc: true },
      dataListRefetcher: refetchSkillList,
      hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId"],
      tdGenerator: (props: { cell: Cell<Skill["MainTable"], keyof Skill["MainTable"]> }) => {
        const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
        type SkillKeys = keyof DataEnums["skill"];
        type SkillValueKeys<T extends SkillKeys> = keyof DataEnums["skill"][T];
        let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
        switch (props.cell.column.id as keyof Skill["MainTable"]) {
          case "name":
            defaultTdClass = "text-accent-color flex flex-col justify-center p-6 ";

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
            {/* 当此字段不存在于枚举类型中时，展示原始文本 */}
            <Show
              when={
                props.cell.column.id in dictionary().enums.skill && props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
              }
              fallback={tdContent()}
            >
              {
                dictionary().enums.skill[props.cell.column.id as SkillKeys][
                  props.cell.getValue() as SkillValueKeys<SkillKeys>
                ]
              }
            </Show>
          </td>
        );
      },
    },
    form: {
      defaultData: defaultSkill,
      data: formSkill,
      hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
      createData: createSkill,
      dataSchema: skillSchema,
      fieldGenerator: (key, field) => {
        const defaultInputClass = "mt-0.5 rounded px-4 py-2";
        const defaultLabelSizeClass = "";
        let icon: JSX.Element = null;
        let inputClass = defaultInputClass;
        let labelSizeClass = defaultLabelSizeClass;
        switch (key) {
        }
        return false;
      },
      refetchItemList: refetchSkillList,
    },
    card: {
      dataFetcher: findSkillById,
      hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
      fieldGenerator: undefined,
      dataSchema: skillSchema.extend({}),
      fieldGroupMap: {
        "基本信息": ["name", "treeType", "tier", "posX", "posY"],
        "技能属性": ["chargingType", "distanceType", "targetType", "isPassive"],
        "数据来源": ["dataSources"],
        "技能效果": ["details"],
      }
    },
  };
}
