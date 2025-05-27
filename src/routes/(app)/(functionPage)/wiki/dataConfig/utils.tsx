import { createMemo, createResource, JSX, Setter, Show } from "solid-js";
import { ItemType } from "~/../db/kysely/enums";
import { DB, item } from "~/../db/kysely/kyesely";
import { CardSection } from "~/components/module/cardSection";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { setWikiStore } from "../store";
import { Transaction } from "kysely";
import { createStatistic } from "~/repositories/statistic";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";
import { getDictionary } from "~/locales/i18n";

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

export const ItemSharedCardContent = (itemId: string, dic: dictionary): JSX.Element => {
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [recipeData] = createResource(itemId, async (itemId) => {
    const db = await getDB();
    const recipe = await db
      .selectFrom("recipe")
      .where("recipe.itemId", "=", itemId)
      .innerJoin("recipe_ingredient", "recipe.id", "recipe_ingredient.recipeId")
      .leftJoin("item", "recipe_ingredient.itemId", "item.id")
      .select([
        "recipe_ingredient.type",
        "recipe_ingredient.count",
        "item.id as itemId",
        "item.itemType as itemType",
        "item.name as itemName",
      ])
      .executeTakeFirstOrThrow();
    console.log("recipe", recipe);
    return recipe;
  });
  const [dropByData] = createResource(itemId, async (itemId) => {
    const db = await getDB();
    return await db
      .selectFrom("drop_item")
      .innerJoin("mob", "drop_item.dropById", "mob.id")
      .where("drop_item.itemId", "=", itemId)
      .select(["mob.id as mobId", "mob.name as mobName"])
      .execute();
  });
  const [rewardItemData] = createResource(itemId, async (itemId) => {
    const db = await getDB();
    return await db
      .selectFrom("task_reward")
      .innerJoin("task", "task_reward.taskId", "task.id")
      .where("task_reward.itemId", "=", itemId)
      .select(["task.id as taskId", "task.name as taskName"])
      .execute();
  });
  const [usedInRecipeData] = createResource(itemId, async (itemId) => {
    const db = await getDB();
    return await db
      .selectFrom("recipe_ingredient")
      .innerJoin("recipe", "recipe_ingredient.recipeId", "recipe.id")
      .innerJoin("item", "recipe.itemId", "item.id")
      .where("recipe_ingredient.itemId", "=", itemId)
      .select(["item.id as itemId", "item.name as itemName", "item.itemType as itemType"])
      .execute();
  });
  const [usedInTaskData] = createResource(itemId, async (itemId) => {
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
      <Show when={recipeData()} fallback={<div>......</div>}>
        {(vaildRecipeData) => (
          <CardSection
            title={dic.db.recipe.selfName}
            data={[vaildRecipeData()]}
            renderItem={(recipe) => {
              const type = recipe.type;
              switch (type) {
                case "Item":
                  return {
                    label: String(recipe.itemName) + "(" + recipe.count + ")",
                    onClick: () =>
                      setWikiStore("cardGroup", (prev) => [
                        ...prev,
                        { type: itemTypeToTableType(recipe.itemType!), id: recipe.itemId! },
                      ]),
                  };
                default:
                  return {
                    label: dictionary().db.recipe_ingredient.fields.type.enumMap[recipe.type] + ":" + recipe.count,
                    onClick: () => null,
                  };
              }
            }}
          />
        )}
      </Show>
      <Show when={dropByData.latest?.length}>
        <CardSection
          title={"掉落于" + dic.db.mob.selfName}
          data={dropByData.latest}
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
