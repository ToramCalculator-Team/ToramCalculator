import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { defaultSkill, findSkillById, findSkills, Skill } from "~/repositories/skill";
import { DataEnums } from "~/../db/dataEnums";
import { DBdataDisplayConfig } from "./dataConfig";
import { skill_effectSchema, skillSchema, statisticSchema } from "~/../db/zod";
import { skill } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";
import { CardSection } from "~/components/module/cardSection";

export const skillDataConfig: DBdataDisplayConfig<"skill", Skill["Card"], {}> = {
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
              ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof skill>).enumMap[props.cell.getValue()]
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
    fieldGenerators: {},
  },
  card: {
    dataFetcher: findSkillById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [skillEffectData] = createResource(data.id, async (skillId) => {
        const db = await getDB();
        return await db
          .selectFrom("skill_effect")
          .innerJoin("skill", "skill.id", "skill_effect.belongToskillId")
          .where("skill.id", "=", skillId)
          .selectAll("skill_effect")
          .execute();
      });

      return (
        <>
          <div class="MobImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"skill">({
            data,
            dictionary: dictionary,
            dataSchema: skillSchema.extend({
              statistic: statisticSchema,
              effects: z.array(skill_effectSchema),
            }),
            hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
            fieldGroupMap: {
              基本信息: ["name", "treeType", "tier", "posX", "posY"],
              技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
              数据来源: ["dataSources"],
              技能效果: ["details"],
            },
          })}

          <CardSection
            title={dictionary.cardFields?.effects ?? "技能效果"}
            data={skillEffectData.latest}
            renderItem={(effect) => {
              return {
                label: effect.condition,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "skill_effect", id: effect.id }]),
              };
            }}
          />
        </>
      );
    },
  },
};
