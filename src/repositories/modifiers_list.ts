import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { modifiers_list } from "~/repositories/db/types";
import { defaultModifier, NewModifier } from "./modifier";

export type ModifiersList = Awaited<ReturnType<typeof findModifiersListById>>;
export type NewModifiersList = Insertable<modifiers_list>;
export type ModifiersListUpdate = Updateable<modifiers_list>;

export async function findModifiersListById(id: string) {
  const modifiers_list = await db
    .selectFrom("modifiers_list")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
  const modifiers = await db
    .selectFrom("modifier")
    .where("belongToModifiersListId", "=", modifiers_list.id)
    .selectAll()
    .execute();

  return { ...modifiers_list, modifiers };
}

export async function updateModifiersList(id: string, updateWith: ModifiersListUpdate) {
  return await db.updateTable("modifiers_list").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createModifiersList(newModifiersList: NewModifiersList) {
  return await db.transaction().execute(async (trx) => {
    const modifiers_list = await trx
      .insertInto("modifiers_list")
      .values(newModifiersList)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifiers: NewModifier[] = [];
    return { ...modifiers_list, modifiers: modifiers };
  });
}

export async function deleteModifiersList(id: string) {
  return await db.deleteFrom("modifiers_list").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultModifiersList: ModifiersList = {
  id: "defaultSelectModifiersList",
  name: "defaultSelectModifiersList",
  modifiers: [defaultModifier],
};
