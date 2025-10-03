import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, combo } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod/v3";
import { comboSchema, combo_stepSchema } from "../generated/zod";

// 1. 类型定义
export type Combo = Selectable<combo>;
export type ComboInsert = Insertable<combo>;
export type ComboUpdate = Updateable<combo>;
// 关联查询类型
export type ComboWithRelations = Awaited<ReturnType<typeof findComboWithRelations>>;
export const ComboRelationsSchema = z.object({
  ...comboSchema.shape,
  steps: z.array(combo_stepSchema),
});

// 2. 关联查询定义
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

// 3. 基础 CRUD 方法
export async function findComboById(id: string): Promise<Combo | null> {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .executeTakeFirst() || null;
}

export async function findCombos(): Promise<Combo[]> {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .selectAll("combo")
    .execute();
}

export async function insertCombo(trx: Transaction<DB>, data: ComboInsert): Promise<Combo> {
  return await trx
    .insertInto("combo")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createCombo(trx: Transaction<DB>, data: ComboInsert): Promise<Combo> {
  return await trx
    .insertInto("combo")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateCombo(trx: Transaction<DB>, id: string, data: ComboUpdate): Promise<Combo> {
  return await trx
    .updateTable("combo")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteCombo(trx: Transaction<DB>, id: string): Promise<Combo | null> {
  return await trx
    .deleteFrom("combo")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findComboWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
