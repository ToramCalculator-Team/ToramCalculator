import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DataType } from "./untils";
import { material, DB, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";
import { MaterialType } from "~/../db/kysely/enums";

export interface Material extends DataType<material> { 
    MainTable: Awaited<ReturnType<typeof findMaterials>>[number]
    MainForm: material
}

export function materialSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findMaterialByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .where("item.id", "=", id)
    .selectAll("material")
    .select((eb) => materialSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMaterials() {
  const db = await getDB();
  return await db
    .selectFrom("material")
    .innerJoin("item", "item.id", "material.itemId")
    .selectAll(["item", "material"])
    .execute();
}

export async function updateMaterial(id: string, updateWith: Material["Update"]) {
  const db = await getDB();
  return await db.updateTable("material").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertMaterial(trx: Transaction<DB>, newMaterial: Material["Insert"]) {
  const db = await getDB();
  const material = await db.insertInto("material").values(newMaterial).returningAll().executeTakeFirstOrThrow();
  return material;
}

export async function deleteMaterial(id: string) {
  const db = await getDB();
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
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {

  });
}

// default
export const defaultMaterial: Record<MaterialType, Material["Select"]> = {
  Magic: {
    itemId: "",
    type: "Magic",
    ptValue: 0,
    price: 0,
  },
  Cloth: {
    itemId: "",
    type: "Cloth",
    ptValue: 0,
    price: 0,
  },
  Beast: {
    itemId: "",
    type: "Beast",
    ptValue: 0,
    price: 0,
  },
  Wood: {
    itemId: "",
    type: "Wood",
    ptValue: 0,
    price: 0,
  },
  Drug: {
    itemId: "",
    type: "Drug",
    ptValue: 0,
    price: 0,
  },
  Metal: {
    itemId: "",
    type: "Metal",
    ptValue: 0,
    price: 0,
  }
};
