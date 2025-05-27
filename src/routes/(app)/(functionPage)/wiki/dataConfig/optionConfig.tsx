import { createResource, createSignal, For, JSX, Show, Index, createEffect, on, Accessor } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import {
  itemSchema,
  optionSchema,
  recipeSchema,
  recipe_ingredientSchema,
  drop_itemSchema,
  task_rewardSchema,
} from "~/../db/zod";
import { DB, item, option, recipe, recipe_ingredient, drop_item, task_reward, mob } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "~/../db/defaultData";
import { createOptEquip, OptEquip } from "~/repositories/optEquip";
import { createItem, findItems, Item } from "~/repositories/item";
import { z } from "zod";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import omit from "lodash-es/omit";
import { ItemSharedCardContent, itemTypeToTableType } from "./utils";
import { createForm, Field } from "@tanstack/solid-form";
import { Input } from "~/components/controls/input";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";
import { Toggle } from "~/components/controls/toggle";
import { Autocomplete } from "~/components/controls/autoComplete";
import { RecipeIngredientType, BossPartBreakRewardType, BossPartType } from "~/../db/kysely/enums";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { createStatistic } from "~/repositories/statistic";
import { VirtualTable } from "~/components/module/virtualTable";

type optionWithRelated = option &
  item & {
    recipe: recipe & {
      recipeEntries: recipe_ingredient[];
    };
    usedInDropItems: drop_item[];
    usedInTaskRewards: task_reward[];
    usedInRecipeEntries: recipe_ingredient[];
  };

const optionWithRelatedSchema = z.object({
  ...itemSchema.shape,
  ...optionSchema.shape,
  recipe: recipeSchema.extend({
    recipeEntries: z.array(recipe_ingredientSchema),
  }),
  usedInDropItems: z.array(drop_itemSchema),
  usedInTaskRewards: z.array(task_rewardSchema),
  usedInRecipeEntries: z.array(recipe_ingredientSchema),
});

const defaultOptEquipWithRelated: optionWithRelated = {
  ...defaultData.item,
  ...defaultData.option,
  recipe: {
    ...defaultData.recipe,
    recipeEntries: [],
  },
  usedInDropItems: [],
  usedInTaskRewards: [],
  usedInRecipeEntries: [],
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
    usedInDropItems: {
      key: dic.db.drop_item.selfName,
      tableFieldDescription: dic.db.drop_item.description,
      formFieldDescription: dic.db.drop_item.description,
    },
    usedInTaskRewards: {
      key: dic.db.task_reward.selfName,
      tableFieldDescription: dic.db.task_reward.description,
      formFieldDescription: dic.db.task_reward.description,
    },
    usedInRecipeEntries: {
      key: dic.db.recipe_ingredient.selfName,
      tableFieldDescription: dic.db.recipe_ingredient.description,
      formFieldDescription: dic.db.recipe_ingredient.description,
    },
  },
});

const OptEquipWithRelatedFetcher = async (id: string) => {
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
      jsonArrayFrom(eb.selectFrom("drop_item").where("drop_item.itemId", "=", id).selectAll("drop_item")).as(
        "usedInDropItems",
      ),
      jsonArrayFrom(eb.selectFrom("task_reward").where("task_reward.itemId", "=", id).selectAll("task_reward")).as(
        "usedInTaskRewards",
      ),
      jsonArrayFrom(
        eb.selectFrom("recipe_ingredient").where("recipe_ingredient.itemId", "=", id).selectAll("recipe_ingredient"),
      ).as("usedInRecipeEntries"),
    ])
    .executeTakeFirstOrThrow();
  return result as unknown as optionWithRelated;
};

