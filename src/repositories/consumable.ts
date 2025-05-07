import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DataType } from "./untils";
import { consumable, DB, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";

export interface Consumable extends DataType<consumable> { 
    MainTable: Awaited<ReturnType<typeof findConsumables>>[number]
    MainForm: consumable
}

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findConsumableByItemId(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .where("item.id", "=", id)
    .selectAll("consumable")
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findConsumables() {
  const db = await getDB();
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .selectAll(["item", "consumable"])
    .execute();
}

export async function updateConsumable(id: string, updateWith: Consumable["Update"]) {
  const db = await getDB();
  return await db.updateTable("consumable").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertConsumable(trx: Transaction<DB>, newConsumable: Consumable["Insert"]) {
  const db = await getDB();
  const consumable = await db.insertInto("consumable").values(newConsumable).returningAll().executeTakeFirstOrThrow();
  return consumable;
}

export async function deleteConsumable(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(
  newConsumable: item & {
    consumable: consumable;
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {

  });
}