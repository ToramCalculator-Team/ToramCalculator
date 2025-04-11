import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, recipe_ingredient } from "~/../db/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface RecipeIngredient extends DataType<recipe_ingredient> {}

export function recipeIngredientSubRelations(eb: ExpressionBuilder<DB, "recipe_ingredient">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("recipe_ingredient").where("recipe_ingredient.recipeId", "=", id).selectAll("recipe_ingredient"),
    ).as("recipeEntries"),
  ];
}

export async function findRecipeIngredientById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .where("id", "=", id)
    .selectAll("recipe_ingredient")
    .select((eb) => recipeIngredientSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findRecipeIngredients() {
  const db = await getDB();
  return await db.selectFrom("recipe_ingredient").selectAll("recipe_ingredient").execute();
}

export async function updateRecipeIngredient(id: string, updateWith: RecipeIngredient["Update"]) {
  const db = await getDB();
  return await db
    .updateTable("recipe_ingredient")
    .set(updateWith)
    .where("recipe_ingredient.id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function insertRecipeIngredient(trx: Transaction<DB>, newRecipe: RecipeIngredient["Insert"]) {
  const recipeIngredient = await trx
    .insertInto("recipe_ingredient")
    .values(newRecipe)
    .returningAll()
    .executeTakeFirstOrThrow();
  return recipeIngredient;
}

export async function deleteRecipeIngredient(id: string) {
  const db = await getDB();
  return await db
    .deleteFrom("recipe_ingredient")
    .where("recipe_ingredient.id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export const defaultRecipeIngredient: RecipeIngredient["Select"] = {
  id: "",
  count: 0,
  type: "Gold",
  itemId: "",
  recipeId: "",
};

export const RecipeIngredientDic = (locale: Locale): ConvertToAllString<RecipeIngredient["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "配方项",
        id: "ID",
        itemId: "道具ID",
        count: "数量",
        type: "类型",
        recipeId: "所属配方ID",
      };
    case "zh-TW":
      return {
        selfName: "配方項",
        id: "ID",
        itemId: "道具ID",
        count: "數量",
        type: "類型",
        recipeId: "所屬配方ID",
      };
    case "en":
      return {
        selfName: "Recipe Item",
        id: "ID",
        itemId: "Item ID",
        count: "Count",
        type: "Type",
        recipeId: "Recipe ID",
      };
    case "ja":
      return {
        selfName: "レシピアイテム",
        id: "ID",
        itemId: "アイテムID",
        count: "数",
        type: "タイプ",
        recipeId: "レシピID",
      };
  }
};
