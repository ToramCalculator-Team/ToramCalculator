import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Index,
  JSX,
  on,
  onMount,
  Setter,
  Show,
} from "solid-js";
import { BossPartBreakRewardType, BossPartType, ItemType, RecipeIngredientType } from "~/../db/kysely/enums";
import {
  DB,
  drop_item,
  item,
  mob,
  recipe,
  recipe_ingredient,
  task,
  task_collect_require,
  task_reward,
} from "~/../db/kysely/kyesely";
import { CardSection } from "~/components/module/cardSection";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { setWikiStore } from "../store";
import { ExpressionBuilder, Transaction } from "kysely";
import { createStatistic } from "~/repositories/statistic";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import {
  drop_itemSchema,
  itemSchema,
  recipe_ingredientSchema,
  recipeSchema,
  task_collect_requireSchema,
  task_rewardSchema,
} from "~/../db/zod/index";
import { z } from "zod";
import { defaultData } from "../../../../../../db/defaultData";
import { Input } from "~/components/controls/input";
import { AnyFieldApi, AnyFormApi, createForm, FormApi, SolidFormApi } from "@tanstack/solid-form";
import { fieldInfo, renderField } from "../utils";
import { Button } from "~/components/controls/button";
import { Toggle } from "~/components/controls/toggle";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Select } from "~/components/controls/select";
import { pick } from "lodash-es";
import { arrayDiff } from "./utils";

/**
 * item卡片数据类型
 */
export type ItemWithRelated = item & {
  recipe: recipe & {
    recipeEntries: recipe_ingredient[];
  };
  usedInDropItems: drop_item[];
  usedInTaskRewards: task_reward[];
  usedInRecipeEntries: recipe_ingredient[];
  usedInTaskCollectRequires: task_collect_require[];
};

/**
 * 用于校验表单,因此省略其中的关系对象数据
 * @returns
 */
export const itemWithRelatedSchema = z.object({
  ...itemSchema.shape,
  recipe: recipeSchema.extend({
    recipeEntries: z.array(recipe_ingredientSchema),
  }),
  usedInDropItems: z.array(drop_itemSchema),
  usedInTaskRewards: z.array(task_rewardSchema),
  usedInRecipeEntries: z.array(recipe_ingredientSchema),
  usedInTaskCollectRequires: z.array(task_collect_requireSchema),
});

/**
 * 用于表单默认值
 */
export const defaultItemWithRelated: ItemWithRelated = {
  ...defaultData.item,
  recipe: {
    ...defaultData.recipe,
    recipeEntries: [],
  },
  usedInDropItems: [],
  usedInTaskRewards: [],
  usedInRecipeEntries: [],
  usedInTaskCollectRequires: [],
};

/**
 * 表单和卡片的UI字典
 */
export const itemWithRelatedDic = (dic: dictionary) => ({
  ...dic.db.item,
  fields: {
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
    usedInTaskCollectRequires: {
      key: dic.db.task_collect_require.selfName,
      tableFieldDescription: dic.db.task_collect_require.description,
      formFieldDescription: dic.db.task_collect_require.description,
    },
  },
});

/**
 * 用于获取表单数据
 * @returns
 */
export const itemWithRelatedFetcher = async <T extends DB[keyof DB]>(id: string, tableType: item["itemType"]) => {
  const db = await getDB();
  const item = await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
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
                .whereRef("recipe_ingredient.recipeId", "=", "recipe.id")
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
      jsonArrayFrom(
        eb
          .selectFrom("task_collect_require")
          .where("task_collect_require.itemId", "=", id)
          .selectAll("task_collect_require"),
      ).as("usedInTaskCollectRequires"),
    ])
    .executeTakeFirstOrThrow();
  const subData = (await db
    .selectFrom(itemTypeToTableType(tableType))
    .where("itemId", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow()) as T;
  return {
    ...item,
    ...subData,
  };
};

/**
 * 用于将itemType转换为数据库表类型
 */
const itemSubTable = ["weapon", "armor", "option", "special", "crystal", "consumable", "material"] as const;
type itemSubTableType = (typeof itemSubTable)[number];
export const itemTypeToTableType = (itemType: ItemType) => {
  const tableType: itemSubTableType = (
    {
      Weapon: "weapon",
      Armor: "armor",
      Option: "option",
      Special: "special",
      Crystal: "crystal",
      Consumable: "consumable",
      Material: "material",
    } satisfies Record<ItemType, itemSubTableType>
  )[itemType];
  return tableType;
};

