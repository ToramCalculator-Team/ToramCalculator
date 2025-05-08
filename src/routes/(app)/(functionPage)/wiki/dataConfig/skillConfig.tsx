import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createSkill, findSkillById, findSkills, Skill } from "~/repositories/skill";
import { DataEnums } from "~/../db/dataEnums";
import { dataDisplayConfig } from "./dataConfig";
import { skill_effectSchema, skillSchema, statisticSchema } from "~/../db/zod";
import { DB, skill } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { z, ZodObject, ZodSchema } from "zod";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";
import { Input } from "~/components/controls/input";
import { fieldInfo } from "../utils";
import * as Icon from "~/components/icon";
import { Select } from "~/components/controls/select";
import { EnumSelect } from "~/components/controls/enumSelect";
export const createSkillDataConfig = (dic: Dic<skill>): dataDisplayConfig<skill, Skill["Card"], {}> => ({
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
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<skill, keyof skill> }) => {
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
            {"enumMap" in dic.fields[columnId]
              ? (dic.fields[columnId] as EnumFieldDetail<keyof skill>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.skill,
    hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
    dataSchema: skillSchema,
    dictionary: dic,
    fieldGenerators: {
      treeType: (key, field) => {
        const zodValue = skillSchema.shape[key];
        return (
          <Input
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Select
              value={field().state.value}
              setValue={field().setValue}
              options={zodValue.options.map((type) => ({ label: dic.fields[key].enumMap[type], value: type }))}
              class="w-full"
            />
          </Input>
        );
      },
      chargingType: (key, field) => {
        const zodValue = skillSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
      targetType: (key, field) => {
        const zodValue = skillSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
      distanceType: (key, field) => {
        const zodValue = skillSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const skill = await db.transaction().execute(async (trx) => {
        const { ...rest } = data;
        const skill = await createSkill(trx, {
          ...rest,
        });
        return skill;
      });
    },
  },
  card: {
    dataFetcher: findSkillById,
    cardRender: (
      data: skill,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
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
          {DBDataRender<Skill["Card"]>({
            data,
            dictionary: dic,
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
            title={dic.cardFields?.effects ?? "技能效果"}
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
});
