import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show, Index } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createSkill, findSkillById, findSkills, Skill } from "~/repositories/skill";
import { DataEnums } from "~/../db/dataEnums";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { skillSchema, skill_effectSchema, statisticSchema } from "~/../db/zod";
import { DB, skill, skill_effect } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { EnumSelect } from "~/components/controls/enumSelect";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { SkillDistanceType, SkillTreeType } from "../../../../../../db/kysely/enums";

type SkillWithRelated = skill & {
  effects: skill_effect[];
};

const SkillWithRelatedSchema = z.object({
  ...skillSchema.shape,
  effects: z.array(skill_effectSchema),
});

const defaultSkillWithRelated: SkillWithRelated = {
  ...defaultData.skill,
  effects: [],
};

const SkillWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.skill,
  fields: {
    ...dic.db.skill.fields,
    effects: {
      key: "effects",
      ...dic.db.skill_effect.fields,
      tableFieldDescription: dic.db.skill_effect.fields.condition.tableFieldDescription,
      formFieldDescription: dic.db.skill_effect.fields.condition.formFieldDescription,
    },
  },
})

const SkillWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultSkillWithRelated,
    onSubmit: async ({ value }) => {
      console.log("Submit value：", value);
      const db = await getDB();
      const skill = await db.transaction().execute(async (trx) => {
        const { effects, ...rest } = value;
        console.log("effects", effects, "skill", rest);
        const skill = await createSkill(trx, {
          ...rest,
          id: createId(),
        });
        if (effects?.length > 0) {
          for (const effect of effects) {
            await trx
              .insertInto("skill_effect")
              .values({
                ...effect,
                id: createId(),
                belongToskillId: skill.id,
              })
              .execute();
          }
        }
        return skill;
      });
      handleSubmit("skill", skill.id);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.skill.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultSkillWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof SkillWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "statisticId":
              case "createdByAccountId":
              case "updatedByAccountId":
                return null;
              case "treeType":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: skillSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.skill.fields.treeType.key}
                        description={dic.db.skill.fields.treeType.formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Select
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as SkillTreeType)}
                          options={Object.entries(dic.db.skill.fields.treeType.enumMap).map(([key, value]) => ({
                            label: value,
                            value: key,
                          }))}
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              case "distanceType":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: skillSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.skill.fields.distanceType.key}
                        description={dic.db.skill.fields.distanceType.formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Select
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as SkillDistanceType)}
                          options={Object.entries(dic.db.skill.fields.distanceType.enumMap).map(([key, value]) => ({
                            label: value,
                            value: key,
                          }))}
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              case "effects":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: SkillWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.skill_effect.selfName}
                        description={dic.db.skill_effect.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={field().state.value}>
                            {(effect, index) => {
                              return (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {fieldKey.toLocaleUpperCase() + " " + index}
                                    </span>
                                    <Button onClick={() => field().removeValue(index)}>-</Button>
                                  </div>
                                  <Index each={Object.entries(effect())}>
                                    {(effectField, index) => {
                                      const fieldKey = effectField()[0] as keyof skill_effect;
                                      const fieldValue = effectField()[1];
                                      switch (fieldKey) {
                                        case "id":
                                        case "belongToskillId":
                                        case "logic":
                                          return null;
                                        default:
                                          // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                          const simpleFieldKey = `effects[${index}].${fieldKey}`;
                                          const simpleFieldValue = fieldValue;
                                          return renderField(
                                            form,
                                            simpleFieldKey,
                                            simpleFieldValue,
                                            dic.db.skill_effect,
                                            skill_effectSchema,
                                          );
                                      }
                                    }}
                                  </Index>
                                </div>
                              );
                            }}
                          </Index>
                          <Button
                            onClick={() => {
                              const newArray = [...field().state.value, defaultData.skill_effect];
                              field().setValue(newArray);
                            }}
                            class="w-full"
                          >
                            +
                          </Button>
                        </div>
                      </Input>
                    )}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof skill;
                const simpleFieldValue = _field[1];
                return renderField(form, simpleFieldKey, simpleFieldValue, dic.db.skill, SkillWithRelatedSchema);
            }
          }}
        </For>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
          children={(state) => {
            return (
              <div class="flex items-center gap-1">
                <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                  {state().isSubmitting ? "..." : dic.ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};

export const createSkillDataConfig = (dic: dictionary): dataDisplayConfig<SkillWithRelated> => ({
  defaultData: defaultSkillWithRelated,
  table: {
    columnDef: [
      {
        id: "id",
        accessorFn: (row) => row.id,
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        id: "treeType",
        accessorFn: (row) => row.treeType,
        cell: (info) => info.getValue<keyof DataEnums["skill"]["treeType"]>(),
        size: 120,
      },
      {
        id: "tier",
        accessorFn: (row) => row.tier,
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
      {
        id: "posX",
        accessorFn: (row) => row.posX,
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
      {
        id: "posY",
        accessorFn: (row) => row.posY,
        cell: (info) => info.getValue<Boolean>().toString(),
        size: 160,
      },
    ],
    dic: SkillWithRelatedDic(dic),
    hiddenColumns: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: (props) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=."}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof SkillWithRelated;
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
          <Show when={true} fallback={tdContent()}>
            {"enumMap" in props.dic.fields[columnId]
              ? (props.dic.fields[columnId] as EnumFieldDetail<keyof SkillWithRelated>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("skill")
      .where("id", "=", id)
      .selectAll("skill")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("skill_effect")
            .whereRef("skill_effect.belongToskillId", "=", eb.ref("skill.id"))
            .selectAll("skill_effect"),
        ).as("effects"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("skill")
      .selectAll("skill")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("skill_effect")
            .whereRef("skill_effect.belongToskillId", "=", eb.ref("skill.id"))
            .selectAll("skill_effect"),
        ).as("effects"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: SkillWithRelatedSchema,
  form: (handleSubmit) => SkillWithRelatedForm(dic, handleSubmit),
  card: {
    cardRender: (
      data: SkillWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [effectsData] = createResource(data.id, async (skillId) => {
        const db = await getDB();
        return await db
          .selectFrom("skill_effect")
          .where("skill_effect.belongToskillId", "=", skillId)
          .selectAll("skill_effect")
          .execute();
      });

      return (
        <>
          <div class="SkillImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<SkillWithRelated>({
            data,
            dictionary: SkillWithRelatedDic(dic),
            dataSchema: SkillWithRelatedSchema,
            hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
            fieldGroupMap: {
              基本信息: ["name", "treeType", "tier", "posX", "posY"],
              技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
              数据来源: ["dataSources"],
              技能效果: ["details"],
            },
          })}

          <CardSection
            title={dic.db.skill_effect.selfName}
            data={effectsData.latest}
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
