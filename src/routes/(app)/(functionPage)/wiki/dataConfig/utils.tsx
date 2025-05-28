import { createMemo, createResource, JSX, Setter, Show } from "solid-js";
import { ItemType } from "~/../db/kysely/enums";
import {
  DB,
  drop_item,
  item,
  recipe,
  recipe_ingredient,
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
} from "../../../../../../db/zod";
import { z } from "zod";
import { defaultData } from "../../../../../../db/defaultData";

export type TtemWithRelated = item & {
  recipe: (recipe & {
    recipeEntries: recipe_ingredient[];
  }) | null;
  usedInDropItems: drop_item[];
  usedInTaskRewards: task_reward[];
  usedInRecipeEntries: recipe_ingredient[];
  usedInTaskCollectRequires: task_collect_require[];
};

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

export const defaultItemWithRelated: TtemWithRelated = {
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

export const itemWithRelatedDic = (dic: dictionary) => ({
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
});

export const itemWithRelatedFetcher = async <T extends DB[keyof DB]>(
  id: string,
  tableType: item["itemType"],
) => {
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

export const itemTypeToTableType = (itemType: ItemType) => {
  const tableType: keyof DB = (
    {
      Weapon: "weapon",
      Armor: "armor",
      Option: "option",
      Special: "special",
      Crystal: "crystal",
      Consumable: "consumable",
      Material: "material",
    } satisfies Record<ItemType, keyof DB>
  )[itemType];
  return tableType;
};

export const ItemSharedCardContent = (item: TtemWithRelated, dic: dictionary): JSX.Element => {
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  return (  
    <>
      <Show when={item.recipe}>
        {(vaildRecipeData) => (
          <CardSection
            title={dic.db.recipe.selfName}
            data={vaildRecipeData().recipeEntries}
            renderItem={(recipeEntry) => {
              const type = recipeEntry.type;
              switch (type) {
                case "Item":
                  return {
                    label: String(recipeEntry.item!.name) + "(" + recipeEntry.count + ")",
                    onClick: () =>
                      setWikiStore("cardGroup", (prev) => [
                        ...prev,
                        { type: itemTypeToTableType(recipeEntry.item!.itemType!), id: recipeEntry.item!.id! },
                      ]),
                  };
                default:
                  return {
                    label:
                      dictionary().db.recipe_ingredient.fields.type.enumMap[recipeEntry.type] + ":" + recipeEntry.count,
                    onClick: () => null,
                  };
              }
            }}
          />
        )}
      </Show>
      <Show when={item.usedInDropItems.length}>
        <CardSection
          title={"掉落于" + dic.db.mob.selfName}
          data={item.usedInDropItems}
          renderItem={(dropBy) => {
            return {
              label: dropBy.mobName,
              onClick: () => setWikiStore("cardGroup", (prev) => [...prev, { type: "mob", id: dropBy.mobId }]),
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
              onClick: () => setWikiStore("cardGroup", (prev) => [...prev, { type: "task", id: rewardItem.taskId }]),
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
                setWikiStore("cardGroup", (prev) => [
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
              onClick: () => setWikiStore("cardGroup", (prev) => [...prev, { type: "task", id: usedInTask.taskId }]),
            };
          }}
        />
      </Show>
    </>
  );
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
