import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, combo } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { z } from "zod/v3";
import { comboSchema, combo_stepSchema } from "../generated/zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Combo = Selectable<combo>;
export type ComboInsert = Insertable<combo>;
export type ComboUpdate = Updateable<combo>;

// 子关系定义
const comboSubRelationDefs = defineRelations({
  steps: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("combo_step")
          .whereRef("combo_step.comboId", "=", "combo.id")
          .selectAll("combo_step")
      ).$notNull().as("steps"),
    schema: z.array(combo_stepSchema).describe("连击步骤列表"),
  },
});

// 生成 factory
export const comboRelationsFactory = makeRelations<"combo", typeof comboSubRelationDefs>(
  comboSubRelationDefs
);

// 构造关系Schema
export const ComboWithRelationsSchema = z.object({
  ...comboSchema.shape,
  ...comboRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const comboSubRelations = comboRelationsFactory.subRelations;

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

// 特殊查询方法
export async function findComboWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ComboWithRelations = Awaited<ReturnType<typeof findComboWithRelations>>;
