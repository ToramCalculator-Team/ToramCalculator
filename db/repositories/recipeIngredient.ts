import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, recipe_ingredient } from "../generated/kysely/kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type RecipeIngredient = Selectable<recipe_ingredient>;
export type RecipeIngredientInsert = Insertable<recipe_ingredient>;
export type RecipeIngredientUpdate = Updateable<recipe_ingredient>;
// 关联查询类型
export type RecipeIngredientWithRelations = Awaited<ReturnType<typeof findRecipeIngredientWithRelations>>;

// 2. 关联查询定义
export function recipeIngredientSubRelations(eb: ExpressionBuilder<DB, "recipe_ingredient">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("recipe_ingredient")
        .where("recipe_ingredient.recipeId", "=", id)
        .selectAll("recipe_ingredient"),
    ).as("recipeEntries"),
  ];
}

// 3. 基础 CRUD 方法
export async function findRecipeIngredientById(id: string): Promise<RecipeIngredient | null> {
  const db = await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .where("id", "=", id)
    .selectAll("recipe_ingredient")
    .executeTakeFirst() || null;
}

export async function findRecipeIngredients(): Promise<RecipeIngredient[]> {
  const db = await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .selectAll("recipe_ingredient")
    .execute();
}

export async function insertRecipeIngredient(trx: Transaction<DB>, data: RecipeIngredientInsert): Promise<RecipeIngredient> {
  return await trx
    .insertInto("recipe_ingredient")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createRecipeIngredient(trx: Transaction<DB>, data: RecipeIngredientInsert): Promise<RecipeIngredient> {
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

export async function updateRecipeIngredient(trx: Transaction<DB>, id: string, data: RecipeIngredientUpdate): Promise<RecipeIngredient> {
  return await trx
    .updateTable("recipe_ingredient")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteRecipeIngredient(trx: Transaction<DB>, id: string): Promise<RecipeIngredient | null> {
  return await trx
    .deleteFrom("recipe_ingredient")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findRecipeIngredientWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("recipe_ingredient")
    .where("id", "=", id)
    .selectAll("recipe_ingredient")
    .select((eb) => recipeIngredientSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
