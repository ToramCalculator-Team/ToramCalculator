import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { modifier } from "~/repositories/db/types";

export type Modifier = Awaited<ReturnType<typeof findModifierById>>;
export type NewModifier = Insertable<modifier>;
export type ModifierUpdate = Updateable<modifier>;

export async function findModifierById(id: string) {
  return await db.selectFrom("modifier").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

export async function updateModifier(id: string, updateWith: ModifierUpdate) {
  return await db.updateTable("modifier").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createModifier(newModifier: NewModifier) {
  return await db.insertInto("modifier").values(newModifier).returningAll().executeTakeFirst();
}

export async function deleteModifier(id: string) {
  return await db.deleteFrom("modifier").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultModifier: Modifier = {
  id: "",
  formula: "",
  belongToModifierListId: "",
};