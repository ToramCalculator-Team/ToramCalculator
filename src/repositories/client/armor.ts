import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { db } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { armor, crystal, DB, image, item, recipe, recipe_ingredient } from "../../../db/clientDB/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";

export interface Armor extends DataType<armor> {
  MainTable: Awaited<ReturnType<typeof findArmors>>[number];
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

export async function findArmorByItemId(id: string) {
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .where("item.id", "=", id)
    .selectAll("armor")
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findArmors() {
  return await db
    .selectFrom("armor")
    .innerJoin("item", "item.id", "armor.itemId")
    .selectAll(["item", "armor"])
    .execute();
}

export async function updateArmor(id: string, updateWith: Armor["Update"]) {
  return await db.updateTable("armor").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertArmor(trx: Transaction<DB>, newArmor: Armor["Insert"]) {
  const armor = await db.insertInto("armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
  return armor;
}

export async function createArmor(
  newArmor: item & {
    armor: armor & {
      defaultCrystals: crystal[];
      image: image;
    };
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  return await db.transaction().execute(async (trx) => {
    const { armor: _armorInput, repice: recipeInput, ...itemInput } = newArmor;
    const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...armorInput } = _armorInput;
    const { ingredients: recipeIngredientsInput } = recipeInput;
    const image = await insertImage(trx, imageInput);
    const defaultCrystals = await Promise.all(defaultCrystalsInput.map((crystal) => insertCrystal(trx, crystal)));
    const recipe = await insertRecipe(trx, { ...recipeInput, id: createId() });
    const recipeIngredients = await Promise.all(
      recipeIngredientsInput.map((ingredient) => insertRecipeIngredient(trx, { ...ingredient, recipeId: recipe.id })),
    );
    const statistic = await insertStatistic(trx);
    const item = await insertItem(trx, {
      ...itemInput,
      id: createId(),
      statisticId: statistic.id,
    });
    const armor = await insertArmor(trx, {
      ...armorInput,
      itemId: item.id,
    });
    return {
      ...item,
      armor: {
        ...armor,
        defaultCrystals,
        image,
      },
      recipe: {
        ...recipe,
        ingredients: recipeIngredients,
      },
    };
  });
}

export async function deleteArmor(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmor: Armor["Select"] = {
  modifiers: [],
  itemId: "",
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
};

// Dictionary
export const ArmorDic = (locale: Locale): ConvertToAllString<Armor["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        modifiers: "属性",
        itemId: "所属道具ID",
        baseDef: "防御力",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
        selfName: "防具装备",
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        modifiers: "屬性",
        itemId: "所屬道具ID",
        baseDef: "防禦力",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
      };
    case "en":
      return {
        selfName: "Armor",
        modifiers: "Modifiers",
        itemId: "ItemId",
        baseDef: "Base Def",
        colorA: "Color A",
        colorB: "Color B",
        colorC: "Color C",
      };
    case "ja":
      return {
        selfName: "鎧",
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        baseDef: "防御力",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
      };
  }
};
