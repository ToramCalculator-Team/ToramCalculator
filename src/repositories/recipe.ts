import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, recipe } from "~/../db/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { ItemType } from "~/../db/kysely/enums";
import { ITEM_TYPE } from "~/../db/enums";

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

const recipes: Partial<Record<ItemType, Recipe["templateId"]>> = {};
for (const key of ITEM_TYPE) {
  const recipeWeaponShared = {
    weaponId: "",
    armorId: "",
    activityId: "",
    recipeEntries: [],
    optEquipId: "",
    speEquipId: "",
    consumableId: "",
  };
  recipes[key] = {
    id: ``,
    itemId: ``,
    ...recipeWeaponShared,
  };
}

export const defaultRecipes = recipes as Record<ItemType, Recipe["templateId"]>;

export const RecipeDic = (locale: Locale): ConvertToAllString<Recipe["templateId"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "配方",
        id: "ID",
        activityId: "所属活动ID",
        itemId: "所属道具ID",
      };
    case "zh-TW":
      return {
        selfName: "配方",
        id: "ID",
        activityId: "所屬活動ID",
        itemId: "所屬道具ID",
      };
    case "en":
      return {
        selfName: "Recipe",
        id: "ID",
        activityId: "Activity ID",
        itemId: "Item ID",
      };
    case "ja":
      return {
        selfName: "レシピ",
        id: "ID",
        activityId: "アクティビティID",
        itemId: "アイテムID",
      };
  }
};
