import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, combo } from "../../db/generated/kysely/kyesely";
import { DataType } from "./untils";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export type ComboWithRelations = Awaited<ReturnType<typeof findComboById>>;

export interface Combo extends DataType<combo> {
  MainTable: Awaited<ReturnType<typeof findCombos>>[number];
  MainForm: combo;
}

export function comboSubRelations(eb: ExpressionBuilder<DB, "combo">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("combo_step")
        .whereRef("combo_step.comboId", "=", "combo.id")
        .selectAll("combo_step")
        // .select((subEb) => combo_stepSubRelations(subEb, subEb.val("combo_step.id"))),
    )
      .$notNull()
      .as("steps"),
  ];
}

export async function findComboById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findCombos() {
  const db = await getDB();
  return await db.selectFrom("combo").selectAll("combo").execute();
}

export async function updateCombo(id: string, updateWith: Combo["Update"]) {
  const db = await getDB();
  return await db.updateTable("combo").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertCombo(trx: Transaction<DB>, newCombo: Combo["Insert"]) {
  return await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
}

export async function createCombo(newCombo: Combo["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const combo = await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
    return combo;
  });
}

export async function deleteCombo(id: string) {
  const db = await getDB();
  return await db.deleteFrom("combo").where("id", "=", id).returningAll().executeTakeFirst();
}
