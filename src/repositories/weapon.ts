import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { weapon, crystal, DB, image, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";

export interface Weapon extends DataType<weapon> {
  MainTable: Awaited<ReturnType<typeof findWeapons>>[number];
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

export async function findWeaponByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("weapon")
    .innerJoin("item", "item.id", "weapon.itemId")
    .where("item.id", "=", id)
    .selectAll("weapon")
    .select((eb) => weaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findWeapons() {
  const db = await getDB();
  return await db
    .selectFrom("weapon")
    .innerJoin("item", "item.id", "weapon.itemId")
    .selectAll(["item", "weapon"])
    .execute();
}

export async function updateWeapon(id: string, updateWith: Weapon["Update"]) {
  const db = await getDB();
  return await db.updateTable("weapon").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertWeapon(trx: Transaction<DB>, newWeapon: Weapon["Insert"]) {
  const db = await getDB();
  const weapon = await db.insertInto("weapon").values(newWeapon).returningAll().executeTakeFirstOrThrow();
  return weapon;
}

export async function createWeapon(
  newWeapon: item & {
    weapon: weapon & {
      defaultCrystals: crystal[];
      image: image;
    };
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const { weapon: _weaponInput, repice: recipeInput, ...itemInput } = newWeapon;
    const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...weaponInput } = _weaponInput;
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
    const weapon = await insertWeapon(trx, {
      ...weaponInput,
      itemId: item.id,
    });
    return {
      ...item,
      weapon: {
        ...weapon,
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

export async function deleteWeapon(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultWeapon: Weapon["Select"] = {
  modifiers: [],
  itemId: "",
  type: "Magictool",
  stability: 0,
  elementType: "Normal",
  baseAbi: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
};

// Dictionary
export const WeaponDic = (locale: Locale): ConvertToAllString<Weapon["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        modifiers: "属性",
        itemId: "所属道具ID",
        type: "武器类型",
        stability: "稳定率",
        elementType: "觉醒属性",
        baseAbi: "攻击力",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
        selfName: "武器",
      };
    case "zh-TW":
      return {
        selfName: "武器",
        modifiers: "屬性",
        type: "武器類型",
        stability: "穩定率",
        elementType: "觉醒屬性",
        itemId: "所屬道具ID",
        baseAbi: "攻擊力",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
      };
    case "en":
      return {
        selfName: "Weapon",
        modifiers: "Modifiers",
        type: "Type",
        stability: "Stability",
        elementType: "Element Type",
        itemId: "ItemId",
        baseAbi: "Base Abi",
        colorA: "Color A",
        colorB: "Color B",
        colorC: "Color C",
      };
    case "ja":
      return {
        selfName: "武器",
        modifiers: "補正項目",
        type: "武器タイプ",
        stability: "スタビリティ",
        elementType: "觉醒属性",
        itemId: "所属アイテムID",
        baseAbi: "基本攻撃力",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
      };
  }
};
