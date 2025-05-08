import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DataType } from "./untils";
import { consumable, DB, item, recipe, recipe_ingredient } from "~/../db/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

export interface Consumable extends DataType<consumable> {
  MainTable: Awaited<ReturnType<typeof findConsumables>>[number];
  MainForm: consumable;
  Card: Awaited<ReturnType<typeof findConsumableById>>;
}

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findConsumableById(id: string) {
  const db = await getDB();
  return await db.selectFrom("consumable").where("itemId", "=", id).selectAll("consumable").executeTakeFirstOrThrow();
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

export async function findItemWithConsumableById(itemId: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "consumable.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "consumable"])
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

export async function createConsumable(trx: Transaction<DB>, newConsumable: Consumable["Insert"]) {
  return await trx.insertInto("consumable").values(newConsumable).returningAll().executeTakeFirstOrThrow();
}
