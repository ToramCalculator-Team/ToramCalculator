import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, recipe } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { RECIPE_TYPE, type Enums } from "./enums";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";

export type Recipe = ModifyKeys<Awaited<ReturnType<typeof findRecipeById>>, {
  
}>;
export type NewRecipe = Insertable<recipe>;
export type RecipeUpdate = Updateable<recipe>;

export function recipeSubRelations(eb: ExpressionBuilder<DB, "recipe">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("recipe_ingredient").where("recipe_ingredient.recipeId", "=", id).selectAll("recipe_ingredient"),
    ).as("recipeEntries"),
  ];
}

export async function findRecipeById(id: string) {
  return await db
    .selectFrom("recipe")
    .where("id", "=", id)
    .selectAll("recipe")
    .select((eb) => recipeSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateRecipe(id: string, updateWith: RecipeUpdate) {
  return await db.updateTable("recipe").set(updateWith).where("recipe.id", "=", id).returningAll().executeTakeFirst();
}

export async function createRecipe(newRecipe: NewRecipe) {
  return await db.transaction().execute(async (trx) => {
    const recipe = await trx.insertInto("recipe").values(newRecipe).returningAll().executeTakeFirstOrThrow();
    return recipe;
  });
}

export async function deleteRecipe(id: string) {
  return await db.deleteFrom("recipe").where("recipe.id", "=", id).returningAll().executeTakeFirst();
}

const recipes: Partial<Record<Enums["RecipeType"], Recipe>> = {};
for (const key of RECIPE_TYPE) {
  const recipeWeaponShared = {
    weaponId: "",
    armorId: "",
    activityId: "",
    recipeEntries: [],
    addEquipId: "",
    speEquipId: "",
    consumableId: "",
  };
  recipes[key] = {
    id: `default${key}StatisticId`,
    ...recipeWeaponShared,
  };
}

export const defaultRecipes = recipes as Record<Enums["RecipeType"], Recipe>;

export const RecipeDic = (locale: Locale): ConvertToAllString<Recipe> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "账号",
        id: "defaultConsumableRecipe",
        activityId: "null",
        recipeEntries: "[]",
        weaponId: "null",
        armorId: "null",
        addEquipId: "null",
        speEquipId: "null",
        consumableId: "",
      };
    case "zh-TW":
      return {
        selfName: "账号",
        id: "defaultConsumableRecipe",
        activityId: "null",
        recipeEntries: "[]",
        weaponId: "null",
        armorId: "null",
        addEquipId: "null",
        speEquipId: "null",
        consumableId: "",
      };
    case "en":
      return {
        selfName: "账号",
        id: "defaultConsumableRecipe",
        activityId: "null",
        recipeEntries: "[]",
        weaponId: "null",
        armorId: "null",
        addEquipId: "null",
        speEquipId: "null",
        consumableId: "",
      };
    case "ja":
      return {
        selfName: "账号",
        id: "defaultConsumableRecipe",
        activityId: "null",
        recipeEntries: "[]",
        weaponId: "null",
        armorId: "null",
        addEquipId: "null",
        speEquipId: "null",
        consumableId: "",
      };
  }
};
