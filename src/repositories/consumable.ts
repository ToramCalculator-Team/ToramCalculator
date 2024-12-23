import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistics";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";

export type Consumable = Awaited<ReturnType<typeof findConsumableById>>;
export type NewConsumable = Insertable<item>;
export type ConsumableUpdate = Updateable<item>;

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.consumableId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findConsumableById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "item.id", "consumable.itemId")
    .where("id", "=", id)
    .selectAll(["item", "consumable"])
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateConsumable(id: string, updateWith: ConsumableUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(newConsumable: NewConsumable) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newConsumable).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultConsumable: Consumable = {
  name: "默认消耗品（缺省值）",
  id: "defaultConsumableId",
  itemId: "defaultConsumableId",
  type: "",
  effectDuration: 0,
  effects: [],
  dataSources: "",
  extraDetails: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.consumableRecipe,
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
