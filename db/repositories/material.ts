import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DataType } from "./untils";
import { material, DB, item, recipe, recipe_ingredient } from "../generated/kysely/kyesely";

export interface Material extends DataType<material> {
  MainTable: Awaited<ReturnType<typeof findMaterials>>[number];
  MainForm: material;
  Card: Awaited<ReturnType<typeof findMaterialById>>;
}

export function materialSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findMaterialById(id: string) {
  const db = await getDB();
  return await db.selectFrom("material").where("itemId", "=", id).selectAll("material").executeTakeFirstOrThrow();
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

export async function findItemWithMaterialById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("material", "material.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "material"])
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

export async function deleteMaterial(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function insertMaterial(trx: Transaction<DB>, newMaterial: Material["Insert"]) {
  const material = await trx.insertInto("material").values(newMaterial).returningAll().executeTakeFirstOrThrow();
  return material;
}

export async function createMaterial(trx: Transaction<DB>, newMaterial: Material["Insert"]) {
  const material = await insertMaterial(trx, newMaterial);
  return material;
}
