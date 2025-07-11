import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { special, crystal, DB, image, item, recipe, recipe_ingredient } from "../../db/generated/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";

export interface Special extends DataType<special> {
  MainTable: Awaited<ReturnType<typeof findSpecials>>[number];
}

export function speEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTospecial")
        .innerJoin("crystal", "_crystalTospecial.A", "crystal.itemId")
        .where("_crystalTospecial.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

export async function findSpecialByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .where("item.id", "=", id)
    .selectAll(["special", "item"])
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSpecials() {
  const db = await getDB();
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .selectAll(["item", "special"])
    .execute();
}

export async function updateSpecial(id: string, updateWith: Special["Update"]) {
  const db = await getDB();
  return await db.updateTable("special").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertSpecial(trx: Transaction<DB>, newSpecial: Special["Insert"]) {
  const speEquip = await trx.insertInto("special").values(newSpecial).returningAll().executeTakeFirstOrThrow();
  return speEquip;
}

export async function createSpecial(trx: Transaction<DB>, newSpecial: Special["Insert"]) {
  const speEquip = await insertSpecial(trx, newSpecial);
  return speEquip;
}

// export async function createSpecial(
//   newSpecial: item & {
//     speEquip: special & {
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
//     const { speEquip: _speEquipInput, repice: recipeInput, ...itemInput } = newSpecial;
//     const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...speEquipInput } = _speEquipInput;
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
//     const speEquip = await insertSpecial(trx, {
//       ...speEquipInput,
//       itemId: item.id,
//     });
//     return {
//       ...item,
//       speEquip: {
//         ...speEquip,
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

export async function deleteSpecial(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
