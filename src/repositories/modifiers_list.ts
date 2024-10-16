import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, modifiers_list } from "~/repositories/db/types";
import { defaultModifier, NewModifier } from "./modifier";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export type ModifiersList = Awaited<ReturnType<typeof findModifiersListById>>;
export type NewModifiersList = Insertable<modifiers_list>;
export type ModifiersListUpdate = Updateable<modifiers_list>;

export function modifiersListSubRelations(eb:ExpressionBuilder<DB, "modifiers_list">,modifiers_listId: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("modifier")
        .whereRef("modifier.belongToModifiersListId", "=", modifiers_listId)
        .selectAll("modifier")
    ).as("modifiers"),
  ];
}

export async function findModifiersListById(id: string) {
  return await db
    .selectFrom("modifiers_list")
    .where("id", "=", id)
    .selectAll("modifiers_list")
    .select((eb) => modifiersListSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
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
