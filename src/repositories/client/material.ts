import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { db } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic, StatisticDic } from "./statistic";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { material, DB, image, item, recipe, recipe_ingredient } from "../../../db/clientDB/kysely/kyesely";
import { MaterialType } from "../../../db/clientDB/kysely/enums";

export interface Material extends DataType<material> { 
    MainTable: Awaited<ReturnType<typeof findMaterials>>[number]
    MainForm: material
}

export function materialSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findMaterialByItemId(id: string) {
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .where("item.id", "=", id)
    .selectAll("material")
    .select((eb) => materialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMaterials() {
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .selectAll(["item", "material"])
    .execute();
}

export async function updateMaterial(id: string, updateWith: Material["Update"]) {
  return await db.updateTable("material").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertMaterial(trx: Transaction<DB>, newMaterial: Material["Insert"]) {
  const material = await db.insertInto("material").values(newMaterial).returningAll().executeTakeFirstOrThrow();
  return material;
}

export async function deleteMaterial(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createMaterial(
  newMaterial: item & {
    material: material;
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  return await db.transaction().execute(async (trx) => {

  });
}

// default
export const defaultMaterial: Record<MaterialType, Material["Insert"]> = {
  Magic: {
    itemId: "defaultMaterialId",
    type: "Magic",
    ptValue: 0,
    price: 0,
  },
  Cloth: {
    itemId: "defaultMaterialId",
    type: "Cloth",
    ptValue: 0,
    price: 0,
  },
  Beast: {
    itemId: "defaultMaterialId",
    type: "Beast",
    ptValue: 0,
    price: 0,
  },
  Wood: {
    itemId: "defaultMaterialId",
    type: "Wood",
    ptValue: 0,
    price: 0,
  },
  Drug: {
    itemId: "defaultMaterialId",
    type: "Drug",
    ptValue: 0,
    price: 0,
  },
  Metal: {
    itemId: "defaultMaterialId",
    type: "Metal",
    ptValue: 0,
    price: 0,
  }
};
