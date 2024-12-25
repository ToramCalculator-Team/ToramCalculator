import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, recipe } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultWeapons } from "./weapon";
import { defaultAddEquip } from "./addEquip";
import { defaultArmor } from "./armor";
import { defaultSpeEquip } from "./speEquip";
import { defaultConsumable } from "./consumable";
import { WeaponType } from "./enums";

export type Recipe = Awaited<ReturnType<typeof findRecipeById>>;
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

const defaultRecipeWeaponShared = {
  armorId: null,
  activityId: null,
  recipeEntries: [],
  addEquipId: null,
  speEquipId: null,
  consumableId: null,
};

// default
export const defaultRecipes: Record<WeaponType | "armor" | "addEquip" | "speEquip" | "consumable", Recipe> = {
  OneHandSword: {
    id: "defaultOneHandRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  TwoHandSword: {
    id: "defaultTwoHandRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Bow: {
    id: "defaultBowRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Bowgun: {
    id: "defaultBowgunRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Rod: {
    id: "defaultRodRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Magictool: {
    id: "defaultMagictoolRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Knuckle: {
    id: "defaultKnuckleRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Halberd: {
    id: "defaultHalberdRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Katana: {
    id: "defaultKatanaRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Arrow: {
    id: "defaultArrowRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  ShortSword: {
    id: "defaultShortSwordRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  NinjutsuScroll: {
    id: "defaultNinjutsuScrollRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  Shield: {
    id: "defaultShieldRecipe",
    weaponId: "",
    ...defaultRecipeWeaponShared
  },
  armor: {
    id: "defaultArmorRecipe",
    armorId: "",
    activityId: null,
    recipeEntries: [],
    weaponId: null,
    addEquipId: null,
    speEquipId: null,
    consumableId: null,
  },
  addEquip: {
    id: "defaultAddEquipRecipe",
    activityId: null,
    recipeEntries: [],
    weaponId: null,
    armorId: null,
    addEquipId: "",
    speEquipId: null,
    consumableId: null,
  },
  speEquip: {
    id: "defaultSpeEquipRecipe",
    activityId: null,
    recipeEntries: [],
    weaponId: null,
    armorId: null,
    addEquipId: null,
    speEquipId: "",
    consumableId: null,
  },
  consumable: {
    id: "defaultConsumableRecipe",
    activityId: null,
    recipeEntries: [],
    weaponId: null,
    armorId: null,
    addEquipId: null,
    speEquipId: null,
    consumableId: "",
  },
};
