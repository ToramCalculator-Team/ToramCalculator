import { createResource, JSX, Setter, Show } from "solid-js";
import { ItemType } from "~/../db/kysely/enums";
import { DB } from "~/../db/kysely/kyesely";
import { CardSection } from "~/components/module/cardSection";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";

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

export const updateObjArrayItemKey = <T extends Record<string, any>>(
  array: T[],
  key: keyof T | null,
  index: number,
  value: T,
) => {
  if (key === null) {
    return array.map((item, i) => (i === index ? { ...item, value } : item));
  }
  return array.map((item, i) => (i === index ? { ...item, [key]: value[key] } : item));
};

export const ItemSharedCardContent = (
  itemId: string,
  dic: dictionary,
  appendCardTypeAndIds: Setter<
    {
      type: keyof DB;
      id: string;
    }[]
  >,
): JSX.Element => {
  const [recipeData] = createResource(itemId, async (itemId) => {
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
};
