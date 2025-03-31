import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { db } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic, StatisticDic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { special, crystal, DB, image, item, recipe, recipe_ingredient } from "../../../db/clientDB/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";

export interface SpeEquip extends DataType<special> {
  MainTable: Awaited<ReturnType<typeof findSpeEquips>>[number]
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

export async function findSpeEquipByItemId(id: string) {
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .where("item.id", "=", id)
    .selectAll("special")
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSpeEquips() {
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .selectAll(["item", "special"])
    .execute();
}

export async function updateSpeEquip(id: string, updateWith: SpeEquip["Update"]) {
  return await db.updateTable("special").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertSpeEquip(trx: Transaction<DB>, newSpeEquip: SpeEquip["Insert"]) {
  const speEquip = await db.insertInto("special").values(newSpeEquip).returningAll().executeTakeFirstOrThrow();
  return speEquip;
}

export async function createSpeEquip(
  newSpeEquip: item & {
    speEquip: special & {
      defaultCrystals: crystal[];
      image: image;
    };
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  return await db.transaction().execute(async (trx) => {
    const { speEquip: _speEquipInput, repice: recipeInput, ...itemInput } = newSpeEquip;
    const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...speEquipInput } = _speEquipInput;
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
      statisticId: statistic.id
    });
    const speEquip = await insertSpeEquip(trx, {
      ...speEquipInput,
      itemId: item.id,
    });
    return {
      ...item,
      speEquip: {
        ...speEquip,
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

export async function deleteSpeEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSpeEquip: SpeEquip["Insert"] = {
  modifiers: [],
  itemId: "defaultSpeEquipId",
  baseDef: 0,
};

// Dictionary
export const SpeEquipDic = (locale: Locale): ConvertToAllString<SpeEquip["Insert"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "特殊装备",
        modifiers: "属性",
        itemId: "所属道具ID",
        baseDef: "防御力",
      };
    case "zh-TW":
      return {
        selfName: "特殊裝備",
        modifiers: "屬性",
        itemId: "所屬道具ID",
        baseDef: "防禦力",
      };
    case "en":
      return {
        selfName: "Special Equipment",
        modifiers: "Modifiers",
        itemId: "ItemId",
        baseDef: "Base Def",
      };
    case "ja":
      return {
        selfName: "特殊装備",
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        baseDef: "防御力",
      };
  }
};
