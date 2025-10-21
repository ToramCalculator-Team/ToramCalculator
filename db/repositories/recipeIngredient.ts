import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, recipe_ingredient } from "@db/generated/zod/index";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { recipe_ingredientSchema } from "../generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type RecipeIngredient = Selectable<recipe_ingredient>;
export type RecipeIngredientInsert = Insertable<recipe_ingredient>;
export type RecipeIngredientUpdate = Updateable<recipe_ingredient>;

// 子关系定义
const recipeIngredientSubRelationDefs = defineRelations({});

// 生成 factory
export const recipeIngredientRelationsFactory = makeRelations(
  recipeIngredientSubRelationDefs
);

// 构造关系Schema
export const RecipeIngredientWithRelationsSchema = z.object({
  ...recipe_ingredientSchema.shape,
  ...recipeIngredientRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const recipeIngredientSubRelations = recipeIngredientRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findRecipeIngredientById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .where("id", "=", id)
    .selectAll("recipe_ingredient")
    .executeTakeFirst() || null;
}

export async function findRecipeIngredients(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .selectAll("recipe_ingredient")
    .execute();
}

export async function insertRecipeIngredient(trx: Transaction<DB>, data: RecipeIngredientInsert) {
  return await trx
    .insertInto("recipe_ingredient")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createRecipeIngredient(trx: Transaction<DB>, data: RecipeIngredientInsert) {
  // 注意：createRecipeIngredient 内部自己处理事务，所以我们需要在外部事务中直接插入
  const recipeIngredient = await trx
    .insertInto("recipe_ingredient")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return recipeIngredient;
}

export async function updateRecipeIngredient(trx: Transaction<DB>, id: string, data: RecipeIngredientUpdate) {
  return await trx
    .updateTable("recipe_ingredient")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteRecipeIngredient(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("recipe_ingredient")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findRecipeIngredientWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .where("id", "=", id)
    .selectAll("recipe_ingredient")
    .select((eb) => recipeIngredientSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type RecipeIngredientWithRelations = Awaited<ReturnType<typeof findRecipeIngredientWithRelations>>;
