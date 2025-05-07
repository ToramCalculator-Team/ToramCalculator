import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import {  DataType } from "./untils";
import { crystal, DB, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";

export interface Crystal extends DataType<crystal> {
  MainTable: Awaited<ReturnType<typeof findCrystals>>[number];
  MainForm: crystal;
}

export function crystalSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_backRelation")
        .innerJoin("crystal", "_backRelation.B", "crystal.itemId")
        .innerJoin("item", "_backRelation.A", "item.id")
        .whereRef("item.id", "=", "crystal.itemId")
        .selectAll("item"),
    ).as("backs"),
    jsonArrayFrom(
      eb
        .selectFrom("_frontRelation")
        .innerJoin("crystal", "_frontRelation.B", "crystal.itemId")
        .innerJoin("item", "_frontRelation.A", "item.id")
        .whereRef("item.id", "=", "crystal.itemId")
        .selectAll("item"),
    ).as("fronts"),
  ];
}

export async function findCrystalByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .where("item.id", "=", id)
    .selectAll("crystal")
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findCrystals() {
  const db = await getDB();
  return await db
    .selectFrom("crystal")
    .innerJoin("item", "item.id", "crystal.itemId")
    .selectAll(["item", "crystal"])
    .execute();
}

export async function updateCrystal(id: string, updateWith: Crystal["Update"]) {
  const db = await getDB();
  return await db.updateTable("crystal").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertCrystal(trx: Transaction<DB>, newCrystal: Crystal["Insert"]) {
  const db = await getDB();
  const crystal = await db.insertInto("crystal").values(newCrystal).returningAll().executeTakeFirstOrThrow();
  return crystal;
}

export async function deleteCrystal(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createCrystal(
  newCrystal: item & {
    crystal: crystal & {
      front: string;
      back: string;
    };
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {});
}