export const createItem = async (trx: Transaction<DB>, value: item) => {
  const statistic = await createStatistic(trx);
  const item = await trx
    .insertInto("item")
    .values({
      ...value,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return item;
};

export const updateItem = async (trx: Transaction<DB>, value: item) => {
  const item = await trx
    .updateTable("item")
    .set({
      ...value,
      updatedByAccountId: store.session.user.account?.id,
    })
    .where("id", "=", value.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return item;
};

export const deleteItem = async (trx: Transaction<DB>, id: string) => {
  const item = await trx.selectFrom("item").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  // 重置掉落物
  await trx
    .updateTable("drop_item")
    .set({
      itemId: `default${item.itemType}ItemId`,
    })
    .where("itemId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置任务收集需求
  await trx
    .updateTable("task_collect_require")
    .set({
      itemId: `default${item.itemType}ItemId`,
    })
    .where("itemId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置任务奖励
  await trx
    .updateTable("task_reward")
    .set({
      itemId: `default${item.itemType}ItemId`,
    })
    .where("itemId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置玩家自定义武器
  await trx
    .updateTable("player_weapon")
    .set({
      templateId: `default${item.itemType}ItemId`,
    })
    .where("templateId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置玩家自定义防具
  await trx
    .updateTable("player_armor")
    .set({
      templateId: `default${item.itemType}ItemId`,
    })
    .where("templateId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置玩家自定义追加
  await trx
    .updateTable("player_option")
    .set({
      templateId: `default${item.itemType}ItemId`,
    })
    .where("templateId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置玩家自定义特殊装备
  await trx
    .updateTable("player_special")
    .set({
      templateId: `default${item.itemType}ItemId`,
    })
    .where("templateId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 重置所属配方项
  await trx
    .updateTable("recipe_ingredient")
    .set({
      itemId: `default${item.itemType}ItemId`,
    })
    .where("itemId", "=", item.id)
    .executeTakeFirstOrThrow();
  // 删除道具
  await trx.deleteFrom("item").where("id", "=", item.id).executeTakeFirstOrThrow();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", item.statisticId).executeTakeFirstOrThrow();
};

// export const itemForm = <S extends Record<string, any>>(
//   dic: dictionary,
//   oldItem: ItemWithRelated,
//   oldSubObj: S,
//   subObjSubmitor: (subObj: S) => Promise<void>,
// ) => {
//   const [recipeIsLimit, setRecipeIsLimit] = createSignal(false);
//   const formInitialValues = oldItem;
//   const form = createForm(() => ({
//     defaultValues: formInitialValues,
//     onSubmit: async ({ value: newItem }) => {
//       console.log("oldItem", oldItem, "newItem", newItem);
//       const db = await getDB();
//       await db.transaction().execute(async (trx) => {
//         const itemData = pick(newItem, Object.keys(defaultData.item) as (keyof item)[]);
//         let item: item;
//         if (oldItem) {
//           // 更新
//           item = await updateItem(trx, itemData);
//         } else {
//           // 新增
//           item = await createItem(trx, newItem);
//         }

//         // 关系项更新
//         const oldRecipe = oldItem?.recipe;
//         const oldUsedInDropItems = oldItem?.usedInDropItems ?? [];
//         const oldUsedInTaskRewards = oldItem?.usedInTaskRewards ?? [];
//         const oldUsedInRecipeEntries = oldItem?.usedInRecipeEntries ?? [];
//         const {
//           recipe: newRecipe,
//           usedInDropItems: newUsedInDropItems,
//           usedInTaskRewards: newUsedInTaskRewards,
//           usedInRecipeEntries: newUsedInRecipeEntries,
//           ...rest
//         } = newItem;

//         // 处理配方
//         const { recipeEntries, ...restRecipe } = newRecipe;
//         let recipe: recipe;

//         // 处理配方项更新
//         const handleRecipeEntriesUpdate = async (
//           recipeId: string,
//           oldEntries: recipe_ingredient[],
//           newEntries: recipe_ingredient[],
//         ) => {
//           const entriesToRemove = oldEntries.filter((item) => !newEntries.some((i) => i.id === item.id));
//           const entriesToAdd = newEntries.filter((item) => !oldEntries.some((i) => i.id === item.id));

//           // 批量删除旧配方项
//           if (entriesToRemove.length > 0) {
//             await trx
//               .deleteFrom("recipe_ingredient")
//               .where(
//                 "id",
//                 "in",
//                 entriesToRemove.map((e) => e.id),
//               )
//               .execute();
//           }

//           // 批量添加新配方项
//           if (entriesToAdd.length > 0) {
//             await trx
//               .insertInto("recipe_ingredient")
//               .values(
//                 entriesToAdd.map((entry) => ({
//                   ...entry,
//                   id: createId(),
//                   recipeId,
//                 })),
//               )
//               .execute();
//           }
//         };

//         // 处理配方更新
//         const handleRecipeUpdate = async (existingRecipe: recipe & { recipeEntries: recipe_ingredient[] }) => {
//           if (recipeEntries.length > 0) {
//             // 更新配方主体
//             recipe = await trx
//               .updateTable("recipe")
//               .set(restRecipe)
//               .where("itemId", "=", item.id)
//               .returningAll()
//               .executeTakeFirstOrThrow();

//             // 更新配方项
//             await handleRecipeEntriesUpdate(recipe.id, existingRecipe.recipeEntries, recipeEntries);
//           } else {
//             // 删除整个配方
//             await Promise.all([
//               trx.deleteFrom("recipe").where("itemId", "=", item.id).execute(),
//               trx.deleteFrom("recipe_ingredient").where("recipeId", "=", existingRecipe.id).execute(),
//             ]);
//           }
//         };

//         // 处理配方创建
//         const handleRecipeCreation = async () => {
//           const statistic = await createStatistic(trx);
//           recipe = await trx
//             .insertInto("recipe")
//             .values({
//               ...restRecipe,
//               id: createId(),
//               itemId: item.id,
//               statisticId: statistic.id,
//               createdByAccountId: store.session.user.account?.id,
//               updatedByAccountId: store.session.user.account?.id,
//             })
//             .returningAll()
//             .executeTakeFirstOrThrow();

//           // 批量添加配方项
//           if (recipeEntries.length > 0) {
//             await trx
//               .insertInto("recipe_ingredient")
//               .values(
//                 recipeEntries.map((entry) => ({
//                   ...entry,
//                   id: createId(),
//                   recipeId: recipe.id,
//                 })),
//               )
//               .execute();
//           }
//         };

//         try {
//           if (oldRecipe) {
//             await handleRecipeUpdate(oldRecipe);
//           } else {
//             await handleRecipeCreation();
//           }
//         } catch (error) {
//           console.error("Error handling recipe:", error);
//           throw new Error("Failed to process recipe");
//         }

//         // 更新一对多关系

//         // 更新掉落物
//         const usedInDropItemsToRemove = oldUsedInDropItems.filter(
//           (item) => !newUsedInDropItems.some((i) => i.id === item.id),
//         );
//         const usedInDropItemsToAdd = newUsedInDropItems.filter(
//           (item) => !oldUsedInDropItems.some((i) => i.id === item.id),
//         );

//         // 处理需要移除的掉落物
//         for (const dropItem of usedInDropItemsToRemove) {
//           await trx.deleteFrom("drop_item").where("id", "=", dropItem.id).executeTakeFirstOrThrow();
//         }
//         // 处理需要新增的掉落物
//         for (const dropItem of usedInDropItemsToAdd) {
//           await trx
//             .insertInto("drop_item")
//             .values({
//               ...dropItem,
//               id: createId(),
//               itemId: item.id,
//             })
//             .executeTakeFirstOrThrow();
//         }

//         // 更新任务奖励
//         const usedInTaskRewardsToRemove = oldUsedInTaskRewards.filter(
//           (item) => !newUsedInTaskRewards.some((i) => i.id === item.id),
//         );
//         const usedInTaskRewardsToAdd = newUsedInTaskRewards.filter(
//           (item) => !oldUsedInTaskRewards.some((i) => i.id === item.id),
//         );
//         // 处理需要移除的任务奖励
//         for (const taskReward of usedInTaskRewardsToRemove) {
//           await trx.deleteFrom("task_reward").where("id", "=", taskReward.id).executeTakeFirstOrThrow();
//         }
//         // 处理需要新增的任务奖励
//         for (const taskReward of usedInTaskRewardsToAdd) {
//           await trx
//             .insertInto("task_reward")
//             .values({
//               ...taskReward,
//               id: createId(),
//               itemId: item.id,
//             })
//             .executeTakeFirstOrThrow();
//         }

//         // 更新道具隶属的配方项
//         const usedInRecipeEntriesToRemove = oldUsedInRecipeEntries.filter(
//           (item) => !newUsedInRecipeEntries.some((i) => i.id === item.id),
//         );
//         const usedInRecipeEntriesToAdd = newUsedInRecipeEntries.filter(
//           (item) => !oldUsedInRecipeEntries.some((i) => i.id === item.id),
//         );
//         // 处理需要移除的配方项
//         for (const usedInRecipeEntry of usedInRecipeEntriesToRemove) {
//           await trx.deleteFrom("recipe_ingredient").where("id", "=", usedInRecipeEntry.id).executeTakeFirstOrThrow();
//         }
//         // 处理需要新增的配方项
//         for (const usedInRecipeEntry of usedInRecipeEntriesToAdd) {
//           await trx
//             .insertInto("recipe_ingredient")
//             .values({
//               ...usedInRecipeEntry,
//               id: createId(),
//               type: "Item",
//               recipeId: newRecipe.id,
//             })
//             .executeTakeFirstOrThrow();
//         }
//         console.log("已处理item：", item);
//         await subObjSubmitor(oldSubObj);
//       });
//     },
//   }));

//   onMount(() => {
//     console.log(form.state.values);
//   });

//   return (
//     <>
//       <For each={Object.entries(oldItem ?? defaultItemWithRelated)}>
//         {(field, index) => {
//           const fieldKey = field[0] as keyof ItemWithRelated;
//           const fieldValue = field[1];
//           switch (fieldKey) {
//             case "id":
//             case "itemType":
//             case "createdByAccountId":
//             case "updatedByAccountId":
//             case "statisticId":
//               return null;
//             case "recipe":
//               return (
//                 <form.Field
//                   name={`recipe`}
//                   validators={{
//                     onChangeAsyncDebounceMs: 500,
//                     onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
//                   }}
//                 >
//                   {(recipeField) => {
//                     const recipeData = recipeField().state.value ?? {
//                       ...defaultData.recipe,
//                       recipeEntries: [],
//                     };
//                     console.log("recipeField", recipeField().state.value);
//                     return (
//                       <Input
//                         title={dic.db.recipe.selfName}
//                         description={dic.db.recipe.description}
//                         state={fieldInfo(recipeField())}
//                         class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                       >
//                         <Index each={Object.entries(recipeData)}>
//                           {(recipeField, recipeFieldIndex) => {
//                             const recipeFieldKey = recipeField()[0] as keyof ItemWithRelated["recipe"];
//                             const recipeFieldValue = recipeField()[1];
//                             switch (recipeFieldKey) {
//                               case "id":
//                               case "itemId":
//                               case "createdByAccountId":
//                               case "updatedByAccountId":
//                               case "statisticId":
//                                 return null;
//                               case "activityId":
//                                 return (
//                                   <form.Field
//                                     name={`recipe.${recipeFieldKey}`}
//                                     validators={{
//                                       onChangeAsyncDebounceMs: 500,
//                                       onChangeAsync: recipeSchema.shape[recipeFieldKey],
//                                     }}
//                                   >
//                                     {(activityIdField) => (
//                                       <>
//                                         <Input
//                                           title={"活动配方标记"}
//                                           description={"仅在某个活动开启时可使用的配方"}
//                                           state={undefined}
//                                           class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                                         >
//                                           <Toggle
//                                             id={"isLimit"}
//                                             onClick={() => setRecipeIsLimit(!recipeIsLimit())}
//                                             onBlur={undefined}
//                                             name={"isLimit"}
//                                             checked={recipeIsLimit()}
//                                           />
//                                         </Input>
//                                         <Show when={recipeIsLimit()}>
//                                           <Input
//                                             title={dic.db.activity.selfName}
//                                             description={dic.db.activity.description}
//                                             state={fieldInfo(activityIdField())}
//                                             class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                                           >
//                                             <Autocomplete
//                                               id={activityIdField().name + "activityId"}
//                                               initialValue={activityIdField().state.value ?? defaultData.activity.id}
//                                               setValue={(value) => activityIdField().setValue(value.id)}
//                                               datasFetcher={async () => {
//                                                 const db = await getDB();
//                                                 const activities = await db
//                                                   .selectFrom("activity")
//                                                   .selectAll("activity")
//                                                   .execute();
//                                                 return activities;
//                                               }}
//                                               displayField="name"
//                                               valueField="id"
//                                             />
//                                           </Input>
//                                         </Show>
//                                       </>
//                                     )}
//                                   </form.Field>
//                                 );
//                               case "recipeEntries":
//                                 return (
//                                   <form.Field name={`recipe.recipeEntries`} mode="array">
//                                     {(recipeEntries) => {
//                                       const recipeEntriesData = recipeEntries().state.value ?? [];
//                                       return (
//                                         <Input
//                                           title={dic.db.recipe_ingredient.selfName}
//                                           description={dic.db.recipe_ingredient.description}
//                                           state={fieldInfo(recipeEntries())}
//                                           class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                                         >
//                                           <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
//                                             <Index each={recipeEntriesData}>
//                                               {(recipeEntry, recipeEntryIndex) => {
//                                                 const recipeEntryData = recipeEntry() ?? {
//                                                   ...defaultData.recipe_ingredient,
//                                                 };
//                                                 return (
//                                                   <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
//                                                     <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
//                                                       <span class="text-accent-color font-bold">
//                                                         {dic.db.recipe_ingredient.selfName + " " + recipeEntryIndex}
//                                                       </span>
//                                                       <Button
//                                                         onClick={() => {
//                                                           recipeEntries().removeValue(recipeEntryIndex);
//                                                         }}
//                                                       >
//                                                         -
//                                                       </Button>
//                                                     </div>
//                                                     <Index each={Object.entries(recipeEntryData)}>
//                                                       {(recipeEntryField, recipeEntryFieldIndex) => {
//                                                         const recipeEntryFieldKey =
//                                                           recipeEntryField()[0] as keyof ItemWithRelated["recipe"]["recipeEntries"][number];
//                                                         const recipeEntryFieldValue = recipeEntryField()[1];
//                                                         switch (recipeEntryFieldKey) {
//                                                           case "id":
//                                                           case "recipeId":
//                                                             return null;
//                                                           case "type":
//                                                             return (
//                                                               <form.Field
//                                                                 name={`recipe.recipeEntries[${recipeEntryIndex}].${recipeEntryFieldKey}`}
//                                                                 validators={{
//                                                                   onChangeAsyncDebounceMs: 500,
//                                                                   onChangeAsync:
//                                                                     recipe_ingredientSchema.shape[recipeEntryFieldKey],
//                                                                 }}
//                                                               >
//                                                                 {(field) => (
//                                                                   <Input
//                                                                     title={
//                                                                       dic.db.recipe_ingredient.fields[
//                                                                         recipeEntryFieldKey
//                                                                       ].key
//                                                                     }
//                                                                     description={
//                                                                       dic.db.recipe_ingredient.fields[
//                                                                         recipeEntryFieldKey
//                                                                       ].formFieldDescription
//                                                                     }
//                                                                     state={fieldInfo(field())}
//                                                                   >
//                                                                     <Select
//                                                                       value={field().state.value}
//                                                                       setValue={(value) =>
//                                                                         field().setValue(value as RecipeIngredientType)
//                                                                       }
//                                                                       options={Object.entries(
//                                                                         dic.db.recipe_ingredient.fields.type.enumMap,
//                                                                       ).map(([key, value]) => ({
//                                                                         label: value,
//                                                                         value: key,
//                                                                       }))}
//                                                                     />
//                                                                   </Input>
//                                                                 )}
//                                                               </form.Field>
//                                                             );
//                                                           case "itemId":
//                                                             return (
//                                                               <form.Subscribe
//                                                                 selector={(state) =>
//                                                                   state.values.recipe.recipeEntries[recipeEntryIndex]
//                                                                     ? state.values.recipe.recipeEntries[
//                                                                         recipeEntryIndex
//                                                                       ].type
//                                                                     : "Magic"
//                                                                 }
//                                                               >
//                                                                 {(type) => (
//                                                                   <Show when={type() === "Item"}>
//                                                                     <form.Field
//                                                                       name={`recipe.recipeEntries[${recipeEntryIndex}].itemId`}
//                                                                       validators={{
//                                                                         onChangeAsyncDebounceMs: 500,
//                                                                         onChangeAsync:
//                                                                           recipe_ingredientSchema.shape[
//                                                                             recipeEntryFieldKey
//                                                                           ],
//                                                                       }}
//                                                                     >
//                                                                       {(itemIdField) => (
//                                                                         <Input
//                                                                           title={
//                                                                             dic.db.recipe_ingredient.fields[
//                                                                               recipeEntryFieldKey
//                                                                             ].key
//                                                                           }
//                                                                           description={
//                                                                             dic.db.recipe_ingredient.fields[
//                                                                               recipeEntryFieldKey
//                                                                             ].formFieldDescription
//                                                                           }
//                                                                           state={fieldInfo(itemIdField())}
//                                                                         >
//                                                                           <Autocomplete
//                                                                             id={recipeEntryFieldKey + recipeEntryIndex}
//                                                                             initialValue={
//                                                                               itemIdField().state.value ?? ""
//                                                                             }
//                                                                             setValue={(value) =>
//                                                                               itemIdField().setValue(value.id)
//                                                                             }
//                                                                             datasFetcher={async () => {
//                                                                               const db = await getDB();
//                                                                               const items = await db
//                                                                                 .selectFrom("item")
//                                                                                 .selectAll()
//                                                                                 .execute();
//                                                                               return items;
//                                                                             }}
//                                                                             displayField="name"
//                                                                             valueField="id"
//                                                                           />
//                                                                         </Input>
//                                                                       )}
//                                                                     </form.Field>
//                                                                   </Show>
//                                                                 )}
//                                                               </form.Subscribe>
//                                                             );
//                                                           default:
//                                                             // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                                             const simpleFieldKey = `recipe.recipeEntries[${recipeEntryIndex}].${recipeEntryFieldKey}`;
//                                                             const simpleFieldValue = recipeEntryFieldValue;
//                                                             return renderField<
//                                                               recipe_ingredient,
//                                                               keyof recipe_ingredient
//                                                             >(
//                                                               form,
//                                                               simpleFieldKey,
//                                                               simpleFieldValue,
//                                                               dic.db.recipe_ingredient,
//                                                               recipe_ingredientSchema,
//                                                             );
//                                                         }
//                                                       }}
//                                                     </Index>
//                                                   </div>
//                                                 );
//                                               }}
//                                             </Index>

//                                             <Button
//                                               onClick={() => {
//                                                 recipeEntries().pushValue({
//                                                   ...defaultData.recipe_ingredient,
//                                                 });
//                                               }}
//                                               class="w-full"
//                                             >
//                                               +
//                                             </Button>
//                                           </div>
//                                         </Input>
//                                       );
//                                     }}
//                                   </form.Field>
//                                 );
//                               default:
//                                 // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                 const simpleFieldKey = `recipe.${recipeFieldKey}`;
//                                 const simpleFieldValue = recipeFieldValue;
//                                 return renderField<ItemWithRelated["recipe"], keyof ItemWithRelated["recipe"]>(
//                                   form,
//                                   simpleFieldKey,
//                                   simpleFieldValue,
//                                   itemWithRelatedDic(dic).fields.recipe,
//                                   recipeSchema,
//                                 );
//                             }
//                           }}
//                         </Index>
//                       </Input>
//                     );
//                   }}
//                 </form.Field>
//               );
//             case "usedInDropItems":
//               return (
//                 <form.Field
//                   name={`usedInDropItems`}
//                   mode="array"
//                   validators={{
//                     onChangeAsyncDebounceMs: 500,
//                     onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
//                   }}
//                 >
//                   {(usedInDropItemsField) => (
//                     <Input
//                       title={"隶属于" + dic.db.drop_item.selfName}
//                       description={dic.db.drop_item.description}
//                       state={fieldInfo(usedInDropItemsField())}
//                       class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                     >
//                       <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
//                         <Show when={usedInDropItemsField().state.value.length > 0}>
//                           <Index each={usedInDropItemsField().state.value}>
//                             {(dropItem, dropItemIndex) => (
//                               <form.Subscribe
//                                 selector={(state) =>
//                                   state.values.usedInDropItems[dropItemIndex]
//                                     ? state.values.usedInDropItems[dropItemIndex].dropById
//                                     : ""
//                                 }
//                               >
//                                 {(mobId) => {
//                                   const [mob, setMob] = createSignal<mob>(defaultData.mob);
//                                   createEffect(
//                                     on(mobId, async () => {
//                                       const db = await getDB();
//                                       const mob = await db
//                                         .selectFrom("mob")
//                                         .where("id", "=", mobId())
//                                         .selectAll("mob")
//                                         .executeTakeFirst();
//                                       mob && setMob(mob);
//                                     }),
//                                   );
//                                   return (
//                                     <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
//                                       <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
//                                         <span class="text-accent-color font-bold">
//                                           {dic.db.drop_item.selfName + " " + dropItemIndex}
//                                         </span>
//                                         <Button
//                                           onClick={() => {
//                                             usedInDropItemsField().removeValue(dropItemIndex);
//                                           }}
//                                         >
//                                           -
//                                         </Button>
//                                       </div>
//                                       <Index each={Object.entries(dropItem())}>
//                                         {(dropItemField, index) => {
//                                           const fieldKey =
//                                             dropItemField()[0] as keyof ItemWithRelated["usedInDropItems"][number];
//                                           const fieldValue = dropItemField()[1];
//                                           switch (fieldKey) {
//                                             case "id":
//                                             case "itemId":
//                                               return null;
//                                             case "dropById":
//                                               return (
//                                                 <form.Field name={`usedInDropItems[${dropItemIndex}].${fieldKey}`}>
//                                                   {(subField) => (
//                                                     <Input
//                                                       title={dic.db.drop_item.fields.dropById.key}
//                                                       description={
//                                                         dic.db.drop_item.fields.dropById.formFieldDescription
//                                                       }
//                                                       state={fieldInfo(subField())}
//                                                     >
//                                                       <Autocomplete
//                                                         id={`usedInDropItems[${dropItemIndex}].${fieldKey}`}
//                                                         initialValue={subField().state.value}
//                                                         setValue={(value) => subField().setValue(value.id)}
//                                                         datasFetcher={async () => {
//                                                           const db = await getDB();
//                                                           const items = await db
//                                                             .selectFrom("mob")
//                                                             .selectAll()
//                                                             .execute();
//                                                           return items;
//                                                         }}
//                                                         displayField="name"
//                                                         valueField="id"
//                                                       />
//                                                     </Input>
//                                                   )}
//                                                 </form.Field>
//                                               );

//                                             case "breakRewardType":
//                                               return (
//                                                 <Show when={mob().type === "Boss"}>
//                                                   {renderField<drop_item, "breakRewardType">(
//                                                     form,
//                                                     `usedInDropItems[${dropItemIndex}].breakRewardType`,
//                                                     fieldValue as BossPartBreakRewardType,
//                                                     dic.db.drop_item,
//                                                     drop_itemSchema,
//                                                   )}
//                                                 </Show>
//                                               );
//                                             case "relatedPartInfo":
//                                               return (
//                                                 <form.Subscribe
//                                                   selector={(state) =>
//                                                     state.values.usedInDropItems[dropItemIndex]
//                                                       ? state.values.usedInDropItems[dropItemIndex].breakRewardType
//                                                       : "None"
//                                                   }
//                                                 >
//                                                   {(breakRewardType) => {
//                                                     return (
//                                                       <Show
//                                                         when={breakRewardType() !== "None" && mob().type === "Boss"}
//                                                       >
//                                                         {renderField<drop_item, "relatedPartInfo">(
//                                                           form,
//                                                           `usedInDropItems[${dropItemIndex}].relatedPartInfo`,
//                                                           fieldValue as string,
//                                                           dic.db.drop_item,
//                                                           drop_itemSchema,
//                                                         )}
//                                                       </Show>
//                                                     );
//                                                   }}
//                                                 </form.Subscribe>
//                                               );
//                                             case "relatedPartType":
//                                               return (
//                                                 <form.Subscribe
//                                                   selector={(state) =>
//                                                     state.values.usedInDropItems[dropItemIndex]
//                                                       ? state.values.usedInDropItems[dropItemIndex].breakRewardType
//                                                       : "None"
//                                                   }
//                                                 >
//                                                   {(breakRewardType) => {
//                                                     return (
//                                                       <Show
//                                                         when={breakRewardType() !== "None" && mob().type === "Boss"}
//                                                       >
//                                                         {renderField<drop_item, "relatedPartType">(
//                                                           form,
//                                                           `usedInDropItems[${dropItemIndex}].relatedPartType`,
//                                                           fieldValue as BossPartType,
//                                                           dic.db.drop_item,
//                                                           drop_itemSchema,
//                                                         )}
//                                                       </Show>
//                                                     );
//                                                   }}
//                                                 </form.Subscribe>
//                                               );

//                                             default:
//                                               // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                               const simpleFieldKey = `usedInDropItems[${dropItemIndex}].${fieldKey}`;
//                                               const simpleFieldValue = fieldValue;
//                                               return renderField<drop_item, keyof drop_item>(
//                                                 form,
//                                                 simpleFieldKey,
//                                                 simpleFieldValue,
//                                                 dic.db.drop_item,
//                                                 drop_itemSchema,
//                                               );
//                                           }
//                                         }}
//                                       </Index>
//                                     </div>
//                                   );
//                                 }}
//                               </form.Subscribe>
//                             )}
//                           </Index>
//                         </Show>
//                         <Button
//                           onClick={() => {
//                             usedInDropItemsField().pushValue(defaultData.drop_item);
//                           }}
//                           class="w-full"
//                         >
//                           +
//                         </Button>
//                       </div>
//                     </Input>
//                   )}
//                 </form.Field>
//               );
//             case "usedInRecipeEntries":
//               return (
//                 <form.Field
//                   name={`usedInRecipeEntries`}
//                   mode="array"
//                   validators={{
//                     onChangeAsyncDebounceMs: 500,
//                     onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
//                   }}
//                 >
//                   {(usedInRecipeEntriesField) => (
//                     <Input
//                       title={"隶属于" + dic.db.recipe_ingredient.selfName}
//                       description={dic.db.recipe_ingredient.description}
//                       state={fieldInfo(usedInRecipeEntriesField())}
//                       class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                     >
//                       <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
//                         <Show when={usedInRecipeEntriesField().state.value.length > 0}>
//                           <Index each={usedInRecipeEntriesField().state.value}>
//                             {(recipeEntry, recipeEntryIndex) => (
//                               <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
//                                 <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
//                                   <span class="text-accent-color font-bold">
//                                     {dic.db.recipe_ingredient.selfName + " " + recipeEntryIndex}
//                                   </span>
//                                   <Button
//                                     onClick={() => {
//                                       usedInRecipeEntriesField().removeValue(recipeEntryIndex);
//                                     }}
//                                   >
//                                     -
//                                   </Button>
//                                 </div>
//                                 <Index each={Object.entries(recipeEntry())}>
//                                   {(recipeEntryField, index) => {
//                                     const fieldKey =
//                                       recipeEntryField()[0] as keyof ItemWithRelated["usedInRecipeEntries"][number];
//                                     const fieldValue = recipeEntryField()[1];
//                                     switch (fieldKey) {
//                                       case "id":
//                                       case "itemId":
//                                       case "type":
//                                         return null;
//                                       case "recipeId":
//                                         return (
//                                           <form.Field
//                                             name={`usedInRecipeEntries[${recipeEntryIndex}].recipeId`}
//                                             validators={{
//                                               onChangeAsyncDebounceMs: 500,
//                                               onChangeAsync: recipe_ingredientSchema.shape[fieldKey],
//                                             }}
//                                           >
//                                             {(itemIdField) => (
//                                               <Input
//                                                 title={dic.db.recipe_ingredient.fields[fieldKey].key}
//                                                 description={
//                                                   dic.db.recipe_ingredient.fields[fieldKey].formFieldDescription
//                                                 }
//                                                 state={fieldInfo(itemIdField())}
//                                               >
//                                                 <Autocomplete
//                                                   id={fieldKey + recipeEntryIndex}
//                                                   initialValue={itemIdField().state.value}
//                                                   setValue={(value) => itemIdField().setValue(value.id)}
//                                                   datasFetcher={async () => {
//                                                     const db = await getDB();
//                                                     const items = await db
//                                                       .selectFrom("recipe")
//                                                       .innerJoin("item", "recipe.itemId", "item.id")
//                                                       .select(["recipe.id", "item.name"])
//                                                       .execute();
//                                                     return items;
//                                                   }}
//                                                   displayField="name"
//                                                   valueField="id"
//                                                 />
//                                               </Input>
//                                             )}
//                                           </form.Field>
//                                         );

//                                       default:
//                                         // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                         const simpleFieldKey = `usedInRecipeEntries[${recipeEntryIndex}].${fieldKey}`;
//                                         const simpleFieldValue = fieldValue;
//                                         return renderField<recipe_ingredient, keyof recipe_ingredient>(
//                                           form,
//                                           simpleFieldKey,
//                                           simpleFieldValue,
//                                           dic.db.recipe_ingredient,
//                                           recipe_ingredientSchema,
//                                         );
//                                     }
//                                   }}
//                                 </Index>
//                               </div>
//                             )}
//                           </Index>
//                         </Show>
//                         <Button
//                           onClick={() => {
//                             usedInRecipeEntriesField().pushValue(defaultData.recipe_ingredient);
//                           }}
//                           class="w-full"
//                         >
//                           +
//                         </Button>
//                       </div>
//                     </Input>
//                   )}
//                 </form.Field>
//               );
//             case "usedInTaskRewards":
//               return (
//                 <form.Field
//                   name={`usedInTaskRewards`}
//                   mode="array"
//                   validators={{ onChangeAsyncDebounceMs: 500, onChangeAsync: itemWithRelatedSchema.shape[fieldKey] }}
//                 >
//                   {(usedInTaskRewardsField) => (
//                     <Input
//                       title={"隶属于" + dic.db.task_reward.selfName}
//                       description={dic.db.task_reward.description}
//                       state={fieldInfo(usedInTaskRewardsField())}
//                       class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                     >
//                       <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
//                         <Show when={usedInTaskRewardsField().state.value.length > 0}>
//                           <Index each={usedInTaskRewardsField().state.value}>
//                             {(taskReward, taskRewardIndex) => (
//                               <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
//                                 <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
//                                   <span class="text-accent-color font-bold">
//                                     {dic.db.task_reward.selfName + " " + taskRewardIndex}
//                                   </span>
//                                   <Button
//                                     onClick={() => {
//                                       usedInTaskRewardsField().removeValue(taskRewardIndex);
//                                     }}
//                                   >
//                                     -
//                                   </Button>
//                                 </div>
//                                 <Index each={Object.entries(taskReward())}>
//                                   {(taskRewardField, index) => {
//                                     const fieldKey =
//                                       taskRewardField()[0] as keyof ItemWithRelated["usedInTaskRewards"][number];
//                                     const fieldValue = taskRewardField()[1];
//                                     switch (fieldKey) {
//                                       case "id":
//                                       case "itemId":
//                                       case "type":
//                                         return null;
//                                       case "taskId":
//                                         return (
//                                           <form.Field
//                                             name={`usedInTaskRewards[${taskRewardIndex}].taskId`}
//                                             validators={{
//                                               onChangeAsyncDebounceMs: 500,
//                                               onChangeAsync: task_rewardSchema.shape[fieldKey],
//                                             }}
//                                           >
//                                             {(itemIdField) => (
//                                               <Input
//                                                 title={dic.db.task_reward.fields[fieldKey].key}
//                                                 description={dic.db.task_reward.fields[fieldKey].formFieldDescription}
//                                                 state={fieldInfo(itemIdField())}
//                                               >
//                                                 <Autocomplete
//                                                   id={fieldKey + taskRewardIndex}
//                                                   initialValue={itemIdField().state.value}
//                                                   setValue={(value) => itemIdField().setValue(value.id)}
//                                                   datasFetcher={async () => {
//                                                     const db = await getDB();
//                                                     const items = await db
//                                                       .selectFrom("task")
//                                                       .select(["id", "name"])
//                                                       .execute();
//                                                     return items;
//                                                   }}
//                                                   displayField="name"
//                                                   valueField="id"
//                                                 />
//                                               </Input>
//                                             )}
//                                           </form.Field>
//                                         );

//                                       default:
//                                         // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                         const simpleFieldKey = `usedInTaskRewards[${taskRewardIndex}].${fieldKey}`;
//                                         const simpleFieldValue = fieldValue;
//                                         return renderField<task_reward, keyof task_reward>(
//                                           form,
//                                           simpleFieldKey,
//                                           simpleFieldValue,
//                                           dic.db.task_reward,
//                                           task_rewardSchema,
//                                         );
//                                     }
//                                   }}
//                                 </Index>
//                               </div>
//                             )}
//                           </Index>
//                         </Show>
//                         <Button
//                           onClick={() => {
//                             usedInTaskRewardsField().pushValue(defaultData.task_reward);
//                           }}
//                           class="w-full"
//                         >
//                           +
//                         </Button>
//                       </div>
//                     </Input>
//                   )}
//                 </form.Field>
//               );
//             case "usedInTaskCollectRequires":
//               return (
//                 <form.Field
//                   name={`usedInTaskCollectRequires`}
//                   mode="array"
//                   validators={{
//                     onChangeAsyncDebounceMs: 500,
//                     onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
//                   }}
//                 >
//                   {(usedInTaskCollectRequiresField) => (
//                     <Input
//                       title={"隶属于" + dic.db.task_collect_require.selfName}
//                       description={dic.db.task_collect_require.description}
//                       state={fieldInfo(usedInTaskCollectRequiresField())}
//                       class="border-dividing-color bg-primary-color w-full rounded-md border-1"
//                     >
//                       <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
//                         <Index each={usedInTaskCollectRequiresField().state.value}>
//                           {(taskCollectRequire, taskCollectRequireIndex) => (
//                             <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
//                               <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
//                                 <span class="text-accent-color font-bold">
//                                   {dic.db.task_collect_require.selfName + " " + taskCollectRequireIndex}
//                                 </span>
//                                 <Button
//                                   onClick={() => {
//                                     usedInTaskCollectRequiresField().removeValue(taskCollectRequireIndex);
//                                   }}
//                                 >
//                                   -
//                                 </Button>
//                               </div>
//                               <Index each={Object.entries(taskCollectRequire())}>
//                                 {(taskCollectRequireField, index) => {
//                                   const fieldKey =
//                                     taskCollectRequireField()[0] as keyof ItemWithRelated["usedInTaskCollectRequires"][number];
//                                   const fieldValue = taskCollectRequireField()[1];
//                                   switch (fieldKey) {
//                                     case "id":
//                                     case "itemId":
//                                       return null;
//                                     case "taskId":
//                                       return (
//                                         <form.Field
//                                           name={`usedInTaskCollectRequires[${taskCollectRequireIndex}].taskId`}
//                                           validators={{
//                                             onChangeAsyncDebounceMs: 500,
//                                             onChangeAsync: task_collect_requireSchema.shape[fieldKey],
//                                           }}
//                                         >
//                                           {(itemIdField) => {
//                                             return (
//                                               <Input
//                                                 title={dic.db.task_collect_require.fields.taskId.key}
//                                                 description={
//                                                   dic.db.task_collect_require.fields.taskId.formFieldDescription
//                                                 }
//                                                 state={fieldInfo(itemIdField())}
//                                               >
//                                                 <Autocomplete
//                                                   id={`usedInTaskCollectRequires[${taskCollectRequireIndex}].taskId`}
//                                                   initialValue={itemIdField().state.value}
//                                                   setValue={(value) => itemIdField().setValue(value.id)}
//                                                   datasFetcher={async () => {
//                                                     const db = await getDB();
//                                                     const items = await db
//                                                       .selectFrom("task")
//                                                       .select(["id", "name"])
//                                                       .execute();
//                                                     return items;
//                                                   }}
//                                                   displayField="name"
//                                                   valueField="id"
//                                                 />
//                                               </Input>
//                                             );
//                                           }}
//                                         </form.Field>
//                                       );
//                                     default:
//                                       // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
//                                       const simpleFieldKey = `usedInTaskCollectRequires[${taskCollectRequireIndex}].${fieldKey}`;
//                                       const simpleFieldValue = fieldValue;
//                                       return renderField<task_collect_require, keyof task_collect_require>(
//                                         form,
//                                         simpleFieldKey,
//                                         simpleFieldValue,
//                                         dic.db.task_collect_require,
//                                         task_collect_requireSchema,
//                                       );
//                                   }
//                                 }}
//                               </Index>
//                             </div>
//                           )}
//                         </Index>
//                         <Button
//                           onClick={() => {
//                             usedInTaskCollectRequiresField().pushValue(defaultData.task_collect_require);
//                           }}
//                           class="w-full"
//                         >
//                           +
//                         </Button>
//                       </div>
//                     </Input>
//                   )}
//                 </form.Field>
//               );

//             default:
//               return renderField<ItemWithRelated, keyof ItemWithRelated>(
//                 form,
//                 fieldKey,
//                 fieldValue,
//                 itemWithRelatedDic(dic),
//                 itemWithRelatedSchema,
//               );
//           }
//         }}
//       </For>
//       <form.Subscribe
//         selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
//         children={(state) => (
//           <div class="flex items-center gap-1">
//             <Button
//               level="primary"
//               class={`SubmitBtn flex-1`}
//               disabled={!state().canSubmit}
//               onClick={form.handleSubmit}
//             >
//               {state().isSubmitting ? "..." : dic.ui.actions.add}
//             </Button>
//           </div>
//         )}
//       />
//     </>
//   );
// };

export const ItemSharedFormField = <S extends ItemWithRelated>(
  dic: dictionary,
  oldItem: ItemWithRelated,
  form: SolidFormApi<ItemWithRelated, any, any, any, any, any, any, any, any, unknown>,
) => {
  return (
    <For each={Object.entries(oldItem ?? defaultItemWithRelated)}>
      {(field, index) => {
        const fieldKey = field[0] as keyof ItemWithRelated;
        switch (fieldKey) {
          case "id":
          case "itemType":
          case "createdByAccountId":
          case "updatedByAccountId":
          case "statisticId":
            return null;
          case "recipe":
            return (
              <form.Field
                name={fieldKey}
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
                }}
              >
                {(recipeField) => {
                  return (
                    <Input
                      title={dic.db.recipe.selfName}
                      description={dic.db.recipe.description}
                      state={fieldInfo(recipeField())}
                      class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                    >
                      <Index each={Object.entries(recipeField().state.value)}>
                        {(recipe, recipeIndex) => {
                          const recipeFieldKey = recipe()[0] as keyof ItemWithRelated["recipe"];
                          const recipeFieldValue = recipe()[1];
                          switch (recipeFieldKey) {
                            case "id":
                            case "itemId":
                            case "createdByAccountId":
                            case "updatedByAccountId":
                            case "statisticId":
                              return null;
                            case "activityId":
                              const [recipeIsLimit, setRecipeIsLimit] = createSignal(false);
                              return (
                                <form.Field
                                  name={`recipe.${recipeFieldKey}`}
                                  validators={{
                                    onChangeAsyncDebounceMs: 500,
                                    onChangeAsync: recipeSchema.shape[recipeFieldKey],
                                  }}
                                >
                                  {(activityIdField) => (
                                    <>
                                      <Input
                                        title={"活动配方标记"}
                                        description={"仅在某个活动开启时可使用的配方"}
                                        state={undefined}
                                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                      >
                                        <Toggle
                                          id={"isLimit"}
                                          onClick={() => setRecipeIsLimit(!recipeIsLimit())}
                                          onBlur={undefined}
                                          name={"isLimit"}
                                          checked={recipeIsLimit()}
                                        />
                                      </Input>
                                      <Show when={recipeIsLimit()}>
                                        <Input
                                          title={dic.db.activity.selfName}
                                          description={dic.db.activity.description}
                                          state={fieldInfo(activityIdField())}
                                          class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                        >
                                          <Autocomplete
                                            id={activityIdField().name + "activityId"}
                                            initialValue={activityIdField().state.value ?? defaultData.activity.id}
                                            setValue={(value) => activityIdField().setValue(value.id)}
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
                                  {(recipeEntries) => {
                                    return (
                                      <Input
                                        title={dic.db.recipe_ingredient.selfName}
                                        description={dic.db.recipe_ingredient.description}
                                        state={fieldInfo(recipeEntries())}
                                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                                      >
                                        <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                                          <Index each={recipeEntries().state.value}>
                                            {(recipeEntry, recipeEntryIndex) => {
                                              const recipeEntryData = recipeEntry();
                                              return (
                                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                                    <span class="text-accent-color font-bold">
                                                      {dic.db.recipe_ingredient.selfName + " " + recipeEntryIndex}
                                                    </span>
                                                    <Button
                                                      onClick={() => {
                                                        recipeEntries().removeValue(recipeEntryIndex);
                                                      }}
                                                    >
                                                      -
                                                    </Button>
                                                  </div>
                                                  <Index each={Object.entries(recipeEntryData)}>
                                                    {(recipeEntryField, recipeEntryFieldIndex) => {
                                                      const recipeEntryFieldKey =
                                                        recipeEntryField()[0] as keyof ItemWithRelated["recipe"]["recipeEntries"][number];
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
                                                                    dic.db.recipe_ingredient.fields[recipeEntryFieldKey]
                                                                      .key
                                                                  }
                                                                  description={
                                                                    dic.db.recipe_ingredient.fields[recipeEntryFieldKey]
                                                                      .formFieldDescription
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
                                                                  ? state.values.recipe.recipeEntries[recipeEntryIndex]
                                                                      .type
                                                                  : "Magic"
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
                                                                          initialValue={itemIdField().state.value ?? ""}
                                                                          setValue={(value) =>
                                                                            itemIdField().setValue(value.id)
                                                                          }
                                                                          datasFetcher={async () => {
                                                                            const db = await getDB();
                                                                            const items = await db
                                                                              .selectFrom("item")
                                                                              .selectAll()
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

                                          <Button
                                            onClick={() => {
                                              console.log("pushValue");
                                              recipeEntries().pushValue({
                                                ...defaultData.recipe_ingredient,
                                              });
                                              console.log("pushValue", recipeEntries().state.value);
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
                            default:
                              // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                              const simpleFieldKey = `recipe.${recipeFieldKey}`;
                              const simpleFieldValue = recipeFieldValue;
                              return renderField<ItemWithRelated["recipe"], keyof ItemWithRelated["recipe"]>(
                                form,
                                simpleFieldKey,
                                simpleFieldValue,
                                itemWithRelatedDic(dic).fields.recipe,
                                recipeSchema,
                              );
                          }
                        }}
                      </Index>
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
                  onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
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
                                          dropItemField()[0] as keyof ItemWithRelated["usedInDropItems"][number];
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
                                                    description={dic.db.drop_item.fields.dropById.formFieldDescription}
                                                    state={fieldInfo(subField())}
                                                  >
                                                    <Autocomplete
                                                      id={`usedInDropItems[${dropItemIndex}].${fieldKey}`}
                                                      initialValue={subField().state.value}
                                                      setValue={(value) => subField().setValue(value.id)}
                                                      datasFetcher={async () => {
                                                        const db = await getDB();
                                                        const items = await db.selectFrom("mob").selectAll().execute();
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
                                                    <Show when={breakRewardType() !== "None" && mob().type === "Boss"}>
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
                                                    <Show when={breakRewardType() !== "None" && mob().type === "Boss"}>
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
                  onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
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
                                    recipeEntryField()[0] as keyof ItemWithRelated["usedInRecipeEntries"][number];
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
                                                initialValue={itemIdField().state.value}
                                                setValue={(value) => itemIdField().setValue(value.id)}
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
                validators={{ onChangeAsyncDebounceMs: 500, onChangeAsync: itemWithRelatedSchema.shape[fieldKey] }}
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
                                    taskRewardField()[0] as keyof ItemWithRelated["usedInTaskRewards"][number];
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
                                                initialValue={itemIdField().state.value}
                                                setValue={(value) => itemIdField().setValue(value.id)}
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
          case "usedInTaskCollectRequires":
            return (
              <form.Field
                name={`usedInTaskCollectRequires`}
                mode="array"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: itemWithRelatedSchema.shape[fieldKey],
                }}
              >
                {(usedInTaskCollectRequiresField) => (
                  <Input
                    title={"隶属于" + dic.db.task_collect_require.selfName}
                    description={dic.db.task_collect_require.description}
                    state={fieldInfo(usedInTaskCollectRequiresField())}
                    class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                  >
                    <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
                      <Index each={usedInTaskCollectRequiresField().state.value}>
                        {(taskCollectRequire, taskCollectRequireIndex) => (
                          <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                            <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                              <span class="text-accent-color font-bold">
                                {dic.db.task_collect_require.selfName + " " + taskCollectRequireIndex}
                              </span>
                              <Button
                                onClick={() => {
                                  usedInTaskCollectRequiresField().removeValue(taskCollectRequireIndex);
                                }}
                              >
                                -
                              </Button>
                            </div>
                            <Index each={Object.entries(taskCollectRequire())}>
                              {(taskCollectRequireField, index) => {
                                const fieldKey =
                                  taskCollectRequireField()[0] as keyof ItemWithRelated["usedInTaskCollectRequires"][number];
                                const fieldValue = taskCollectRequireField()[1];
                                switch (fieldKey) {
                                  case "id":
                                  case "itemId":
                                    return null;
                                  case "taskId":
                                    return (
                                      <form.Field
                                        name={`usedInTaskCollectRequires[${taskCollectRequireIndex}].taskId`}
                                        validators={{
                                          onChangeAsyncDebounceMs: 500,
                                          onChangeAsync: task_collect_requireSchema.shape[fieldKey],
                                        }}
                                      >
                                        {(itemIdField) => {
                                          return (
                                            <Input
                                              title={dic.db.task_collect_require.fields.taskId.key}
                                              description={
                                                dic.db.task_collect_require.fields.taskId.formFieldDescription
                                              }
                                              state={fieldInfo(itemIdField())}
                                            >
                                              <Autocomplete
                                                id={`usedInTaskCollectRequires[${taskCollectRequireIndex}].taskId`}
                                                initialValue={itemIdField().state.value}
                                                setValue={(value) => itemIdField().setValue(value.id)}
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
                                          );
                                        }}
                                      </form.Field>
                                    );
                                  default:
                                    // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                    const simpleFieldKey = `usedInTaskCollectRequires[${taskCollectRequireIndex}].${fieldKey}`;
                                    const simpleFieldValue = fieldValue;
                                    return renderField<task_collect_require, keyof task_collect_require>(
                                      form,
                                      simpleFieldKey,
                                      simpleFieldValue,
                                      dic.db.task_collect_require,
                                      task_collect_requireSchema,
                                    );
                                }
                              }}
                            </Index>
                          </div>
                        )}
                      </Index>
                      <Button
                        onClick={() => {
                          usedInTaskCollectRequiresField().pushValue(defaultData.task_collect_require);
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
            return renderField<ItemWithRelated, keyof ItemWithRelated>(
              form,
              fieldKey,
              field[1],
              itemWithRelatedDic(dic),
              itemWithRelatedSchema,
            );
        }
      }}
    </For>
  );
};

export const ItemSharedFormDataSubmitor = async (
  trx: Transaction<DB>,
  newItem: ItemWithRelated,
  oldItem?: ItemWithRelated,
) => {
  console.log("oldItem", oldItem, "newItem", newItem);
  const itemData = pick(newItem, Object.keys(defaultData.item) as (keyof item)[]);
  let item: item;
  if (oldItem) {
    // 更新
    item = await updateItem(trx, itemData);
  } else {
    // 新增
    item = await createItem(trx, itemData);
  }

  // 关系项更新
  const oldRecipe = oldItem?.recipe;
  const oldUsedInDropItems = oldItem?.usedInDropItems ?? [];
  const oldUsedInTaskRewards = oldItem?.usedInTaskRewards ?? [];
  const oldUsedInRecipeEntries = oldItem?.usedInRecipeEntries ?? [];

  const {
    recipe: newRecipe,
    usedInDropItems: newUsedInDropItems,
    usedInTaskRewards: newUsedInTaskRewards,
    usedInRecipeEntries: newUsedInRecipeEntries,
    ...rest
  } = newItem;

  // 处理配方
  const { recipeEntries, ...newRecipeData } = newRecipe;
  let recipe: recipe;
  if (oldRecipe) {
    // 更新
    recipe = await trx.updateTable("recipe").set({
      ...newRecipeData,
      updatedByAccountId: store.session.user.account?.id,
    }).where("id", "=", oldRecipe.id).returningAll().executeTakeFirstOrThrow();
  } else {
    // 新增
    const statistic = await createStatistic(trx);
    recipe = await trx.insertInto("recipe").values({
      ...newRecipeData,
      id: createId(),
      statisticId: statistic.id,
      itemId: item.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    }).returningAll().executeTakeFirstOrThrow();
  }

  // 处理配方更新
  const {
    dataToAdd: recipeEntriesToAdd,
    dataToRemove: recipeEntriesToRemove,
    dataToUpdate: recipeEntriesToUpdate,
  } = await arrayDiff({
    trx,
    table: "recipe_ingredient",
    oldArray: oldRecipe?.recipeEntries ?? [],
    newArray: newRecipe.recipeEntries,
  });

  console.table({
    recipeEntriesToAdd,
    recipeEntriesToRemove,
    recipeEntriesToUpdate,
  });

  for (const recipeEntry of recipeEntriesToAdd) {
    await trx
      .insertInto("recipe_ingredient")
      .values({
        ...recipeEntry,
        id: createId(),
        recipeId: recipe.id,
      })
      .executeTakeFirstOrThrow();
  }
  for (const recipeEntry of recipeEntriesToRemove) {
    await trx.deleteFrom("recipe_ingredient").where("id", "=", recipeEntry.id).executeTakeFirstOrThrow();
  }
  for (const recipeEntry of recipeEntriesToUpdate) {
    await trx.updateTable("recipe_ingredient").set({
      ...recipeEntry,
    }).where("id", "=", recipeEntry.id).executeTakeFirstOrThrow();
  }

  // 更新一对多关系

  // 更新掉落物
  const usedInDropItemsToRemove = oldUsedInDropItems.filter(
    (item) => !newUsedInDropItems.some((i) => i.id === item.id),
  );
  const usedInDropItemsToAdd = newUsedInDropItems.filter((item) => !oldUsedInDropItems.some((i) => i.id === item.id));

  // 处理需要移除的掉落物
  for (const dropItem of usedInDropItemsToRemove) {
    await trx.deleteFrom("drop_item").where("id", "=", dropItem.id).executeTakeFirstOrThrow();
  }
  // 处理需要新增的掉落物
  for (const dropItem of usedInDropItemsToAdd) {
    await trx
      .insertInto("drop_item")
      .values({
        ...dropItem,
        id: createId(),
        itemId: item.id,
      })
      .executeTakeFirstOrThrow();
  }

  // 更新任务奖励
  const usedInTaskRewardsToRemove = oldUsedInTaskRewards.filter(
    (item) => !newUsedInTaskRewards.some((i) => i.id === item.id),
  );
  const usedInTaskRewardsToAdd = newUsedInTaskRewards.filter(
    (item) => !oldUsedInTaskRewards.some((i) => i.id === item.id),
  );
  // 处理需要移除的任务奖励
  for (const taskReward of usedInTaskRewardsToRemove) {
    await trx.deleteFrom("task_reward").where("id", "=", taskReward.id).executeTakeFirstOrThrow();
  }
  // 处理需要新增的任务奖励
  for (const taskReward of usedInTaskRewardsToAdd) {
    await trx
      .insertInto("task_reward")
      .values({
        ...taskReward,
        id: createId(),
        itemId: item.id,
      })
      .executeTakeFirstOrThrow();
  }

  // 更新道具隶属的配方项
  const usedInRecipeEntriesToRemove = oldUsedInRecipeEntries.filter(
    (item) => !newUsedInRecipeEntries.some((i) => i.id === item.id),
  );
  const usedInRecipeEntriesToAdd = newUsedInRecipeEntries.filter(
    (item) => !oldUsedInRecipeEntries.some((i) => i.id === item.id),
  );
  // 处理需要移除的配方项
  for (const usedInRecipeEntry of usedInRecipeEntriesToRemove) {
    await trx.deleteFrom("recipe_ingredient").where("id", "=", usedInRecipeEntry.id).executeTakeFirstOrThrow();
  }
  // 处理需要新增的配方项
  for (const usedInRecipeEntry of usedInRecipeEntriesToAdd) {
    await trx
      .insertInto("recipe_ingredient")
      .values({
        ...usedInRecipeEntry,
        id: createId(),
        type: "Item",
        recipeId: newRecipe.id,
      })
      .executeTakeFirstOrThrow();
  }
  console.log("已处理item：", item);
  return item;
};

export const ItemSharedCardContent = (props: { data: ItemWithRelated; dic: dictionary }): JSX.Element => {
  // 获取配方项相关物品数据
  const [recipeEntries] = createResource(
    () => props.data.recipe?.recipeEntries ?? [],
    async (entries) => {
      if (!entries.length) return [];
      const db = await getDB();
      const recipeEntriesWithRelatedItems = await Promise.all(
        entries.map((entry) => {
          return db
            .selectFrom("recipe_ingredient")
            .where("recipe_ingredient.id", "=", entry.id)
            .select((eb) => [
              jsonObjectFrom(
                eb.selectFrom("item").whereRef("item.id", "=", "recipe_ingredient.itemId").selectAll("item"),
              ).as("relatedItem"),
            ])
            .selectAll()
            .executeTakeFirstOrThrow();
        }),
      );
      return recipeEntriesWithRelatedItems;
    },
  );

  // 获取掉落物相关怪物数据
  const [dropItems] = createResource(
    () => props.data.usedInDropItems,
    async (items) => {
      if (!items.length) return [];
      const db = await getDB();
      const dropItemsWithRelatedMobs = await Promise.all(
        items.map((item) => {
          return db
            .selectFrom("drop_item")
            .where("drop_item.id", "=", item.id)
            .select((eb) => [
              jsonObjectFrom(eb.selectFrom("mob").whereRef("mob.id", "=", "drop_item.dropById").selectAll("mob")).as(
                "relatedMob",
              ),
            ])
            .selectAll()
            .executeTakeFirstOrThrow();
        }),
      );
      return dropItemsWithRelatedMobs;
    },
  );

  // 获取任务奖励相关任务数据
  const [taskRewards] = createResource(
    () => props.data.usedInTaskRewards,
    async (rewards) => {
      if (!rewards.length) return [];
      const db = await getDB();
      const taskRewardsWithRelatedTasks = await Promise.all(
        rewards.map((reward) => {
          return db
            .selectFrom("task_reward")
            .where("task_reward.id", "=", reward.id)
            .select((eb) => [
              jsonObjectFrom(eb.selectFrom("task").whereRef("task.id", "=", "task_reward.taskId").selectAll("task")).as(
                "relatedTask",
              ),
            ])
            .selectAll()
            .executeTakeFirstOrThrow();
        }),
      );
      return taskRewardsWithRelatedTasks;
    },
  );

  // 获取配方项相关物品数据
  const [recipeEntriesUsed] = createResource(
    () => props.data.usedInRecipeEntries,
    async (entries) => {
      if (!entries.length) return [];
      const db = await getDB();
      const recipeEntriesUsedWithRelatedItems = await Promise.all(
        entries.map((entry) => {
          return db
            .selectFrom("recipe_ingredient")
            .where("recipe_ingredient.id", "=", entry.id)
            .select((eb) => [
              jsonObjectFrom(
                eb.selectFrom("item").whereRef("item.id", "=", "recipe_ingredient.itemId").selectAll("item"),
              ).as("relatedItem"),
            ])
            .selectAll()
            .executeTakeFirstOrThrow();
        }),
      );
      return recipeEntriesUsedWithRelatedItems;
    },
  );

  // 获取任务收集需求相关任务数据
  const [taskCollectRequires] = createResource(
    () => props.data.usedInTaskCollectRequires,
    async (requires) => {
      if (!requires.length) return [];
      const db = await getDB();
      const taskCollectRequiresWithRelatedTasks = await Promise.all(
        requires.map((require) => {
          return db
            .selectFrom("task_collect_require")
            .where("task_collect_require.id", "=", require.id)
            .select((eb) => [
              jsonObjectFrom(
                eb.selectFrom("task").whereRef("task.id", "=", "task_collect_require.taskId").selectAll("task"),
              ).as("relatedTask"),
            ])
            .selectAll()
            .executeTakeFirstOrThrow();
        }),
      );
      return taskCollectRequiresWithRelatedTasks;
    },
  );

  return (
    <>
      <Show when={props.data.recipe}>
        {(validRecipeData) => (
          <CardSection
            title={props.dic.db.recipe.selfName}
            data={recipeEntries() ?? []}
            renderItem={(recipeEntry) => {
              const type = recipeEntry.type;
              switch (type) {
                case "Item":
                  return {
                    label: String(recipeEntry.relatedItem?.name) + "(" + recipeEntry.count + ")",
                    onClick: () =>
                      setWikiStore("cardGroup", (prev) => [
                        ...prev,
                        {
                          type: itemTypeToTableType(recipeEntry.relatedItem?.itemType!),
                          id: recipeEntry.relatedItem?.id!,
                        },
                      ]),
                  };
                default:
                  return {
                    label:
                      props.dic.db.recipe_ingredient.fields.type.enumMap[recipeEntry.type] + ":" + recipeEntry.count,
                    onClick: () => null,
                  };
              }
            }}
          />
        )}
      </Show>
      <CardSection
        title={"掉落于" + props.dic.db.mob.selfName}
        data={dropItems() ?? []}
        renderItem={(dropBy) => {
          return {
            label: dropBy.relatedMob?.name ?? "",
            onClick: () =>
              setWikiStore("cardGroup", (prev) => [...prev, { type: "mob", id: dropBy.relatedMob?.id ?? "" }]),
          };
        }}
      />
      <CardSection
        title={"可从这些" + props.dic.db.task.selfName + "获得"}
        data={taskRewards() ?? []}
        renderItem={(rewardItem) => {
          return {
            label: rewardItem.relatedTask?.name ?? "",
            onClick: () =>
              setWikiStore("cardGroup", (prev) => [...prev, { type: "task", id: rewardItem.relatedTask?.id ?? "" }]),
          };
        }}
      />
      <CardSection
        title={"是这些" + props.dic.db.item.selfName + "的原料"}
        data={recipeEntriesUsed() ?? []}
        renderItem={(usedIn) => {
          return {
            label: usedIn.relatedItem?.name ?? "",
            onClick: () =>
              setWikiStore("cardGroup", (prev) => [
                ...prev,
                { type: itemTypeToTableType(usedIn.relatedItem?.itemType!), id: usedIn.relatedItem?.id ?? "" },
              ]),
          };
        }}
      />
      <CardSection
        title={"被用于" + props.dic.db.task.selfName}
        data={taskCollectRequires() ?? []}
        renderItem={(usedInTask) => {
          return {
            label: usedInTask.relatedTask?.name ?? "",
            onClick: () =>
              setWikiStore("cardGroup", (prev) => [...prev, { type: "task", id: usedInTask.relatedTask?.id ?? "" }]),
          };
        }}
      />
    </>
  );
};
