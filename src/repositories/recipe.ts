import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, recipe } from "../../db/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";

export interface Recipe extends DataType<recipe> {
  MainTable: Awaited<ReturnType<typeof findRecipes>>[number];
}

export function recipeSubRelations(eb: ExpressionBuilder<DB, "recipe">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("recipe_ingredient").where("recipe_ingredient.recipeId", "=", id).selectAll("recipe_ingredient"),
    ).as("recipeEntries"),
  ];
}

export async function findRecipeById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("recipe")
    .where("id", "=", id)
    .selectAll("recipe")
    .select((eb) => recipeSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findRecipes() {
  const db = await getDB();
  return await db.selectFrom("recipe").selectAll("recipe").execute();
}

export async function updateRecipe(id: string, updateWith: Recipe["Update"]) {
  const db = await getDB();
  return await db.updateTable("recipe").set(updateWith).where("recipe.id", "=", id).returningAll().executeTakeFirst();
}

export async function insertRecipe(trx: Transaction<DB>, newRecipe: Recipe["Insert"]) {
  const recipe = await trx.insertInto("recipe").values(newRecipe).returningAll().executeTakeFirstOrThrow();
  return recipe;
}

export async function deleteRecipe(id: string) {
  const db = await getDB();
  return await db.deleteFrom("recipe").where("recipe.id", "=", id).returningAll().executeTakeFirst();
}
