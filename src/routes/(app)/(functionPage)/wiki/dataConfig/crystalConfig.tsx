import { Accessor, createEffect, createResource, createSignal, For, Index, JSX, on, Show } from "solid-js";
import { getDB } from "~/repositories/database";
import { dataDisplayConfig } from "./dataConfig";
import { itemSchema, crystalSchema, recipe_ingredientSchema, drop_itemSchema, task_rewardSchema } from "~/../db/zod";
import { DB, item, crystal, recipe_ingredient, drop_item, task_reward, mob } from "~/../db/kysely/kyesely";
import { Dic, dictionary, EnumFieldDetail } from "~/locales/type";
import { ObjRender } from "~/components/module/objRender";
import { defaultData } from "~/../db/defaultData";
import { createCrystal } from "~/repositories/crystal";
import { createItem } from "~/repositories/item";
import { z } from "zod";
import { CardSection } from "~/components/module/cardSection";
import { fieldInfo, renderField } from "../utils";
import pick from "lodash-es/pick";
import { ItemSharedCardContent, itemTypeToTableType } from "./utils";
import { createForm } from "@tanstack/solid-form";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import * as Icon from "~/components/icon";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { createId } from "@paralleldrive/cuid2";
import { CrystalType, BossPartBreakRewardType, BossPartType } from "~/../db/kysely/enums";
import { VirtualTable } from "~/components/module/virtualTable";

type crystalWithRelated = crystal &
  item & {
    front: Array<crystal & item>;
    back: Array<crystal & item>;
    usedInDropItems: drop_item[];
    usedInTaskRewards: task_reward[];
    usedInRecipeEntries: recipe_ingredient[];
  };

const crystalWithRelatedSchema = z.object({
  ...itemSchema.shape,
  ...crystalSchema.shape,
  front: z.array(crystalSchema.extend(itemSchema.shape)),
  back: z.array(crystalSchema.extend(itemSchema.shape)),
  usedInDropItems: z.array(drop_itemSchema),
  usedInTaskRewards: z.array(task_rewardSchema),
  usedInRecipeEntries: z.array(recipe_ingredientSchema),
});

const defaultCrystalWithRelated: crystalWithRelated = {
  ...defaultData.item,
  ...defaultData.crystal,
  front: [],
  back: [],
  usedInDropItems: [],
  usedInTaskRewards: [],
  usedInRecipeEntries: [],
};

const CrystalWithRelatedWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.crystal,
  fields: {
    ...dic.db.crystal.fields,
    ...dic.db.item.fields,
    front: {
      key: "front",
      tableFieldDescription: dic.db.item.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.item.fields.name.formFieldDescription,
    },
    back: {
      key: "back",
      tableFieldDescription: dic.db.item.fields.name.tableFieldDescription,
      formFieldDescription: dic.db.item.fields.name.formFieldDescription,
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

const CrystalWithRelatedFetcher = async (id: string) => {
  const db = await getDB();
  const result = await db
    .selectFrom("item")
    .where("id", "=", id)
    .innerJoin("crystal", "crystal.itemId", "item.id")
    .selectAll(["item", "crystal"])
    .select((eb) => [
      jsonArrayFrom(
        eb.selectFrom("_frontRelation").whereRef("_frontRelation.A", "=", "item.id").selectAll(["crystal", "item"]),
      ).as("front"),
      jsonArrayFrom(
        eb
          .selectFrom("_backRelation")
          .whereRef("_backRelation.A", "=", "crystal.itemId")
          .selectAll(["crystal", "item"]),
      ).as("back"),
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

  return result;
};

const CrystalsFetcher = async () => {
  const db = await getDB();
  const result = await db
    .selectFrom("item")
    .innerJoin("crystal", "crystal.itemId", "item.id")
    .selectAll(["item", "crystal"])
    .execute();

  return result;
};

const CrystalWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultCrystalWithRelated,
    onSubmit: async ({ value }) => {
      console.log("value:", value);
      const db = await getDB();
      const { front, back, ...rest } = value;
      const crystal = await db.transaction().execute(async (trx) => {
        const itemData = pick(rest, Object.keys(defaultData.item) as (keyof item)[]);
        const crystalData = pick(rest, Object.keys(defaultData.crystal) as (keyof crystal)[]);
        const usedInDropItemsData = value.usedInDropItems;
        const usedInTaskRewardsData = value.usedInTaskRewards;
        const usedInRecipeEntriesData = value.usedInRecipeEntries;
        const item = await createItem(trx, {
          ...itemData,
          id: createId(),
          itemType: "Crystal",
        });
        const crystal = await createCrystal(trx, {
          ...crystalData,
          itemId: item.id,
        });
        for (const frontCrystal of front) {
          await trx
            .insertInto("_frontRelation")
            .values({
              A: frontCrystal.itemId,
              B: item.id,
            })
            .execute();
          await trx
            .insertInto("_backRelation")
            .values({
              A: item.id,
              B: frontCrystal.itemId,
            })
            .execute();
        }
        for (const backCrystal of back) {
          await trx
            .insertInto("_backRelation")
            .values({
              A: backCrystal.itemId,
              B: item.id,
            })
            .execute();
          await trx
            .insertInto("_frontRelation")
            .values({
              A: item.id,
              B: backCrystal.itemId,
            })
            .execute();
        }
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

        return crystal;
      });
      handleSubmit("crystal", crystal.itemId);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.crystal.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultCrystalWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof crystalWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "itemId":
              case "itemType":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "type":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.crystal.fields[fieldKey].key}
                        description={dic.db.crystal.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Select
                          value={field().state.value}
                          setValue={(value) => field().setValue(value as CrystalType)}
                          options={Object.entries(dic.db.crystal.fields.type.enumMap).map(([key, value]) => ({
                            label: value,
                            value: key,
                          }))}
                        />
                      </Input>
                    )}
                  </form.Field>
                );
              case "front":
              case "back":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => {
                      return (
                        <Input
                          title={(fieldKey === "front" ? "前置" : "后置") + dic.db.crystal.selfName}
                          description={dic.db.crystal.description}
                          state={fieldInfo(field())}
                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                        >
                          <div class="ArrayBox flex w-full flex-col gap-2">
                            <Index each={field().state.value}>
                              {(item, index) => {
                                return (
                                  <div class="Filed flex items-center gap-2">
                                    <label for={fieldKey + index} class="flex-1">
                                      <Autocomplete
                                        id={fieldKey + index}
                                        initialValue={item()}
                                        setValue={(value) => {
                                          field().setValue((pre) => {
                                            const newArray = [...pre];
                                            newArray[index] = value;
                                            return newArray as Array<crystal & item>;
                                          });
                                        }}
                                        datasFetcher={async () => {
                                          const db = await getDB();
                                          const crystals = await db
                                            .selectFrom("crystal")
                                            .innerJoin("item", "crystal.itemId", "item.id")
                                            .selectAll(["crystal", "item"])
                                            
                                            .execute();
                                          return crystals;
                                        }}
                                        displayField="name"
                                        valueField="id"
                                      />
                                    </label>
                                    <Button
                                      onClick={(e) => {
                                        field().removeValue(index);
                                        e.stopPropagation();
                                      }}
                                    >
                                      -
                                    </Button>
                                  </div>
                                );
                              }}
                            </Index>
                            <Button
                              onClick={(e) => {
                                field().pushValue({
                                  ...defaultData.crystal,
                                  ...defaultData.item,
                                });
                              }}
                              class="w-full"
                            >
                              +
                            </Button>
                          </div>
                        </Input>
                      );
                    }}
                  </form.Field>
                );
              case "usedInDropItems":
                return (
                  <form.Field
                    name={`usedInDropItems`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
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
                                              dropItemField()[0] as keyof crystalWithRelated["usedInDropItems"][number];
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
              case "usedInRecipeEntries":
                return (
                  <form.Field
                    name={`usedInRecipeEntries`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
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
                                        recipeEntryField()[0] as keyof crystalWithRelated["usedInRecipeEntries"][number];
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
              case "usedInTaskRewards":
                return (
                  <form.Field
                    name={`usedInTaskRewards`}
                    mode="array"
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: crystalWithRelatedSchema.shape[fieldKey],
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
                                        taskRewardField()[0] as keyof crystalWithRelated["usedInTaskRewards"][number];
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

              default:
                return renderField<crystalWithRelated, keyof crystalWithRelated>(
                  form,
                  fieldKey,
                  fieldValue,
                  CrystalWithRelatedWithRelatedDic(dic),
                  crystalWithRelatedSchema,
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

const CrystalTable = (dic: dictionary, filterStr: Accessor<string>, columnHandleClick: (id: string) => void) => {
  return VirtualTable<crystal & item>({
    dataFetcher: CrystalsFetcher,
      measure: {
        estimateSize: 168,
      },
      columnsDef: [
        { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "name", cell: (info: any) => info.getValue(), size: 150 },
        { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "modifiers", cell: (info: any) => info.getValue(), size: 480 },
        { accessorKey: "type", cell: (info: any) => info.getValue(), size: 100 },
        { accessorKey: "details", cell: (info: any) => info.getValue(), size: 150 },
      ],
      dictionary: CrystalWithRelatedWithRelatedDic(dic),
      defaultSort: { id: "name", desc: true },
      hiddenColumnDef: ["id", "itemId", "createdByAccountId", "updatedByAccountId", "statisticId"],
      tdGenerator: {
        modifiers: (props) => (
          <div class="ModifierBox bg-area-color flex flex-col gap-1 rounded-r-md">
            <For each={props.cell.getValue<string[]>()}>
              {(modifier) => {
                return <div class="w-full p-1">{modifier}</div>;
              }}
            </For>
          </div>
        ),
      },
      globalFilterStr: filterStr,
      columnHandleClick: columnHandleClick,
    },
  );
};

export const CrystalDataConfig: dataDisplayConfig<crystalWithRelated, crystal & item> ={
  defaultData: defaultCrystalWithRelated,
  dataFetcher: CrystalWithRelatedFetcher,
  datasFetcher: CrystalsFetcher,
  dataSchema: crystalWithRelatedSchema,
  table: (dic, filterStr, columnHandleClick) => CrystalTable(dic, filterStr, columnHandleClick),
  form: (dic, handleSubmit) => CrystalWithRelatedForm(dic, handleSubmit),
  card: (dic, data, appendCardTypeAndIds) => {
      const [frontData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("_frontRelation")
          .innerJoin("item", "_frontRelation.A", "item.id")
          .where("_frontRelation.B", "=", itemId)
          .selectAll(["item"])
          .execute();
      });

      const [backData] = createResource(data.id, async (itemId) => {
        const db = await getDB();
        return await db
          .selectFrom("_backRelation")
          .innerJoin("item", "_backRelation.A", "item.id")
          .where("_backRelation.B", "=", itemId)
          .selectAll(["item"])
          .execute();
      });

      return (
        <>
          <div class="CrystalImage bg-area-color h-[18vh] w-full rounded"></div>
          {ObjRender<crystalWithRelated>({
            data,
            dictionary: CrystalWithRelatedWithRelatedDic(dic),
            dataSchema: crystalWithRelatedSchema,
            hiddenFields: ["itemId"],
            fieldGroupMap: {
              基本信息: ["name", "modifiers", "type"],
              其他属性: ["details", "dataSources"],
            },
          })}
          <Show when={frontData.latest?.length}>
            <CardSection
              title={"前置" + dic.db.crystal.selfName}
              data={frontData.latest}
              renderItem={(front) => {
                return {
                  label: front.name,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "crystal", id: front.id }]),
                };
              }}
            />
          </Show>
          <Show when={backData.latest?.length}>
            <CardSection
              title={"后置" + dic.db.crystal.selfName}
              data={backData.latest}
              renderItem={(back) => {
                return {
                  label: back.name,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "crystal", id: back.id }]),
                };
              }}
            />
          </Show>
          {ItemSharedCardContent(data.id, dic, appendCardTypeAndIds)}
        </>
      );
  },
};
