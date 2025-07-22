import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { armor, crystal, DB, image, item, recipe, recipe_ingredient } from "../generated/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";

export interface Armor extends DataType<armor> {
  MainTable: Awaited<ReturnType<typeof findArmors>>[number];
  Card: Awaited<ReturnType<typeof findArmorById>>;
}

export function armorSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_armorTocrystal")
        .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
        .where("_armorTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

export async function findArmorById(id: string) {
  const db = await getDB();
  return await db.selectFrom("armor").where("itemId", "=", id).selectAll("armor").executeTakeFirstOrThrow();
}

export async function findArmorByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .where("item.id", "=", id)
    .selectAll("armor")
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithArmorById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("armor", "armor.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "armor"])
    .executeTakeFirstOrThrow();
}

export async function findArmors() {
  const db = await getDB();
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .selectAll(["armor", "item"])
    .execute();
}

export async function updateArmor(id: string, updateWith: Armor["Update"]) {
  const db = await getDB();
  return await db.updateTable("armor").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertArmor(trx: Transaction<DB>, newArmor: Armor["Insert"]) {
  const armor = await trx.insertInto("armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
  return armor;
}

export async function createArmor(trx: Transaction<DB>, newArmor: Armor["Insert"]) {
  const armor = await insertArmor(trx, newArmor);
  return armor;
}

// export async function createArmor(
//   newArmor: item & {
//     armor: armor & {
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
//     const { armor: _armorInput, repice: recipeInput, ...itemInput } = newArmor;
//     const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...armorInput } = _armorInput;
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
//     const armor = await insertArmor(trx, {
//       ...armorInput,
//       itemId: item.id,
//     });
//     return {
//       ...item,
//       armor: {
//         ...armor,
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

export async function deleteArmor(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