const OptEquipsFetcher = async () => {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("option", "option.itemId", "item.id")
    .selectAll(["item", "option"])
    .execute();
};

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
        const usedInDropItemsData = value.usedInDropItems;
        const usedInTaskRewardsData = value.usedInTaskRewards;
        const usedInRecipeEntriesData = value.usedInRecipeEntries;
        const item = await createItem(trx, {
          ...itemData,
          itemType: "Option",
        });
        const option = await createOptEquip(trx, {
          ...optionData,
          itemId: item.id,
        });
        const recipeStatistic = await createStatistic(trx);
        const recipe = await trx
          .insertInto("recipe")
          .values({
            ...recipeData,
            id: createId(),
            itemId: item.id,
            statisticId: recipeStatistic.id,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        const recipeEntries =
          recipeEntriesData.length > 0
            ? await trx
                .insertInto("recipe_ingredient")
                .values(
                  recipeEntriesData.map((entry) => ({
                    ...entry,
                    id: createId(),
                    recipeId: recipe.id,
                  })),
                )
                .returningAll()
                .execute()
            : [];
        const usedInDropItems =
          usedInDropItemsData.length > 0
            ? await trx
                .insertInto("drop_item")
                .values(
                  usedInDropItemsData.map((entry) => ({
                    ...entry,
                    itemId: item.id,
                    id: createId(),
                  })),
                )
                .execute()
            : [];
        const usedInTaskRewards =
          usedInTaskRewardsData.length > 0
            ? await trx
                .insertInto("task_reward")
                .values(
                  usedInTaskRewardsData.map((entry) => ({
                    ...entry,
                    itemId: item.id,
                    id: createId(),
                  })),
                )
                .execute()
            : [];
        const usedInRecipeEntries =
          usedInRecipeEntriesData.length > 0
            ? await trx
                .insertInto("recipe_ingredient")
                .values(
                  usedInRecipeEntriesData.map((entry) => ({
                    ...entry,
                    type: "Item",
                    itemId: item.id,
                    id: createId(),
                  })),
                )
                .execute()
            : [];
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
                              case "createdByAccountId":
                              case "updatedByAccountId":
                              case "statisticId":
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
                                                                selector={(state) => {
                                                                  return state.values.recipe.recipeEntries[
                                                                    recipeEntryIndex
                                                                  ]
                                                                    ? state.values.recipe.recipeEntries[
                                                                        recipeEntryIndex
                                                                      ].type
                                                                    : "Gold";
                                                                }}
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
              case "usedInDropItems":
                return (
                  <form.Field
                    name={`usedInDropItems`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: optionWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(usedInDropItemsField) => (
                      <Input
                        title={"隶属于" + dic.db.drop_item.selfName}
                        description={dic.db.drop_item.description}
                        state={fieldInfo(usedInDropItemsField())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                          <Show when={usedInDropItemsField().state.value.length > 0}>
                            <Index each={usedInDropItemsField().state.value}>
                              {(dropItem, dropItemIndex) => (
                                <form.Subscribe
                                  selector={(state) =>
                                    state.values.usedInDropItems[dropItemIndex]
                                      ? state.values.usedInDropItems[dropItemIndex].dropById
                                      : ""
                                  }
                                >
                                  {(mobId) => {
                                    const [mob, setMob] = createSignal<mob>(defaultData.mob);
                                    createEffect(
                                      on(mobId, async () => {
                                        const db = await getDB();
                                        const mob = await db
                                          .selectFrom("mob")
                                          .where("id", "=", mobId())
                                          .selectAll("mob")
                                          .executeTakeFirst();
                                        mob && setMob(mob);
                                      }),
                                    );
                                    return (
                                      <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                        <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                          <span class="text-accent-color font-bold">
                                            {dic.db.drop_item.selfName + " " + dropItemIndex}
                                          </span>
                                          <Button
                                            onClick={() => {
                                              usedInDropItemsField().removeValue(dropItemIndex);
                                            }}
                                          >
                                            -
                                          </Button>
                                        </div>
                                        <Index each={Object.entries(dropItem())}>
                                          {(dropItemField, index) => {
                                            const fieldKey =
                                              dropItemField()[0] as keyof optionWithRelated["usedInDropItems"][number];
                                            const fieldValue = dropItemField()[1];
                                            switch (fieldKey) {
                                              case "id":
                                              case "itemId":
                                                return null;
                                              case "dropById":
                                                return (
                                                  <form.Field name={`usedInDropItems[${dropItemIndex}].${fieldKey}`}>
                                                    {(subField) => (
                                                      <Input
                                                        title={dic.db.drop_item.fields.dropById.key}
                                                        description={
                                                          dic.db.drop_item.fields.dropById.formFieldDescription
                                                        }
                                                        state={fieldInfo(subField())}
                                                      >
                                                        <Autocomplete
                                                          id={`usedInDropItems[${dropItemIndex}].${fieldKey}`}
                                                          initialValue={{
                                                            id: subField().state.value,
                                                            name: "",
                                                          }}
                                                          setValue={(value) => {
                                                            subField().setValue(value.id);
                                                          }}
                                                          datasFetcher={async () => {
                                                            const db = await getDB();
                                                            const items = await db
                                                              .selectFrom("mob")
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
                                                );

                                              case "breakRewardType":
                                                return (
                                                  <Show when={mob().type === "Boss"}>
                                                    {renderField<drop_item, "breakRewardType">(
                                                      form,
                                                      `usedInDropItems[${dropItemIndex}].breakRewardType`,
                                                      fieldValue as BossPartBreakRewardType,
                                                      dic.db.drop_item,
                                                      drop_itemSchema,
                                                    )}
                                                  </Show>
                                                );
                                              case "relatedPartInfo":
                                                return (
                                                  <form.Subscribe
                                                    selector={(state) =>
                                                      state.values.usedInDropItems[dropItemIndex]
                                                        ? state.values.usedInDropItems[dropItemIndex].breakRewardType
                                                        : "None"
                                                    }
                                                  >
                                                    {(breakRewardType) => {
                                                      return (
                                                        <Show
                                                          when={breakRewardType() !== "None" && mob().type === "Boss"}
                                                        >
                                                          {renderField<drop_item, "relatedPartInfo">(
                                                            form,
                                                            `usedInDropItems[${dropItemIndex}].relatedPartInfo`,
                                                            fieldValue as string,
                                                            dic.db.drop_item,
                                                            drop_itemSchema,
                                                          )}
                                                        </Show>
                                                      );
                                                    }}
                                                  </form.Subscribe>
                                                );
                                              case "relatedPartType":
                                                return (
                                                  <form.Subscribe
                                                    selector={(state) =>
                                                      state.values.usedInDropItems[dropItemIndex]
                                                        ? state.values.usedInDropItems[dropItemIndex].breakRewardType
                                                        : "None"
                                                    }
                                                  >
                                                    {(breakRewardType) => {
                                                      return (
                                                        <Show
                                                          when={breakRewardType() !== "None" && mob().type === "Boss"}
                                                        >
                                                          {renderField<drop_item, "relatedPartType">(
                                                            form,
                                                            `usedInDropItems[${dropItemIndex}].relatedPartType`,
                                                            fieldValue as BossPartType,
                                                            dic.db.drop_item,
                                                            drop_itemSchema,
                                                          )}
                                                        </Show>
                                                      );
                                                    }}
                                                  </form.Subscribe>
                                                );

                                              default:
                                                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                                const simpleFieldKey = `usedInDropItems[${dropItemIndex}].${fieldKey}`;
                                                const simpleFieldValue = fieldValue;
                                                return renderField<drop_item, keyof drop_item>(
                                                  form,
                                                  simpleFieldKey,
                                                  simpleFieldValue,
                                                  dic.db.drop_item,
                                                  drop_itemSchema,
                                                );
                                            }
                                          }}
                                        </Index>
                                      </div>
                                    );
                                  }}
                                </form.Subscribe>
                              )}
                            </Index>
                          </Show>
                          <Button
                            onClick={() => {
                              usedInDropItemsField().pushValue(defaultData.drop_item);
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
              case "usedInTaskRewards":
                return (
                  <form.Field
                    name={`usedInTaskRewards`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: optionWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(usedInTaskRewardsField) => (
                      <Input
                        title={"隶属于" + dic.db.task_reward.selfName}
                        description={dic.db.task_reward.description}
                        state={fieldInfo(usedInTaskRewardsField())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                          <Show when={usedInTaskRewardsField().state.value.length > 0}>
                            <Index each={usedInTaskRewardsField().state.value}>
                              {(taskReward, taskRewardIndex) => (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {dic.db.task_reward.selfName + " " + taskRewardIndex}
                                    </span>
                                    <Button
                                      onClick={() => {
                                        usedInTaskRewardsField().removeValue(taskRewardIndex);
                                      }}
                                    >
                                      -
                                    </Button>
                                  </div>
                                  <Index each={Object.entries(taskReward())}>
                                    {(taskRewardField, index) => {
                                      const fieldKey =
                                        taskRewardField()[0] as keyof optionWithRelated["usedInTaskRewards"][number];
                                      const fieldValue = taskRewardField()[1];
                                      switch (fieldKey) {
                                        case "id":
                                        case "itemId":
                                        case "type":
                                          return null;
                                        case "taskId":
                                          return (
                                            <form.Field
                                              name={`usedInTaskRewards[${taskRewardIndex}].taskId`}
                                              validators={{
                                                onChangeAsyncDebounceMs: 500,
                                                onChangeAsync: task_rewardSchema.shape[fieldKey],
                                              }}
                                            >
                                              {(itemIdField) => (
                                                <Input
                                                  title={dic.db.task_reward.fields[fieldKey].key}
                                                  description={dic.db.task_reward.fields[fieldKey].formFieldDescription}
                                                  state={fieldInfo(itemIdField())}
                                                >
                                                  <Autocomplete
                                                    id={fieldKey + taskRewardIndex}
                                                    initialValue={{ id: "", name: "" }}
                                                    setValue={(value) => {
                                                      itemIdField().setValue(value.id);
                                                    }}
                                                    datasFetcher={async () => {
                                                      const db = await getDB();
                                                      const items = await db
                                                        .selectFrom("task")
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
                                          );

                                        default:
                                          // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                          const simpleFieldKey = `usedInTaskRewards[${taskRewardIndex}].${fieldKey}`;
                                          const simpleFieldValue = fieldValue;
                                          return renderField<task_reward, keyof task_reward>(
                                            form,
                                            simpleFieldKey,
                                            simpleFieldValue,
                                            dic.db.task_reward,
                                            task_rewardSchema,
                                          );
                                      }
                                    }}
                                  </Index>
                                </div>
                              )}
                            </Index>
                          </Show>
                          <Button
                            onClick={() => {
                              usedInTaskRewardsField().pushValue(defaultData.task_reward);
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
              case "usedInRecipeEntries":
                return (
                  <form.Field
                    name={`usedInRecipeEntries`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: optionWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(usedInRecipeEntriesField) => (
                      <Input
                        title={"隶属于" + dic.db.recipe_ingredient.selfName}
                        description={dic.db.recipe_ingredient.description}
                        state={fieldInfo(usedInRecipeEntriesField())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                          <Show when={usedInRecipeEntriesField().state.value.length > 0}>
                            <Index each={usedInRecipeEntriesField().state.value}>
                              {(recipeEntry, recipeEntryIndex) => (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {dic.db.recipe_ingredient.selfName + " " + recipeEntryIndex}
                                    </span>
                                    <Button
                                      onClick={() => {
                                        usedInRecipeEntriesField().removeValue(recipeEntryIndex);
                                      }}
                                    >
                                      -
                                    </Button>
                                  </div>
                                  <Index each={Object.entries(recipeEntry())}>
                                    {(recipeEntryField, index) => {
                                      const fieldKey =
                                        recipeEntryField()[0] as keyof optionWithRelated["usedInRecipeEntries"][number];
                                      const fieldValue = recipeEntryField()[1];
                                      switch (fieldKey) {
                                        case "id":
                                        case "itemId":
                                        case "type":
                                          return null;
                                        case "recipeId":
                                          return (
                                            <form.Field
                                              name={`usedInRecipeEntries[${recipeEntryIndex}].recipeId`}
                                              validators={{
                                                onChangeAsyncDebounceMs: 500,
                                                onChangeAsync: recipe_ingredientSchema.shape[fieldKey],
                                              }}
                                            >
                                              {(itemIdField) => (
                                                <Input
                                                  title={dic.db.recipe_ingredient.fields[fieldKey].key}
                                                  description={
                                                    dic.db.recipe_ingredient.fields[fieldKey].formFieldDescription
                                                  }
                                                  state={fieldInfo(itemIdField())}
                                                >
                                                  <Autocomplete
                                                    id={fieldKey + recipeEntryIndex}
                                                    initialValue={{ id: "", name: "" }}
                                                    setValue={(value) => {
                                                      itemIdField().setValue(value.id);
                                                    }}
                                                    datasFetcher={async () => {
                                                      const db = await getDB();
                                                      const items = await db
                                                        .selectFrom("recipe")
                                                        .innerJoin("item", "recipe.itemId", "item.id")
                                                        .select(["recipe.id", "item.name"])
                                                        
                                                        .execute();
                                                      return items;
                                                    }}
                                                    displayField="name"
                                                    valueField="id"
                                                  />
                                                </Input>
                                              )}
                                            </form.Field>
                                          );

                                        default:
                                          // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                          const simpleFieldKey = `usedInRecipeEntries[${recipeEntryIndex}].${fieldKey}`;
                                          const simpleFieldValue = fieldValue;
                                          return renderField<recipe_ingredient, keyof recipe_ingredient>(
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
                              )}
                            </Index>
                          </Show>
                          <Button
                            onClick={() => {
                              usedInRecipeEntriesField().pushValue(defaultData.recipe_ingredient);
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

const OptEquipTable = (dic: dictionary, filterStr: Accessor<string>, columnHandleClick: (column: string) => void) => {
  return VirtualTable<option & item>({
    dataFetcher: OptEquipsFetcher,
    columnsDef: [
      { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
      { accessorKey: "baseDef", cell: (info: any) => info.getValue(), size: 100 },
    ],
    dictionary: OptEquipWithRelatedDic(dic),
    defaultSort: { id: "baseDef", desc: true },
    hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
    tdGenerator: {},
    globalFilterStr: filterStr,
    columnHandleClick: columnHandleClick,
  });
};

export const OptEquipDataConfig: dataDisplayConfig<optionWithRelated, option & item> = {
  defaultData: defaultOptEquipWithRelated,
  dataFetcher: OptEquipWithRelatedFetcher,
  datasFetcher: OptEquipsFetcher,
  dataSchema: optionWithRelatedSchema,
  table: (dic, filterStr, columnHandleClick) => OptEquipTable(dic, filterStr, columnHandleClick),
  form: (dic, handleSubmit) => OptEquipWithRelatedForm(dic, handleSubmit),
  card: (dic, data, appendCardTypeAndIds) => {
    return (
      <>
        <div class="OptionImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<optionWithRelated>({
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
        {ItemSharedCardContent(data.itemId, dic, appendCardTypeAndIds)}
      </>
    );
  },
};
