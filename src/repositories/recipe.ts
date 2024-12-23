import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, recipe } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultWeapon } from "./weapon";
import { defaultAddEquip } from "./addEquip";
import { defaultArmor } from "./armor";
import { defaultSpeEquip } from "./speEquip";
import { defaultConsumable } from "./consumable";

export type Recipe = Awaited<ReturnType<typeof findRecipeById>>;
export type NewRecipe = Insertable<recipe>;
export type RecipeUpdate = Updateable<recipe>;

export function recipeSubRelations(eb: ExpressionBuilder<DB, "recipe">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("recipe_ingredient").where("recipe_ingredient.recipeId", "=", id).selectAll("recipe_ingredient"),
    ).as("rewardBy"),
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

// default
export const defaultRecipes = {
  weaponRecipe: {
    id: "defaultWeaponRecipe",
    activityId: null,
    rewardBy: [],
    weaponId: defaultWeapon.id,
    armorId: null,
    addEquipId: null,
    speEquipId: null,
    consumableId: null,
  } satisfies Recipe,
  armorRecipe: {
    id: "defaultArmorRecipe",
    activityId: null,
    rewardBy: [],
    weaponId: null,
    armorId: defaultArmor.id,
    addEquipId: null,
    speEquipId: null,
    consumableId: null,
  } satisfies Recipe,
  addEquipRecipe: {
    id: "defaultAddEquipRecipe",
    activityId: null,
    rewardBy: [],
    weaponId: null,
    armorId: null,
    addEquipId: defaultAddEquip.id,
    speEquipId: null,
    consumableId: null,
  } satisfies Recipe,
  speEquipRecipe: {
    id: "defaultSpeEquipRecipe",
    activityId: null,
    rewardBy: [],
    weaponId: null,
    armorId: null,
    addEquipId: null,
    speEquipId: defaultSpeEquip.id,
    consumableId: null,
  } satisfies Recipe,
  consumableRecipe: {
    id: "defaultConsumableRecipe",
    activityId: null,
    rewardBy: [],
    weaponId: null,
    armorId: null,
    addEquipId: null,
    speEquipId: null,
    consumableId: defaultConsumable.id,
  } satisfies Recipe,
};
