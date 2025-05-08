import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { weapon, crystal, DB, image, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { findItemById, insertItem } from "./item";

export interface Weapon extends DataType<weapon> {
  MainTable: Awaited<ReturnType<typeof findWeapons>>[number];
  Card: Awaited<ReturnType<typeof findWeaponById>>;
}

export function weaponSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalToplayer_weapon")
        .innerJoin("crystal", "_crystalToplayer_weapon.A", "crystal.itemId")
        .where("_crystalToplayer_weapon.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

export async function findItemWithWeaponById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "weapon.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "weapon"])
    .executeTakeFirstOrThrow();
}

export async function findWeaponById(id: string) {
  const db = await getDB();
  return await db.selectFrom("weapon").where("itemId", "=", id).selectAll("weapon").executeTakeFirstOrThrow();
}

export async function findWeapons() {
  const db = await getDB();
  return await db
    .selectFrom("weapon")
    .innerJoin("item", "item.id", "weapon.itemId")
    .selectAll(["weapon", "item"])
    .execute();
}

export async function updateWeapon(id: string, updateWith: Weapon["Update"]) {
  const db = await getDB();
  return await db.updateTable("weapon").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertWeapon(trx: Transaction<DB>, newWeapon: Weapon["Insert"]) {
  const weapon = await trx.insertInto("weapon").values(newWeapon).returningAll().executeTakeFirstOrThrow();
  return weapon;
}

export async function createWeapon(trx: Transaction<DB>, newWeapon: Weapon["Insert"]) {
  const weapon = await insertWeapon(trx, newWeapon);
  return weapon;
}

// export async function createWeapon(
//   newWeapon: item & {
//     weapon: weapon & {
//       defaultCrystals: crystal[];
//       image: image;
//     };
//     repice: recipe & {
//       ingredients: recipe_ingredient[];
//     };
//   },
// ) {
//   const db = await getDB();
//   return await db.transaction().execute(async (trx) => {
//     const { weapon: _weaponInput, repice: recipeInput, ...itemInput } = newWeapon;
//     const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...weaponInput } = _weaponInput;
//     const { ingredients: recipeIngredientsInput } = recipeInput;
//     const image = await insertImage(trx, imageInput);
//     const defaultCrystals = await Promise.all(defaultCrystalsInput.map((crystal) => insertCrystal(trx, crystal)));
//     const recipe = await insertRecipe(trx, { ...recipeInput, id: createId() });
//     const recipeIngredients = await Promise.all(
//       recipeIngredientsInput.map((ingredient) => insertRecipeIngredient(trx, { ...ingredient, recipeId: recipe.id })),
//     );
//     const statistic = await insertStatistic(trx);
//     const item = await insertItem(trx, {
//       ...itemInput,
//       id: createId(),
//       statisticId: statistic.id,
//     });
//     const weapon = await insertWeapon(trx, {
//       ...weaponInput,
//       itemId: item.id,
//     });
//     return {
//       ...item,
//       weapon: {
//         ...weapon,
//         defaultCrystals,
//         image,
//       },
//       recipe: {
//         ...recipe,
//         ingredients: recipeIngredients,
//       },
//     };
//   });
// }

export async function deleteWeapon(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
