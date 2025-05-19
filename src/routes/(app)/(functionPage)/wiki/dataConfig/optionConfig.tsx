import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show, Index } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, optionSchema, recipeSchema, recipe_ingredientSchema } from "~/../db/zod";
import { DB, item, option, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { DBDataRender } from "~/components/module/dbDataRender";
import { defaultData } from "~/../db/defaultData";
import { createOptEquip, OptEquip } from "~/repositories/optEquip";
import { createItem, findItems, Item } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { EnumSelect } from "~/components/controls/enumSelect";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { itemTypeToTableType } from "./utils";
import { createForm, Field } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";
import { Toggle } from "~/components/controls/toggle";
import { Autocomplete } from "~/components/controls/autoComplete";
import { RecipeIngredientType } from "../../../../../../db/kysely/enums";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

type optionWithRelated = option &
  item & {
    recipe: recipe & {
      recipeEntries: recipe_ingredient[];
    };
  };

const optionWithRelatedSchema = z.object({
  ...itemSchema.shape,
  ...optionSchema.shape,
  recipe: recipeSchema.extend({
    recipeEntries: z.array(recipe_ingredientSchema),
  }),
});

const defaultOptEquipWithRelated: optionWithRelated = {
  ...defaultData.item,
  ...defaultData.option,
  recipe: {
    ...defaultData.recipe,
    recipeEntries: [],
  },
};

const OptEquipWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.option,
  fields: {
    ...dic.db.option.fields,
    ...dic.db.item.fields,
    recipe: {
      key: dic.db.recipe.selfName,
      tableFieldDescription: dic.db.recipe.description,
      formFieldDescription: dic.db.recipe.description,
      selfName: dic.db.recipe.selfName,
      description: dic.db.recipe.description,
      fields: {
        ...dic.db.recipe.fields,
        recipeEntries: {
          key: dic.db.recipe_ingredient.selfName,
          tableFieldDescription: dic.db.recipe_ingredient.description,
          formFieldDescription: dic.db.recipe_ingredient.description,
        },
      },
    },
  },
});

const OptEquipWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const [isLimit, setIsLimit] = createSignal(false);
  const form = createForm(() => ({
    defaultValues: defaultOptEquipWithRelated,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const option = await db.transaction().execute(async (trx) => {
        const itemData = pick(value, Object.keys(defaultData.item) as (keyof item)[]);
        const optionData = pick(value, Object.keys(defaultData.option) as (keyof option)[]);
        const recipeData = pick(value.recipe, Object.keys(defaultData.recipe) as (keyof recipe)[]);
        const recipeEntriesData = value.recipe.recipeEntries;
        const item = await createItem(trx, {
          ...itemData,
          itemType: "Option",
        });
        const option = await createOptEquip(trx, {
          ...optionData,
          itemId: item.id,
        });
        const recipe = await trx
          .insertInto("recipe")
          .values({
            ...recipeData,
            id: createId(),
            itemId: item.id,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        const recipeEntries = await trx
          .insertInto("recipe_ingredient")
          .values(
            recipeEntriesData.map((entry) => ({
              ...entry,
              id: createId(),
              recipeId: recipe.id,
            })),
          )
          .returningAll()
          .execute();
        return option;
      });
      handleSubmit("option", option.itemId);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.option.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultOptEquipWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof optionWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "recipe":
                return (
                  <form.Field
                    name={`recipe`}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: optionWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.recipe.selfName}
                        description={dic.db.recipe.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Index each={Object.entries(field().state.value)}>
                          {(recipeField, _index) => {
                            const recipeFieldKey = recipeField()[0] as keyof optionWithRelated["recipe"];
                            const recipeFieldValue = recipeField()[1];
                            switch (recipeFieldKey) {
                              case "id":
                              case "itemId":
                                return null;
                              case "activityId":
                                return (
                                  <form.Field
                                    name={fieldKey}
                                    validators={{
                                      onChangeAsyncDebounceMs: 500,
                                      onChangeAsync: optionWithRelatedSchema.shape[fieldKey],
                                    }}
                                  >
                                    {(field) => (
                                      <>
                                        <Input
                                          title={"活动配方标记"}
                                          description={"仅在某个活动开启时可使用的配方"}
                                          state={undefined}
                                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                        >
                                          <Toggle
                                            id={"isLimit"}
                                            onClick={() => setIsLimit(!isLimit())}
                                            onBlur={undefined}
                                            name={"isLimit"}
                                            checked={isLimit()}
                                          />
                                        </Input>
                                        <Show when={isLimit()}>
                                          <Input
                                            title={dic.db.activity.selfName}
                                            description={dic.db.activity.description}
                                            state={fieldInfo(field())}
                                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                          >
                                            <Autocomplete
                                              id={field().name + "activityId"}
                                              initialValue={defaultData.activity}
                                              setValue={(value) => {
                                                field().setValue({
                                                  ...field().state.value,
                                                  activityId: value.id,
                                                });
                                              }}
                                              datasFetcher={async () => {
                                                const db = await getDB();
                                                const activities = await db
                                                  .selectFrom("activity")
                                                  .selectAll("activity")
                                                  .execute();
                                                return activities;
                                              }}
                                              displayField="name"
                                              valueField="id"
                                            />
                                          </Input>
                                        </Show>
                                      </>
                                    )}
                                  </form.Field>
                                );
                              case "recipeEntries":
                                return (
                                  <form.Field name={`recipe.recipeEntries`} mode="array">
                                    {(subField) => (
                                      <Input
                                        title={dic.db.recipe_ingredient.selfName}
                                        description={dic.db.recipe_ingredient.description}
                                        state={fieldInfo(subField())}
                                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                      >
                                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                                          <Show when={subField().state.value.length > 0}>
                                            <Index each={subField().state.value}>
                                              {(recipeEntry, recipeEntryIndex) => {
                                                return (
                                                  <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                                    <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                                      <span class="text-accent-color font-bold">
                                                        {dic.db.recipe_ingredient.selfName + " " + recipeEntryIndex}
                                                      </span>
                                                      <Button
                                                        onClick={() => {
                                                          subField().removeValue(recipeEntryIndex);
                                                        }}
                                                      >
                                                        -
                                                      </Button>
                                                    </div>
                                                    <Index each={Object.entries(recipeEntry())}>
                                                      {(recipeEntryField, _index) => {
                                                        const recipeEntryFieldKey =
                                                          recipeEntryField()[0] as keyof optionWithRelated["recipe"]["recipeEntries"][number];
                                                        const recipeEntryFieldValue = recipeEntryField()[1];
                                                        switch (recipeEntryFieldKey) {
                                                          case "id":
                                                          case "recipeId":
                                                            return null;
                                                          case "type":
                                                            return (
                                                              <form.Field
                                                                name={`recipe.recipeEntries[${recipeEntryIndex}].${recipeEntryFieldKey}`}
                                                                validators={{
                                                                  onChangeAsyncDebounceMs: 500,
                                                                  onChangeAsync:
                                                                    recipe_ingredientSchema.shape[recipeEntryFieldKey],
                                                                }}
                                                              >
                                                                {(field) => (
                                                                  <Input
                                                                    title={
                                                                      dic.db.recipe_ingredient.fields[
                                                                        recipeEntryFieldKey
                                                                      ].key
                                                                    }
                                                                    description={
                                                                      dic.db.recipe_ingredient.fields[
                                                                        recipeEntryFieldKey
                                                                      ].formFieldDescription
                                                                    }
                                                                    state={fieldInfo(field())}
                                                                  >
                                                                    <Select
                                                                      value={field().state.value}
                                                                      setValue={(value) =>
                                                                        field().setValue(value as RecipeIngredientType)
                                                                      }
                                                                      options={Object.entries(
                                                                        dic.db.recipe_ingredient.fields.type.enumMap,
                                                                      ).map(([key, value]) => ({
                                                                        label: value,
                                                                        value: key,
                                                                      }))}
                                                                    />
                                                                  </Input>
                                                                )}
                                                              </form.Field>
                                                            );
                                                          case "itemId":
                                                            return (
                                                              <form.Subscribe
                                                                selector={(state) =>
                                                                  state.values.recipe.recipeEntries[recipeEntryIndex]
                                                                    .type
                                                                }
                                                              >
                                                                {(type) => (
                                                                  <Show when={type() === "Item"}>
                                                                    <form.Field
                                                                      name={`recipe.recipeEntries[${recipeEntryIndex}].itemId`}
                                                                      validators={{
                                                                        onChangeAsyncDebounceMs: 500,
                                                                        onChangeAsync:
                                                                          recipe_ingredientSchema.shape[
                                                                            recipeEntryFieldKey
                                                                          ],
                                                                      }}
                                                                    >
                                                                      {(itemIdField) => (
                                                                        <Input
                                                                          title={
                                                                            dic.db.recipe_ingredient.fields[
                                                                              recipeEntryFieldKey
                                                                            ].key
                                                                          }
                                                                          description={
                                                                            dic.db.recipe_ingredient.fields[
                                                                              recipeEntryFieldKey
                                                                            ].formFieldDescription
                                                                          }
                                                                          state={fieldInfo(itemIdField())}
                                                                        >
                                                                          <Autocomplete
                                                                            id={recipeEntryFieldKey + recipeEntryIndex}
                                                                            initialValue={{ id: "", name: "" }}
                                                                            setValue={(value) => {
                                                                              itemIdField().setValue(value.id);
                                                                            }}
                                                                            datasFetcher={async () => {
                                                                              const db = await getDB();
                                                                              const items = await db
                                                                                .selectFrom("item")
                                                                                .select(["id", "name"])
                                                                                .execute();
                                                                              return items;
                                                                            }}
                                                                            displayField="name"
                                                                            valueField="id"
                                                                          />
                                                                        </Input>
                                                                      )}
                                                                    </form.Field>
                                                                  </Show>
                                                                )}
                                                              </form.Subscribe>
                                                            );
                                                          default:
                                                            // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                                            const simpleFieldKey = `recipe.recipeEntries[${recipeEntryIndex}].${recipeEntryFieldKey}`;
                                                            const simpleFieldValue = recipeEntryFieldValue;
                                                            return renderField<
                                                              recipe_ingredient,
                                                              keyof recipe_ingredient
                                                            >(
                                                              form,
                                                              simpleFieldKey,
                                                              simpleFieldValue,
                                                              dic.db.recipe_ingredient,
                                                              recipe_ingredientSchema,
                                                            );
                                                        }
                                                      }}
                                                    </Index>
                                                  </div>
                                                );
                                              }}
                                            </Index>
                                          </Show>
                                          <Button
                                            onClick={() => {
                                              subField().pushValue({
                                                ...defaultData.recipe_ingredient,
                                              });
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
                                const simpleFieldKey = `recipe.${recipeFieldKey}`;
                                const simpleFieldValue = recipeFieldValue;
                                return renderField<optionWithRelated["recipe"], keyof optionWithRelated["recipe"]>(
                                  form,
                                  simpleFieldKey,
                                  simpleFieldValue,
                                  OptEquipWithRelatedDic(dic).fields.recipe,
                                  recipeSchema,
                                );
                            }
                          }}
                        </Index>
                      </Input>
                    )}
                  </form.Field>
                );
              default:
                return renderField<optionWithRelated, keyof optionWithRelated>(
                  form,
                  fieldKey,
                  fieldValue,
                  OptEquipWithRelatedDic(dic),
                  optionWithRelatedSchema,
                );
            }
          }}
        </For>
        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
          children={(state) => (
            <div class="flex items-center gap-1">
              <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                {state().isSubmitting ? "..." : dic.ui.actions.add}
              </Button>
            </div>
          )}
        />
      </form>
    </div>
  );
};

export const createOptEquipDataConfig = (dic: dictionary): dataDisplayConfig<optionWithRelated, option & item> => ({
  defaultData: defaultOptEquipWithRelated,
  dataFetcher: async (id) => {
    const db = await getDB();
    const result = await db
      .selectFrom("item")
      .where("id", "=", id)
      .innerJoin("option", "option.itemId", "item.id")
      .selectAll(["item", "option"])
      .select((eb) => [
        jsonObjectFrom(
          eb
            .selectFrom("recipe")
            .where("recipe.itemId", "=", id)
            .selectAll("recipe")
            .select((eb) => [
              jsonArrayFrom(
                eb
                  .selectFrom("recipe_ingredient")
                  .where("recipe_ingredient.recipeId", "=", "recipe.id")
                  .select((eb) => [
                    jsonObjectFrom(
                      eb.selectFrom("item").where("item.id", "=", "recipe_ingredient.itemId").selectAll("item"),
                    )
                      .$notNull()
                      .as("item"),
                  ])
                  .selectAll("recipe_ingredient"),
              ).as("recipeEntries"),
            ]),
        )
          .$notNull()
          .as("recipe"),
      ])
      .executeTakeFirstOrThrow();
    return result as optionWithRelated;
  },
  datasFetcher: async () => {
    const db = await getDB();
    return await db
      .selectFrom("item")
      .innerJoin("option", "option.itemId", "item.id")
      .selectAll(["item", "option"])
      .execute();
  },
  dictionary: dic,
  dataSchema: optionWithRelatedSchema,
  table: {
    columnDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dic: OptEquipWithRelatedDic(dic),
    defaultSort: { id: "baseDef", desc: true },
    hiddenColumns: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    tdGenerator: {},
  },
  form: (handleSubmit) => OptEquipWithRelatedForm(dic, handleSubmit),
  card: {
    cardRender: (data, appendCardTypeAndIds) => {
      const [recipeData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("recipe")
          .where("recipe.itemId", "=", itemId)
          .innerJoin("recipe_ingredient", "recipe.id", "recipe_ingredient.recipeId")
          .innerJoin("item", "recipe_ingredient.itemId", "item.id")
          .select([
            "recipe_ingredient.type",
            "recipe_ingredient.count",
            "item.id as itemId",
            "item.itemType as itemType",
            "item.name as itemName",
          ])
          .execute();
      });

      const [dropByData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("drop_item")
          .innerJoin("mob", "drop_item.dropById", "mob.id")
          .where("drop_item.itemId", "=", itemId)
          .select(["mob.id as mobId", "mob.name as mobName"])
          .execute();
      });

      const [rewardItemData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_reward")
          .innerJoin("task", "task_reward.taskId", "task.id")
          .where("task_reward.itemId", "=", itemId)
          .select(["task.id as taskId", "task.name as taskName"])
          .execute();
      });

      const [usedInRecipeData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("recipe_ingredient")
          .innerJoin("recipe", "recipe_ingredient.recipeId", "recipe.id")
          .innerJoin("item", "recipe_ingredient.itemId", "item.id")
          .where("recipe_ingredient.itemId", "=", itemId)
          .select(["item.id as itemId", "item.name as itemName", "item.itemType as itemType"])
          .execute();
      });

      const [usedInTaskData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_collect_require")
          .innerJoin("task", "task_collect_require.taskId", "task.id")
          .where("task_collect_require.itemId", "=", itemId)
          .select(["task.id as taskId", "task.name as taskName"])
          .execute();
      });
      return (
        <>
          <div class="OptionImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<optionWithRelated>({
            data,
            dictionary: OptEquipWithRelatedDic(dic),
            dataSchema: optionWithRelatedSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "baseDef"],
              其他属性: ["modifiers", "details", "dataSources"],
              颜色信息: ["colorA", "colorB", "colorC"],
            },
          })}

          <Show when={recipeData.latest?.length}>
            <CardSection
              title={dic.db.recipe.selfName}
              data={recipeData.latest}
              renderItem={(recipe) => {
                const type = recipe.type;
                switch (type) {
                  case "Gold":
                    return {
                      label: recipe.itemName,
                      onClick: () => null,
                    };

                  case "Item":
                    return {
                      label: recipe.itemName + "(" + recipe.count + ")",
                      onClick: () =>
                        appendCardTypeAndIds((prev) => [
                          ...prev,
                          { type: itemTypeToTableType(recipe.itemType), id: recipe.itemId },
                        ]),
                    };
                  default:
                    return {
                      label: recipe.itemName,
                      onClick: () => null,
                    };
                }
              }}
            />
          </Show>
          <Show when={dropByData.latest?.length}>
            <CardSection
              title={"掉落于" + dic.db.mob.selfName}
              data={dropByData.latest}
              renderItem={(dropBy) => {
                return {
                  label: dropBy.mobName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: dropBy.mobId }]),
                };
              }}
            />
          </Show>
          <Show when={rewardItemData.latest?.length}>
            <CardSection
              title={"可从这些" + dic.db.task.selfName + "获得"}
              data={rewardItemData.latest}
              renderItem={(rewardItem) => {
                return {
                  label: rewardItem.taskName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: rewardItem.taskId }]),
                };
              }}
            />
          </Show>
          <Show when={usedInRecipeData.latest?.length}>
            <CardSection
              title={"是这些" + dic.db.item.selfName + "的原料"}
              data={usedInRecipeData.latest}
              renderItem={(usedIn) => {
                return {
                  label: usedIn.itemName,
                  onClick: () =>
                    appendCardTypeAndIds((prev) => [
                      ...prev,
                      { type: itemTypeToTableType(usedIn.itemType), id: usedIn.itemId },
                    ]),
                };
              }}
            />
          </Show>
          <Show when={usedInTaskData.latest?.length}>
            <CardSection
              title={"被用于" + dic.db.task.selfName}
              data={usedInTaskData.latest}
              renderItem={(usedInTask) => {
                return {
                  label: usedInTask.taskName,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "task", id: usedInTask.taskId }]),
                };
              }}
            />
          </Show>
        </>
      );
    },
  },
});
