import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultAccount } from "./account";
import { ConvertToAllString, DataType } from "./untils";
import { DB, item } from "../../../db/clientDB/kysely/kyesely";
import { ItemType } from "../../../db/clientDB/kysely/enums";
import { db } from "./database";
import { ITEM_TYPE } from "../../../db/enums";
import { Locale } from "~/locales/i18n";

export interface Item extends DataType<item> {
  MainTable: Awaited<ReturnType<typeof findItems>>[number];
}

export function itemSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>, type: ItemType) {
  const baseSubRelations = [
    jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "item.statisticId").selectAll("statistic"))
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("mob", "drop_item.dropById", "mob.id")
        .where("drop_item.itemId", "=", id)
        .select(["mob.id", "mob.name"]),
    ).as("dropByMob"),
    jsonArrayFrom(
      eb
        .selectFrom("task_reward")
        .innerJoin("task", "task_reward.taskId", "task.id")
        .innerJoin("npc", "task.npcId", "npc.id")
        .where("task_reward.itemId", "=", id)
        .select(["npc.id", "npc.name", "task.id", "task.name"]),
    ).as("rewardByNpcTask"),
    jsonArrayFrom(
      eb
        .selectFrom("task_collect_require")
        .innerJoin("task", "task_collect_require.taskId", "task.id")
        .where("task_collect_require.itemId", "=", id)
        .select(["task.id", "task.name"]),
    ).as("collectRequireByTask"),
    jsonArrayFrom(
      eb
        .selectFrom("recipe_ingredient")
        .innerJoin("item", "recipe_ingredient.itemId", "item.id")
        .where("recipe_ingredient.recipeId", "=", id)
        .select(["item.id"]),
    ).as("recipeEntries"),
  ];

  switch (type) {
    case "Weapon":
      return [
        ...baseSubRelations,
        eb.selectFrom("weapon").where("weapon.itemId", "=", id).selectAll("weapon").as("weapon"),
      ];
    case "Armor":
      return [
        ...baseSubRelations,
        eb.selectFrom("armor").where("armor.itemId", "=", id).selectAll("armor").as("armor"),
      ];
    case "Option":
      return [
        ...baseSubRelations,
        eb.selectFrom("option").where("option.itemId", "=", id).selectAll("option").as("option"),
      ];
    case "Special":
      return [
        ...baseSubRelations,
        eb.selectFrom("special").where("special.itemId", "=", id).selectAll("special").as("special"),
      ];
    case "Crystal":
      return [
        ...baseSubRelations,
        eb.selectFrom("crystal").where("crystal.itemId", "=", id).selectAll("crystal").as("crystal"),
      ];
    case "Consumable":
      return [
        ...baseSubRelations,
        eb.selectFrom("consumable").where("consumable.itemId", "=", id).selectAll("consumable").as("consumable"),
      ];
    case "Material":
      return [
        ...baseSubRelations,
        eb.selectFrom("material").where("material.itemId", "=", id).selectAll("material").as("material"),
      ];
  }
}

export async function findItemById(id: string, type: ItemType) {
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.val(id), type))
    .executeTakeFirstOrThrow();
}

export async function findItems() {
  return await db.selectFrom("item").selectAll("item").execute();
}

export async function updateItem(id: string, updateWith: Item["Update"]) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function insertItem(trx: Transaction<DB>, newItem: Item["Insert"]) {
  const item = await trx.insertInto("item").values(newItem).returningAll().executeTakeFirstOrThrow();
  return item;
}

export async function createItem(newItem: Item["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newItem).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteItem(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

const itemsShared = {
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};

const items: Partial<Record<ItemType, Item["Select"]>> = {};
for (const key of ITEM_TYPE) {
  items[key] = {
    id: ``,
    name: ``,
    type: key,
    // statistic: defaultStatistics[key],
    statisticId: "",
    ...itemsShared,
  };
}

export const defaultItems = items;

export const ItemDic = (locale: Locale): ConvertToAllString<Item["Select"]> => {
  switch (locale) {
    case "zh-CN":
    case "zh-TW":
    case "en":
    case "ja":
      return {
        id: "",
        type: "",
        name: "",
        dataSources: "",
        statisticId: "",
        selfName: "",
        details: "",
        updatedByAccountId: "",
        createdByAccountId: "",
      };
  }
};
