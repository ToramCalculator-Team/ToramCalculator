import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, modifier_list } from "~/repositories/db/types";
import { defaultModifier, NewModifier } from "./modifier";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export type ModifierList = Awaited<ReturnType<typeof findModifierListById>>;
export type NewModifierList = Insertable<modifier_list>;
export type ModifierListUpdate = Updateable<modifier_list>;

export function modifierListSubRelations(eb:ExpressionBuilder<DB, "modifier_list">,modifier_listId: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("modifier")
        .whereRef("modifier.belongToModifierListId", "=", modifier_listId)
        .selectAll("modifier")
    ).$notNull().as("modifiers"),
  ];
}

export async function findModifierListById(id: string) {
  return await db
    .selectFrom("modifier_list")
    .where("id", "=", id)
    .selectAll("modifier_list")
    .select((eb) => modifierListSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateModifierList(id: string, updateWith: ModifierListUpdate) {
  return await db.updateTable("modifier_list").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createModifierList(newModifierList: NewModifierList) {
  return await db.transaction().execute(async (trx) => {
    const modifier_list = await trx
      .insertInto("modifier_list")
      .values(newModifierList)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifiers: NewModifier[] = [];
    return { ...modifier_list, modifiers: modifiers };
  });
}

export async function deleteModifierList(id: string) {
  return await db.deleteFrom("modifier_list").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultModifierList: ModifierList = {
  id: "defaultSelectModifierList",
  name: "defaultSelectModifierList",
  modifiers: [defaultModifier],
};
