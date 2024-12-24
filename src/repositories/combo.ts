import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, combo } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Combo = Awaited<ReturnType<typeof findComboById>>;
export type NewCombo = Insertable<combo>;
export type ComboUpdate = Updateable<combo>;

export function comboSubRelations(eb: ExpressionBuilder<DB, "combo">, id: Expression<string>) {
  return [];
}

export async function findComboById(id: string) {
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCombo(id: string, updateWith: ComboUpdate) {
  return await db.updateTable("combo").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCombo(newCombo: NewCombo) {
  return await db.transaction().execute(async (trx) => {
    const combo = await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
    return combo;
  });
}

export async function deleteCombo(id: string) {
  return await db.deleteFrom("combo").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCombo: Combo = {
  id: "defaultComboId",
  name: "defaultComboName",
  combo:{},
};
