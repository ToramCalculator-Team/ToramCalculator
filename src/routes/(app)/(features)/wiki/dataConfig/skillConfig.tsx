import { For, JSX, Index, Show } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { skillSchema, skill_effectSchema, statisticSchema } from "@db/generated/zod/index";
import { DB, skill, skill_effect } from "@db/generated/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "@db/repositories/database";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { defaultData } from "@db/defaultData";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { SkillDistanceType, SkillTreeType } from "@db/generated/kysely/enums";
import Icons from "~/components/icons/index";
import { store } from "~/store";
import { createStatistic } from "@db/repositories/statistic";
import { setWikiStore } from "../store";
import { Transaction } from "kysely";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import { pick } from "lodash-es";
import { arrayDiff } from "./utils";
import { CardSharedSection } from "./utils";
import { MemberBaseNestedSchema } from "~/components/features/simulator/core/member/MemberBaseSchema";

type SkillWithRelated = skill & {
  effects: skill_effect[];
};

const SkillWithRelatedSchema = skillSchema.extend({
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
});

const SkillWithRelatedFetcher = async (id: string): Promise<SkillWithRelated> => {
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
};

const SkillsFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("skill").selectAll("skill").execute();
  return res;
};

const createSkill = async (trx: Transaction<DB>, value: skill) => {
  const statistic = await createStatistic(trx);
  const skill = await trx
    .insertInto("skill")
    .values({
      ...value,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return skill;
};

const updateSkill = async (trx: Transaction<DB>, value: skill) => {
  const skill = await trx
    .updateTable("skill")
    .set({
      ...value,
      updatedByAccountId: store.session.user.account?.id,
    })
    .where("id", "=", value.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return skill;
};

const deleteSkill = async (trx: Transaction<DB>, skill: skill) => {
  // 重置技能关联数据
  // 重置角色技能
  await trx
    .updateTable("character_skill")
    .set({
      templateId: "defaultSkillId",
    })
    .where("templateId", "=", skill.id)
    .execute();
  // 删除技能效果
  await trx.deleteFrom("skill_effect").where("belongToskillId", "=", skill.id).execute();
  // 删除技能
  await trx.deleteFrom("skill").where("id", "=", skill.id).execute();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", skill.statisticId).execute();
};

const SkillWithRelatedForm = (dic: dictionary, oldSkill?: SkillWithRelated) => {
  const formInitialValues = oldSkill ?? defaultSkillWithRelated;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newSkill }) => {
      console.log("oldSkill", oldSkill, "newSkill", newSkill);
      const skillData = pick(newSkill, Object.keys(defaultData.skill) as (keyof skill)[]);
      const db = await getDB();
      const skill = await db.transaction().execute(async (trx) => {
        let skill: skill;
        if (oldSkill) {
          skill = await updateSkill(trx, skillData);
        } else {
          skill = await createSkill(trx, skillData);
        }

        // 更新技能效果
        const {
          dataToAdd: effectsToAdd,
          dataToRemove: effectsToRemove,
          dataToUpdate: effectsToUpdate,
        } = await arrayDiff({
          trx,
          table: "skill_effect",
          oldArray: oldSkill?.effects ?? [],
          newArray: newSkill.effects,
        });
        for (const effect of effectsToAdd) {
          await trx
            .insertInto("skill_effect")
            .values({
              ...effect,
              id: createId(),
              belongToskillId: skill.id,
            })
            .execute();
        }
        for (const effect of effectsToRemove) {
          await trx.deleteFrom("skill_effect").where("id", "=", effect.id).execute();
        }
        for (const effect of effectsToUpdate) {
          await trx.updateTable("skill_effect").set(effect).where("id", "=", effect.id).execute();
        }
        return skill;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "skill", id: skill.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
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
        <For each={Object.entries(formInitialValues)}>
          {(skillField, skillFieldIndex) => {
            console.log("skillFieldIndex", skillFieldIndex(), skillField);
            const fieldKey = skillField[0] as keyof SkillWithRelated;
            const fieldValue = skillField[1];
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
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: SkillWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(effects) => (
                      <Input
                        title={dic.db.skill_effect.selfName}
                        description={dic.db.skill_effect.description}
                        state={fieldInfo(effects())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={effects().state.value}>
                            {(effect, effectIndex) => {
                              console.log("effect", effect(), effectIndex);
                              return (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {fieldKey.toLocaleUpperCase() + " " + effectIndex}
                                    </span>
                                    <Button onClick={() => effects().removeValue(effectIndex)}>-</Button>
                                  </div>
                                  <Index each={Object.entries(effect())}>
                                    {(effectField, effectFieldIndex) => {
                                      const fieldKey = effectField()[0] as keyof skill_effect;
                                      const fieldValue = effectField()[1];
                                      switch (fieldKey) {
                                        case "id":
                                        case "belongToskillId":
                                          return null;
                                        case "logic":
                                          return (
                                            <form.Field
                                              name={`effects[${effectIndex}].logic`}
                                              validators={{
                                                onChangeAsyncDebounceMs: 500,
                                                onChangeAsync: skill_effectSchema.shape[fieldKey],
                                              }}
                                            >
                                              {(logicField) => {
                                                return (
                                                  <Input
                                                    title={dic.db.skill_effect.fields.logic.key}
                                                    description={dic.db.skill_effect.fields.logic.formFieldDescription}
                                                    autocomplete="off"
                                                    type="text"
                                                    id={logicField().name}
                                                    name={logicField().name}
                                                    value={logicField().state.value as string}
                                                    onBlur={logicField().handleBlur}
                                                    onChange={(e) => {
                                                      const target = e.target;
                                                      logicField().handleChange(target.value);
                                                    }}
                                                    state={fieldInfo(logicField())}
                                                    class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                                  >
                                                    <LogicEditor
                                                      data={logicField().state.value}
                                                      setData={(data) => logicField().setValue(data)}
                                                      state={true}
                                                      id={logicField().name}
                                                      schema={MemberBaseNestedSchema}
                                                      targetSchema={MemberBaseNestedSchema}
                                                      class="h-[80vh] w-full"
                                                    />
                                                  </Input>
                                                );
                                              }}
                                            </form.Field>
                                          );
                                        default:
                                          // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                          const simpleFieldKey = `effects[${effectIndex}].${fieldKey}`;
                                          const simpleFieldValue = fieldValue;
                                          return renderField<skill_effect, keyof skill_effect>(
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
                              const newArray = [...effects().state.value, defaultData.skill_effect];
                              effects().setValue(newArray);
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
                const simpleFieldKey = skillField[0] as keyof skill;
                const simpleFieldValue = skillField[1];
                return renderField<SkillWithRelated, keyof SkillWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  SkillWithRelatedDic(dic),
                  SkillWithRelatedSchema,
                );
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

export const SkillDataConfig: dataDisplayConfig<skill, SkillWithRelated, SkillWithRelated> = {
  defaultData: defaultSkillWithRelated,
  dataFetcher: SkillWithRelatedFetcher,
  datasFetcher: SkillsFetcher,
  dataSchema: SkillWithRelatedSchema,
  table: {
    dataFetcher: SkillsFetcher,
    columnsDef: [
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
        cell: (info) => info.getValue<SkillTreeType>(),
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
    dictionary: (dic) => SkillWithRelatedDic(dic),
    hiddenColumnDef: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ dic, data }) => SkillWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
    return (
      <>
        <div class="SkillImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<SkillWithRelated>({
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

        <Show when={data.effects?.length}>
          <section class="FieldGroup w-full gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.db.skill_effect.selfName}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="Content flex flex-col gap-3 p-1">
              <For each={data.effects}>
                {(effect) => {
                  return (
                    <div class="ObjectBox bg-area-color flex flex-col rounded-md p-2">
                      {ObjRender<skill_effect>({
                        data: effect,
                        dictionary: dic.db.skill_effect,
                        dataSchema: skill_effectSchema,
                        hiddenFields: ["id", "belongToskillId"],
                      })}
                      <LogicEditor
                        data={effect.logic}
                        setData={() => {}}
                        state={true}
                        readOnly
                        schema={MemberBaseNestedSchema}
                        targetSchema={MemberBaseNestedSchema}
                        id={effect.id}
                        class="h-[80vh] w-full"
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </section>
        </Show>

        <CardSharedSection dic={dic} data={data} delete={deleteSkill} />
      </>
    );
  },
};
